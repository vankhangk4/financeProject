from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, timedelta
from calendar import monthrange
from app.core.database import get_db
from app.models.models import User, Transaction, Category, TransactionType
from app.schemas.schemas import MonthlyReport, CategorySummary
from app.api.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/monthly", response_model=List[MonthlyReport])
def get_monthly_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    months: int = Query(6, ge=1, le=24),
):
    now = datetime.utcnow()
    reports = []
    for i in range(months):
        target = now - timedelta(days=30 * i)
        start = target.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        _, last_day = monthrange(target.year, target.month)
        end = target.replace(day=last_day, hour=23, minute=59, second=59)

        income = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.transaction_type == TransactionType.INCOME.value,
                Transaction.date >= start,
                Transaction.date <= end,
            )
            .scalar()
        )

        expense = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.transaction_type == TransactionType.EXPENSE.value,
                Transaction.date >= start,
                Transaction.date <= end,
            )
            .scalar()
        )

        total = float(income) + float(expense)
        categories_data = (
            db.query(
                Category.id,
                Category.name,
                Category.color,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count"),
            )
            .join(Transaction, Transaction.category_id == Category.id)
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.transaction_type == TransactionType.EXPENSE.value,
                Transaction.date >= start,
                Transaction.date <= end,
            )
            .group_by(Category.id, Category.name, Category.color)
            .order_by(desc("total"))
            .all()
        )

        categories = [
            CategorySummary(
                category_id=c[0],
                category_name=c[1],
                category_color=c[2],
                total_amount=float(c[3]),
                transaction_count=c[4],
                percentage=round(float(c[3]) / float(expense) * 100, 1) if float(expense) > 0 else 0,
            )
            for c in categories_data
        ]

        reports.append(
            MonthlyReport(
                month=start.strftime("%Y-%m"),
                income=round(float(income), 2),
                expense=round(float(expense), 2),
                net=round(float(income) - float(expense), 2),
                categories=categories,
            )
        )

    return reports
