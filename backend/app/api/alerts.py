from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime
from calendar import monthrange
from app.core.database import get_db
from app.models.models import User, Budget, Transaction, BudgetPeriod, TransactionType
from app.services.email import send_budget_alert_email
from app.api.deps import get_current_user

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def get_period_range(period: BudgetPeriod, reference_date: datetime = None):
    from datetime import timedelta
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


@router.post("/check-budgets")
def check_budget_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    send_email_alert: bool = True,
):
    """
    Kiểm tra ngân sách và gửi email cảnh báo nếu vượt ngưỡng.
    Có thể gọi định kỳ bằng cron job hoặc khi user thêm giao dịch.
    """
    now = datetime.utcnow()
    budgets = (
        db.query(Budget)
        .options(joinedload(Budget.category))
        .filter(Budget.user_id == current_user.id)
        .all()
    )

    alerts = []
    for budget in budgets:
        start, end = get_period_range(budget.period, now)

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

        percentage = (float(spent) / budget.amount * 100) if budget.amount > 0 else 0

        # Gửi email khi đạt 80%, 90%, 100%
        if percentage >= 80 and send_email_alert:
            send_budget_alert_email(
                user_email=current_user.email,
                user_name=current_user.name,
                category_name=budget.category.name,
                budget_amount=budget.amount,
                spent_amount=float(spent),
                percentage=percentage,
            )

        if percentage >= 80:
            alerts.append({
                "category_name": budget.category.name,
                "budget_amount": budget.amount,
                "spent_amount": float(spent),
                "percentage": round(percentage, 1),
                "severity": "high" if percentage >= 100 else "medium",
            })

    return {
        "checked": len(budgets),
        "alerts": alerts,
        "message": f"Đã kiểm tra {len(budgets)} ngân sách, {len(alerts)} cảnh báo."
    }
