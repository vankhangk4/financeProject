from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.models import User, Account, Transaction, TransactionType
from app.schemas.schemas import AccountCreate, AccountUpdate, AccountResponse, TransferCreate, TransferResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    data: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check for duplicate account name
    existing = db.query(Account).filter(
        Account.user_id == current_user.id,
        Account.name == data.name
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên tài khoản đã tồn tại"
        )

    account = Account(
        user_id=current_user.id,
        name=data.name,
        account_type=data.account_type,
        balance=0.0,
        currency=data.currency,
        icon=data.icon,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/", response_model=List[AccountResponse])
def list_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    return accounts


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    data: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    db.delete(account)
    db.commit()


@router.post("/transfer", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
def transfer_between_accounts(
    data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify both accounts belong to user
    from_acc = db.query(Account).filter(
        Account.id == data.from_account_id, Account.user_id == current_user.id
    ).first()
    if not from_acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tài khoản nguồn không tìm thấy")

    to_acc = db.query(Account).filter(
        Account.id == data.to_account_id, Account.user_id == current_user.id
    ).first()
    if not to_acc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tài khoản đích không tìm thấy")

    if data.from_account_id == data.to_account_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tài khoản nguồn và đích không được trùng nhau")

    if from_acc.balance < data.amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Số dư không đủ")

    # Create TRANSFER transactions (not counted as income/expense)
    tx_from = Transaction(
        user_id=current_user.id,
        account_id=from_acc.id,
        amount=data.amount,
        transaction_type=TransactionType.TRANSFER,
        description=f"Chuyển sang {to_acc.name}" + (f" - {data.description}" if data.description else ""),
        date=data.date,
    )

    tx_to = Transaction(
        user_id=current_user.id,
        account_id=to_acc.id,
        amount=data.amount,
        transaction_type=TransactionType.TRANSFER,
        description=f"Nhận từ {from_acc.name}" + (f" - {data.description}" if data.description else ""),
        date=data.date,
    )

    # Update balances
    from_acc.balance -= data.amount
    to_acc.balance += data.amount

    db.add(tx_from)
    db.add(tx_to)
    db.commit()
    db.refresh(tx_from)
    db.refresh(tx_to)

    return TransferResponse(from_transaction=tx_from, to_transaction=tx_to)
