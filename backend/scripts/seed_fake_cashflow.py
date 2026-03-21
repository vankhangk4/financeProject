"""
Seed fake cashflow transaction data for CashFlowPredictor demo.

Creates 6+ months of realistic income/expense transactions for a user,
then trains the CashFlowPredictor model.

Usage:
    cd backend && python scripts/seed_fake_cashflow.py [--months 6] [--user-id 1]
    docker exec -it finance_backend python /app/scripts/seed_fake_cashflow.py --months 6 --user-id 1
"""
import sys
import os
import random
import argparse
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

# Add backend to path so we can import app modules
# Handle both local execution and Docker container execution
if os.path.exists("/app/app"):
    sys.path.insert(0, "/app")
else:
    # Local execution: /app doesn't exist, use backend directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import SessionLocal, engine
from app.models.models import Base, User, Account, Category, Transaction, TransactionType
from app.ai.cash_flow_predictor import CashFlowPredictor

# =============================================================================
# Fake income sources per month
# =============================================================================
INCOME_SOURCES = [
    {"name": "Lương tháng", "desc": "Nhận lương tháng {month}/{year} từ công ty", "min": 15_000_000, "max": 30_000_000, "day": 5},
    {"name": "Thu nhập phụ", "desc": "Nhận thanh toán freelance thiết kế", "min": 1_000_000, "max": 5_000_000, "day": 15},
    {"name": "Thưởng", "desc": "Thưởng dự án tháng {month}", "min": 500_000, "max": 3_000_000, "day": 20},
    {"name": "Hoa hồng", "desc": "Tiền hoa hồng bán hàng online", "min": 200_000, "max": 2_000_000, "day": 25},
    {"name": "Lãi tiết kiệm", "desc": "Tiền lãi tiết kiệm ngân hàng", "min": 50_000, "max": 500_000, "day": 28},
]

# =============================================================================
# Fake expense categories with realistic amounts
# =============================================================================
EXPENSE_CATEGORIES = [
    {"name": "Thuê nhà", "min": 8_000_000, "max": 15_000_000, "day_range": (1, 3), "weight": 1},
    {"name": "Điện nước", "min": 300_000, "max": 1_000_000, "day_range": (5, 10), "weight": 1},
    {"name": "Internet", "min": 250_000, "max": 400_000, "day_range": (3, 5), "weight": 1},
    {"name": "Điện thoại", "min": 100_000, "max": 300_000, "day_range": (8, 12), "weight": 1},
    {"name": "Ăn sáng", "min": 30_000, "max": 80_000, "day_range": None, "weight": 25},  # multiple per week
    {"name": "Ăn trưa", "min": 40_000, "max": 120_000, "day_range": None, "weight": 25},
    {"name": "Ăn tối", "min": 50_000, "max": 150_000, "day_range": None, "weight": 25},
    {"name": "Mua sắm", "min": 100_000, "max": 2_000_000, "day_range": None, "weight": 5},
    {"name": "Đi lại", "min": 20_000, "max": 300_000, "day_range": None, "weight": 15},
    {"name": "Giải trí", "min": 50_000, "max": 1_000_000, "day_range": None, "weight": 3},
    {"name": "Y tế", "min": 50_000, "max": 2_000_000, "day_range": None, "weight": 1},
    {"name": "Học tập", "min": 100_000, "max": 5_000_000, "day_range": None, "weight": 1},
    {"name": "Bảo hiểm", "min": 200_000, "max": 3_000_000, "day_range": (10, 15), "weight": 1},
    {"name": "Làm tóc", "min": 100_000, "max": 800_000, "day_range": None, "weight": 1},
    {"name": "Khác", "min": 30_000, "max": 500_000, "day_range": None, "weight": 3},
]

# Category name -> icon/color for auto-creation
EXPENSE_ICONS = {
    "Thuê nhà": "home",
    "Điện nước": "droplets",
    "Internet": "wifi",
    "Điện thoại": "smartphone",
    "Ăn sáng": "coffee",
    "Ăn trưa": "utensils",
    "Ăn tối": "utensils",
    "Mua sắm": "shopping-bag",
    "Đi lại": "car",
    "Giải trí": "gamepad-2",
    "Y tế": "heart-pulse",
    "Học tập": "graduation-cap",
    "Bảo hiểm": "shield",
    "Làm tóc": "scissors",
    "Khác": "more-horizontal",
}

EXPENSE_COLORS = {
    "Thuê nhà": "#10b981",
    "Điện nước": "#3b82f6",
    "Internet": "#8b5cf6",
    "Điện thoại": "#06b6d4",
    "Ăn sáng": "#f59e0b",
    "Ăn trưa": "#f97316",
    "Ăn tối": "#ef4444",
    "Mua sắm": "#ec4899",
    "Đi lại": "#3b82f6",
    "Giải trí": "#a855f7",
    "Y tế": "#ef4444",
    "Học tập": "#06b6d4",
    "Bảo hiểm": "#6366f1",
    "Làm tóc": "#84cc16",
    "Khác": "#6b7280",
}

INCOME_ICON = "wallet"
INCOME_COLOR = "#22c55e"
EXPENSE_ICON = "trending-down"


def ensure_user_exists(db: Session, user_id: int) -> User:
    """Ensure user exists, raise if not found."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User with id={user_id} not found in database.")
    return user


def ensure_account(db: Session, user_id: int) -> Account:
    """Ensure user has at least one account."""
    account = db.query(Account).filter(Account.user_id == user_id).first()
    if not account:
        account = Account(
            user_id=user_id,
            name="Tài khoản chính",
            account_type="checking",
            balance=50_000_000,
            currency="VND",
            icon="wallet",
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        print(f"    + Created default account (id={account.id})")
    return account


def ensure_category(db: Session, user_id: int, name: str, icon: str,
                     color: str, is_income: bool = False) -> int:
    """Ensure category exists for user, create if needed. Returns category_id."""
    existing = db.query(Category).filter(
        Category.user_id == user_id, Category.name == name
    ).first()
    if existing:
        return existing.id

    cat = Category(
        user_id=user_id,
        name=name,
        icon=icon,
        color=color,
        is_system=False,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat.id


def get_or_create_categories(db: Session, user_id: int) -> dict:
    """Create expense categories for user. Returns dict: category_name -> id."""
    cat_map = {}
    for exp in EXPENSE_CATEGORIES:
        cat_id = ensure_category(
            db, user_id, exp["name"],
            EXPENSE_ICONS.get(exp["name"], "tag"),
            EXPENSE_COLORS.get(exp["name"], "#6366f1"),
        )
        cat_map[exp["name"]] = cat_id

    # Income category
    income_cat_id = ensure_category(
        db, user_id, "Thu nhập", INCOME_ICON, INCOME_COLOR
    )
    cat_map["Thu nhập"] = income_cat_id
    return cat_map


def generate_transactions(db: Session, user_id: int, account_id: int,
                           cat_map: dict, num_months: int = 6) -> list:
    """Generate fake transactions for num_months months. Returns list of Transaction objects."""
    now = datetime.utcnow()
    start_month = (now.replace(day=1) - relativedelta(months=num_months - 1)).replace(day=1)

    transactions = []

    for m in range(num_months):
        month_start = start_month + relativedelta(months=m)
        year = month_start.year
        month = month_start.month

        # ── Income transactions ───────────────────────────────────────────
        for income_src in INCOME_SOURCES:
            # Randomize: maybe skip some income sources occasionally
            if random.random() < 0.1:
                continue

            desc = income_src["desc"].format(month=month, year=year)
            amount = round(random.uniform(income_src["min"], income_src["max"]), -3)
            day = income_src["day"] + random.randint(-2, 2)
            day = max(1, min(day, 28))
            tx_date = month_start.replace(day=day)

            transactions.append(Transaction(
                user_id=user_id,
                account_id=account_id,
                category_id=cat_map["Thu nhập"],
                amount=amount,
                transaction_type=TransactionType.INCOME,
                description=desc,
                date=tx_date,
                is_ai_categorized=False,
            ))

        # ── Expense transactions ─────────────────────────────────────────
        for exp in EXPENSE_CATEGORIES:
            if exp["day_range"]:
                # Fixed-day expense (rent, utilities)
                day_min, day_max = exp["day_range"]
                day = random.randint(day_min, day_max)
                tx_date = month_start.replace(day=day)
                amount = round(random.uniform(exp["min"], exp["max"]), -3)
                transactions.append(Transaction(
                    user_id=user_id,
                    account_id=account_id,
                    category_id=cat_map[exp["name"]],
                    amount=amount,
                    transaction_type=TransactionType.EXPENSE,
                    description=exp["name"],
                    date=tx_date,
                    is_ai_categorized=False,
                ))
            else:
                # Recurring / random expense (food, transport...)
                # Generate multiple transactions per month based on weight
                num_tx = random.choices(
                    [0, 1, 2, 3, 4, 5],
                    weights=[1, 3, 3, 2, 1, 1]
                )[0]
                for _ in range(num_tx):
                    day = random.randint(1, 28)
                    tx_date = month_start.replace(day=day)
                    amount = round(random.uniform(exp["min"], exp["max"]), -3)
                    desc = exp["name"]
                    transactions.append(Transaction(
                        user_id=user_id,
                        account_id=account_id,
                        category_id=cat_map[exp["name"]],
                        amount=amount,
                        transaction_type=TransactionType.EXPENSE,
                        description=desc,
                        date=tx_date,
                        is_ai_categorized=False,
                    ))

    return transactions


def train_and_predict(db: Session, user_id: int, num_months: int) -> dict:
    """Train model and return metrics + predictions."""
    print(f"\n  Training CashFlowPredictor for user_id={user_id}...")

    # Get all transactions for this user
    txs = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    tx_data = [
        {
            "date": t.date,
            "amount": t.amount,
            "type": t.transaction_type.value,
        }
        for t in txs
    ]

    if len(tx_data) < 30:
        raise ValueError(
            f"Only {len(tx_data)} transactions found. Need at least 30. "
            "Run seed_fake_cashflow.py first."
        )

    predictor = CashFlowPredictor(user_id)
    train_result = predictor.train(tx_data)

    if "error" in train_result:
        raise ValueError(f"Training failed: {train_result['error']}")

    print(f"  ✓ Model trained:")
    print(f"      income MAE: {train_result['income_mae']:,.0f} VND")
    print(f"      expense MAE: {train_result['expense_mae']:,.0f} VND")
    print(f"      income R²: {train_result['income_r2']:.4f}")
    print(f"      expense R²: {train_result['expense_r2']:.4f}")

    # Predict next 3 months
    predictions = predictor.predict(tx_data, months=3)
    print(f"\n  Predictions (next 3 months):")
    for p in predictions:
        net = p["predicted_income"] - p["predicted_expense"]
        print(f"    {p['month']}: income={p['predicted_income']:,.0f}  "
              f"expense={p['predicted_expense']:,.0f}  net={net:,.0f}  "
              f"confidence={p['confidence']:.0%}")

    return {
        "train_metrics": train_result,
        "predictions": predictions,
    }


def main():
    parser = argparse.ArgumentParser(description="Seed fake cashflow data")
    parser.add_argument("--user-id", type=int, default=1, help="User ID to seed data for")
    parser.add_argument("--months", type=int, default=6, help="Number of months of data to generate")
    args = parser.parse_args()

    user_id = args.user_id
    num_months = args.months

    print("=" * 60)
    print("CashFlowPredictor — Fake Data Seeder")
    print("=" * 60)
    print(f"  Target user_id: {user_id}")
    print(f"  Months of data: {num_months}")

    db = SessionLocal()
    try:
        # 1. Verify/create tables
        print("\n[1/4] Verifying database tables...")
        Base.metadata.create_all(bind=engine)
        print("  ✓ Tables OK")

        # 2. Ensure user exists
        print(f"\n[2/4] Checking user {user_id}...")
        user = ensure_user_exists(db, user_id)
        print(f"  ✓ User: '{user.name}' <{user.email}>")

        # 3. Ensure account and categories
        print("\n[3/4] Ensuring account and categories...")
        account = ensure_account(db, user_id)
        print(f"    Account: '{account.name}' (id={account.id}, balance={account.balance:,.0f})")

        cat_map = get_or_create_categories(db, user_id)
        print(f"    Categories: {len(cat_map)} (income + {len(EXPENSE_CATEGORIES)} expense)")

        # 4. Generate and insert transactions
        print(f"\n[4/4] Generating ~{num_months * 20}-{num_months * 35} transactions for {num_months} months...")
        transactions = generate_transactions(db, user_id, account.id, cat_map, num_months)
        db.add_all(transactions)
        db.commit()

        # Update account balance to reflect all inserted transactions
        # (API does this automatically, but seed scripts bypass the API)
        income_sum = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.INCOME,
        ).scalar()
        expense_sum = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
        ).scalar()
        db.refresh(account)
        account.balance = income_sum - expense_sum
        db.commit()

        print(f"  ✓ Inserted {len(transactions)} transactions")
        print(f"    Account balance updated: {account.balance:,.0f} VND "
              f"(income={income_sum:,.0f} - expense={expense_sum:,.0f})")

        # Verify counts
        total = db.query(Transaction).filter(Transaction.user_id == user_id).count()
        income_count = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.INCOME,
        ).count()
        expense_count = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
        ).count()
        print(f"    Total transactions in DB for user: {total}")
        print(f"    Income: {income_count}, Expense: {expense_count}")

        # 5. Train model and predict
        print("\n" + "-" * 60)
        result = train_and_predict(db, user_id, num_months)

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"  User: '{user.name}'")
        print(f"  Transactions: {total} total ({income_count} income, {expense_count} expense)")
        print(f"  Model: income_R2={result['train_metrics']['income_r2']:.4f}, "
              f"expense_R2={result['train_metrics']['expense_r2']:.4f}")
        print(f"  Predictions: {len(result['predictions'])} months")

        model_files = [
            os.path.join("/app/ai/models", f"income_pred_{user_id}.pkl"),
            os.path.join("/app/ai/models", f"expense_pred_{user_id}.pkl"),
            os.path.join("/app/ai/models", f"scaler_{user_id}.pkl"),
        ]
        for mf in model_files:
            if os.path.exists(mf):
                size_kb = os.path.getsize(mf) / 1024
                print(f"  ✓ {os.path.basename(mf)}: {size_kb:.1f} KB")

        print("\n✅ Seed complete! Test with:")
        print(f"   GET /api/v1/ai/predict-cashflow?months=3")
        print(f"   (requires auth token for user_id={user_id})")

    finally:
        db.close()


if __name__ == "__main__":
    main()
