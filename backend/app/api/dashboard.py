from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from typing import List
from datetime import datetime, timedelta
from calendar import monthrange
from app.core.database import get_db
from app.models.models import User, Account, Transaction, Budget, Category, TransactionType, BudgetPeriod
from app.schemas.schemas import DashboardStats, TransactionResponse, BudgetProgress, CategorySummary, BudgetResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Total balance
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    total_balance = sum(a.balance for a in accounts)

    # Current month
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    _, last_day = monthrange(now.year, now.month)
    month_end = now.replace(day=last_day, hour=23, minute=59, second=59)

    monthly_income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == TransactionType.INCOME.value,
            Transaction.date >= month_start,
            Transaction.date <= month_end,
        )
        .scalar()
    )

    monthly_expense = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.date >= month_start,
            Transaction.date <= month_end,
        )
        .scalar()
    )

    savings_rate = 0.0
    if monthly_income > 0:
        savings_rate = round(((monthly_income - monthly_expense) / monthly_income) * 100, 1)

    # Top categories
    top_cats = (
        db.query(
            Category.name,
            Category.color,
            func.sum(Transaction.amount).label("total"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.date >= month_start,
            Transaction.date <= month_end,
        )
        .group_by(Category.id, Category.name, Category.color)
        .order_by(desc("total"))
        .limit(5)
        .all()
    )
    top_categories = [{"name": c[0], "color": c[1], "amount": float(c[2])} for c in top_cats]

    # Recent transactions
    recent = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.user_id == current_user.id)
        .order_by(desc(Transaction.date))
        .limit(5)
        .all()
    )

    # Budget alerts
    budgets = db.query(Budget).options(joinedload(Budget.category)).filter(Budget.user_id == current_user.id).all()
    budget_alerts = []
    for budget in budgets:
        start = month_start
        end = month_end
        spent = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.category_id == budget.category_id,
                Transaction.transaction_type == TransactionType.EXPENSE.value,
                Transaction.date >= start,
                Transaction.date <= end,
            )
            .scalar()
        )
        percentage = (spent / budget.amount * 100) if budget.amount > 0 else 0
        if percentage >= 80:
            budget_alerts.append(
                BudgetProgress(
                    budget=BudgetResponse.model_validate(budget),
                    spent=round(float(spent), 2),
                    remaining=round(max(0, budget.amount - float(spent)), 2),
                    percentage=round(percentage, 1),
                )
            )

    return DashboardStats(
        total_balance=round(total_balance, 2),
        monthly_income=round(float(monthly_income), 2),
        monthly_expense=round(float(monthly_expense), 2),
        savings_rate=savings_rate,
        top_categories=top_categories,
        recent_transactions=[TransactionResponse.model_validate(t) for t in recent],
        budget_alerts=budget_alerts[:5],
    )
