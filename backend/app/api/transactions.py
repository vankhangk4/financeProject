from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, date
from calendar import monthrange
from app.core.database import get_db
from app.models.models import User, Transaction, Account, Category, TransactionType, Budget, BudgetPeriod
from app.schemas.schemas import TransactionCreate, TransactionUpdate, TransactionResponse
from app.api.deps import get_current_user
from app.services.email import send_budget_alert_email

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def check_and_send_budget_alert(db: Session, user: User, category_id: int, transaction_amount: float):
    """Kiểm tra ngân sách và gửi email cảnh báo nếu vượt ngưỡng."""
    from datetime import timedelta

    budgets = db.query(Budget).filter(
        Budget.user_id == user.id,
        Budget.category_id == category_id
    ).all()

    for budget in budgets:
        # Tính period range
        now = datetime.utcnow()
        if budget.period == BudgetPeriod.WEEKLY.value:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = start + timedelta(days=7)
        elif budget.period == BudgetPeriod.MONTHLY.value:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            _, last_day = monthrange(now.year, now.month)
            end = now.replace(day=last_day, hour=23, minute=59, second=59)
        else:
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now.replace(month=12, day=31, hour=23, minute=59, second=59)

        # Tính tổng chi tiêu trong kỳ (bao gồm giao dịch vừa thêm)
        spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == user.id,
            Transaction.category_id == category_id,
            Transaction.transaction_type == TransactionType.EXPENSE.value,
            Transaction.date >= start,
            Transaction.date <= end,
        ).scalar()

        percentage = (float(spent) / budget.amount * 100) if budget.amount > 0 else 0

        # Gửi email khi vượt 80%, 90%, hoặc 100%
        threshold = 80
        if percentage >= 100:
            threshold = 100
        elif percentage >= 90:
            threshold = 90

        if percentage >= threshold:
            send_budget_alert_email(
                user_email=user.email,
                user_name=user.name,
                category_name=budget.category.name if budget.category else "Unknown",
                budget_amount=budget.amount,
                spent_amount=float(spent),
                percentage=percentage,
            )


@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify account ownership
    account = (
        db.query(Account)
        .filter(Account.id == data.account_id, Account.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    transaction = Transaction(
        user_id=current_user.id,
        account_id=data.account_id,
        category_id=data.category_id,
        amount=data.amount,
        transaction_type=data.transaction_type,
        description=data.description,
        date=data.date,
    )

    # Update account balance
    if data.transaction_type == TransactionType.INCOME:
        account.balance += data.amount
    else:
        account.balance -= data.amount

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    # Capture values before session closes
    user_email = current_user.email
    user_name = current_user.name
    tx_type_val = data.transaction_type.value
    tx_amount = data.amount
    tx_desc = data.description
    tx_date = data.date.strftime("%d/%m/%Y %H:%M")
    tx_cat_id = data.category_id
    is_expense = data.transaction_type == TransactionType.EXPENSE

    # Gửi email cảnh báo trong background thread (không block request)
    if is_expense and tx_cat_id:
        import threading
        def send_alert_background():
            from app.core.database import SessionLocal
            from app.models.models import User
            db_bg = SessionLocal()
            try:
                user_bg = db_bg.query(User).filter(User.id == current_user.id).first()
                if user_bg:
                    check_and_send_budget_alert(db_bg, user_bg, tx_cat_id, tx_amount)
            finally:
                db_bg.close()
        thread = threading.Thread(target=send_alert_background)
        thread.start()

    # Gửi email thông báo trong background
    import threading

    def send_email_bg():
        from app.services.email import send_activity_email
        send_activity_email(
            to_email=user_email,
            user_name=user_name,
            subject="Thông báo: Đã thêm giao dịch mới",
            action="TẠO GIAO DỊCH MỚI",
            details=[
                ("Loại", "Thu nhập" if tx_type_val == "income" else "Chi tiêu"),
                ("Số tiền", f"{tx_amount:,.0f} VND".replace(",", ".")),
                ("Mô tả", tx_desc or "Không có"),
                ("Ngày", tx_date),
            ],
        )

    thread = threading.Thread(target=send_email_bg)
    thread.start()

    return transaction


@router.get("/", response_model=List[TransactionResponse])
def list_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    account_id: Optional[int] = None,
    category_id: Optional[int] = None,
    transaction_type: Optional[TransactionType] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    query = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.user_id == current_user.id)
    )
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if start_date:
        query = query.filter(Transaction.date >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(Transaction.date <= datetime.combine(end_date, datetime.max.time()))

    transactions = query.order_by(desc(Transaction.date)).offset(skip).limit(limit).all()
    return transactions


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(transaction, field, value)
    db.commit()
    db.refresh(transaction)

    # Capture values before session closes
    user_email = current_user.email
    user_name = current_user.name
    tx_desc = transaction.description or "Không có"
    tx_amount = transaction.amount
    tx_date = transaction.date.strftime("%d/%m/%Y %H:%M")

    # Gửi email thông báo trong background
    import threading

    def send_email_bg():
        from app.services.email import send_activity_email
        send_activity_email(
            to_email=user_email,
            user_name=user_name,
            subject="Thông báo: Đã cập nhật giao dịch",
            action="CẬP NHẬT GIAO DỊCH",
            details=[
                ("Mô tả", tx_desc),
                ("Số tiền", f"{tx_amount:,.0f} VND".replace(",", ".")),
                ("Ngày", tx_date),
            ],
        )

    thread = threading.Thread(target=send_email_bg)
    thread.start()
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    # Capture values before session closes
    user_email = current_user.email
    user_name = current_user.name
    tx_amount = transaction.amount
    tx_desc = transaction.description or "Không có mô tả"

    db.delete(transaction)
    db.commit()

    # Gửi email thông báo trong background
    import threading

    def send_email_bg():
        from app.services.email import send_activity_email
        send_activity_email(
            to_email=user_email,
            user_name=user_name,
            subject="Thông báo: Đã xóa giao dịch",
            action="XÓA GIAO DỊCH",
            details=[
                ("Số tiền (đã xóa)", f"{tx_amount:,.0f} VND".replace(",", ".")),
                ("Mô tả", tx_desc),
            ],
        )

    thread = threading.Thread(target=send_email_bg)
    thread.start()
