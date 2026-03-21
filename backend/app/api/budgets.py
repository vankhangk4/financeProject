from fastapi import APIRouter, Depends, Form, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime, timedelta
from calendar import monthrange
from app.core.database import get_db
from app.models.models import User, Budget, Category, Transaction, BudgetPeriod, TransactionType
from app.schemas.schemas import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetProgress
from app.api.deps import get_current_user
from app.core.security import verify_password

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def get_period_range(period: BudgetPeriod, reference_date: datetime = None):
    if reference_date is None:
        reference_date = datetime.utcnow()
    if period == BudgetPeriod.WEEKLY.value:
        start = reference_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)
    elif period == BudgetPeriod.MONTHLY.value:
        start = reference_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        _, last_day = monthrange(reference_date.year, reference_date.month)
        end = reference_date.replace(day=last_day, hour=23, minute=59, second=59)
    else:
        start = reference_date.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = reference_date.replace(month=12, day=31, hour=23, minute=59, second=59)
    return start, end


@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify category ownership
    category = (
        db.query(Category)
        .filter(Category.id == data.category_id, Category.user_id == current_user.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    budget = Budget(
        user_id=current_user.id,
        category_id=data.category_id,
        amount=data.amount,
        period=data.period,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)

    # Gửi email thông báo trong background
    import threading
    category_name = category.name
    amount = data.amount
    period_value = data.period.value
    user_email = current_user.email
    user_name = current_user.name

    def send_email_bg():
        from app.services.email import send_activity_email
        period_labels = {"weekly": "Hàng tuần", "monthly": "Hàng tháng", "yearly": "Hàng năm"}
        send_activity_email(
            to_email=user_email,
            user_name=user_name,
            subject="Thông báo: Đã tạo ngân sách mới",
            action="TẠO NGÂN SÁCH MỚI",
            details=[
                ("Danh mục", category_name),
                ("Số tiền giới hạn", f"{amount:,.0f} VND".replace(",", ".")),
                ("Kỳ", period_labels.get(period_value, period_value)),
            ],
        )

    thread = threading.Thread(target=send_email_bg)
    thread.start()
    return budget


@router.get("/", response_model=List[BudgetProgress])
def list_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets = (
        db.query(Budget)
        .options(joinedload(Budget.category))
        .filter(Budget.user_id == current_user.id)
        .all()
    )

    now = datetime.utcnow()
    results = []
    for budget in budgets:
        start, end = get_period_range(budget.period, now)
        spent = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.category_id == budget.category_id,
                Transaction.transaction_type == TransactionType.EXPENSE.value,
                Transaction.date >= start,
                Transaction.date <= end,
            )
            .with_entities(Transaction.amount)
            .all()
        )
        total_spent = sum(s[0] for s in spent)
        remaining = max(0, budget.amount - total_spent)
        percentage = (total_spent / budget.amount * 100) if budget.amount > 0 else 0

        results.append(
            BudgetProgress(
                budget=BudgetResponse.model_validate(budget),
                spent=round(total_spent, 2),
                remaining=round(remaining, 2),
                percentage=round(percentage, 1),
            )
        )
    return results


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(budget, field, value)
    db.commit()
    db.refresh(budget)

    # Gửi email thông báo trong background
    import threading
    new_amount = data.amount
    new_period = data.period.value if data.period else None
    user_email = current_user.email
    user_name = current_user.name

    def send_email_bg():
        from app.services.email import send_activity_email
        period_labels = {"weekly": "Hàng tuần", "monthly": "Hàng tháng", "yearly": "Hàng năm"}
        details = []
        if new_amount is not None:
            details.append(("Số tiền giới hạn mới", f"{new_amount:,.0f} VND".replace(",", ".")))
        if new_period is not None:
            details.append(("Kỳ mới", period_labels.get(new_period, new_period)))
        send_activity_email(
            to_email=user_email,
            user_name=user_name,
            subject="Thông báo: Đã cập nhật ngân sách",
            action="CẬP NHẬT NGÂN SÁCH",
            details=details,
        )

    thread = threading.Thread(target=send_email_bg)
    thread.start()
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    password: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.user_id == current_user.id)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
    if not verify_password(password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

    # Lưu thông tin trước khi xóa
    category_name = budget.category.name if budget.category else "Unknown"
    budget_amount = budget.amount
    category_id = budget.category_id

    # Xóa tất cả giao dịch thuộc danh mục này
    deleted_tx_count = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.category_id == category_id,
    ).delete()
    db.flush()

    # Capture values before commit/session closes
    user_email = current_user.email
    user_name = current_user.name

    db.delete(budget)
    db.commit()

    # Gửi email thông báo trong background
    import threading

    def send_email_bg():
        from app.services.email import send_activity_email
        send_activity_email(
            to_email=user_email,
            user_name=user_name,
            subject="Thông báo: Đã xóa ngân sách",
            action="XÓA NGÂN SÁCH",
            details=[
                ("Danh mục", category_name),
                ("Số tiền giới hạn (đã xóa)", f"{budget_amount:,.0f} VND".replace(",", ".")),
                ("Số giao dịch bị xóa", str(deleted_tx_count)),
            ],
        )

    thread = threading.Thread(target=send_email_bg)
    thread.start()
