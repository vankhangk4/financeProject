"""
Seed fake labeled transactions for ALL users in the database.
These transactions train the TransactionClassifier (MultinomialNB).
Run inside the backend container:
    docker exec -it finance_backend python /app/scripts/seed_classifier_data.py
"""
import sys
import os
import random
from datetime import datetime, timedelta

# Add backend to path so we can import app modules
sys.path.insert(0, "/app")

from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.models import Base, User, Account, Category, Transaction, TransactionType

# =============================================================================
# Fake training data: (description, category_name)
# Total: 200 transactions across 10 categories (20 each)
# =============================================================================

TRAINING_DATA = [
    # ── 1. Ăn uống (20) ─────────────────────────────────────────────────────
    "Mua bánh mì Bà Mai buổi sáng",
    "Phở bò Phú Gia quán",
    "Cơm tấm Kiều Giang",
    "Bún bò Huế Online Food",
    "Trà sữa Tocotoco - Trần Duy Hưng",
    "Cà phê Highlands Coffee",
    "Mua đồ ăn sáng Bami Queen",
    "Bánh tráng trộn cô Ba",
    "Bún đậu mắm tôm Hàng Bún",
    "Cơm niêu Gốc đền",
    "Mì gõ đêm khuya",
    "Gà rán KFC phố Huế",
    "Burger King Trần Duy Hưng",
    "Lotteria order GrabFood",
    "Trà đá vỉa hè Nguyễn Trãi",
    "Nước ép hoa quả smoothie",
    "Bánh pía Sài Gòn",
    "Cháo lòng cô Hường",
    "Trà sữa Gong Cha",
    "Bánh gai Thanh Hóa",

    # ── 2. Mua sắm (20) ─────────────────────────────────────────────────────
    "Mua sắm tại Vinmart",
    "Order Shopee - áo thun nam",
    "Mua son MAC tại Sephora",
    "Order Lazada - kem chống nắng",
    "Mua giày Nike tại NTN Store",
    "Co.opmart - mua thực phẩm gia đình",
    "Mua túi xách Zara",
    "Order Shopee - đồ gia dụng",
    "Mua nước hoa Chanel giả",
    "H&M - mua quần áo",
    "Guardian - mua mỹ phẩm",
    "Mua sách tại Fahasa",
    "Order Tiki - bình giữ nhiệt",
    "Mua đồ trang trí nhà tại IKEA",
    "Big C - mua đồ ăn",
    "Mua kính râm tại Sunglass Hut",
    "Order Shopee - váy hoa",
    "CellphoneS - mua ốp lưng",
    "Mua hoa tươi tại Vườn hoa Thanh Xuân",
    "Mua đồ chơi cho bé tại Kids Plaza",

    # ── 3. Điện nước & Viễn thông (21) ────────────────────────────────────
    "Thanh toán tiền điện tháng 3",
    "Hóa đơn nước sinh hoạt tháng 2",
    "Internet FPT gói Home 3",
    "Truyền hình K+ tháng 3",
    "Thanh toán cước Viettel trả sau",
    "Nạp tiền điện thoại Mobifone 100k",
    "Internet VNPT gói MegaW",
    "Thanh toán tiền điện online",
    "Hóa đơn nước tháng 3/2026",
    "Cáp quang FPT 6 tháng",
    "Thanh toán cước Vinaphone",
    "Nạp 50k Viettel cho thuê bao",
    "Điện lực TP.HCM thanh toán online",
    "Thanh toán internet SCTV",
    "Tiền nước quận 3",
    "Nạp thẻ điện thoại Vietnamobile",
    "FPT Telecom gia hạn 1 năm",
    "Cước điện thoại bàn Viettel",
    "Thanh toán EVN qua app",
    "Tiền nước Bình Dương",
    "Internet GigaFiber Viettel",

    # ── 4. Đi lại (21) ─────────────────────────────────────────────────────
    "Grab đi sân bay Nội Bài",
    "Xe bus 42 tuyến Trung Hoà - Bờ Hồ",
    "GrabBike đi làm",
    "BeBike từ nhà đến công ty",
    "Gojek xe máy",
    "Xe ôm truyền thống Nguyễn Du",
    "GrabCar đi họp",
    "Taxi Mai Linh ra bến xe",
    "Thuê xe máy 85 ngày",
    "Mua xăng 50k tại Petrolimex",
    "Grab đi trung tâm thương mại",
    "Sửa xe máy tại Garage Minh Khoa",
    "Thay lốp xe Winner",
    "GrabFood giao đồ ăn",
    "BeCar đi sân bay",
    "Mua vé tàu hỏa Hà Nội - Sài Gòn",
    "Xe khách Phú Trinh Express",
    "Grab đi khám bệnh",
    "Mua vé máy bay Vietnam Airlines",
    "Grab đi ăn cưới",
    "Đổ xăng 100k tại Shell",

    # ── 5. Y tế (20) ────────────────────────────────────────────────────────
    "Khám bệnh tại BV Chợ Rẫy",
    "Mua thuốc tại nhà thuốc Pharmacity",
    "Mua thuốc bổ gan",
    "Xét nghiệm máu tại BV Đại học Y Dược",
    "Mua thuốc ho cho bé",
    "Khám răng tại Nha khoa Kim",
    "Mua vitamin C liều cao",
    "Tiêm vaccine cúm",
    "Mua thuốc nhỏ mắt",
    "Khám tai mũi họng tại BV 115",
    "Mua băng keo y tế",
    "X-quang tại phòng khám đa khoa",
    "Mua thuốc đau bụng",
    "Kiểm tra sức khỏe định kỳ",
    "Mua dầu xoa bóp salonpas",
    "Khám da liễu tại BV Da liễu TW",
    "Mua nước muối sinh lý",
    "Tái khám bệnh tại phòng khám",
    "Mua thuốc đau đầu Panadol",
    "Mua thuốc bổ sung sắt",

    # ── 6. Giải trí (20) ───────────────────────────────────────────────────
    "Mua vé xem phim CGV Linh Đàm",
    "Netflix Premium tháng 3",
    "Spotify Premium",
    "Mua sách \"Đắc nhân tâm\"",
    "Mua game trên Steam",
    "Mua vé concert Sơn Tùng M-TP",
    "YouTube Premium tháng 3",
    "Mua vé xem kịch tại Rex Theatre",
    "Disney+ Hotstar tháng 1",
    "Mua vé bể bơi Thanh Đàm",
    "Thuê sân cầu lông Gia Định",
    "Mua vé xem bóng đá V-League",
    "HBO GO tháng 3",
    "Mua vé xiếc thú TP.Zoo",
    "Amazon Prime Video tháng",
    "Thuê áo cưới chụp ảnh",
    "Mua vé xem liveshow",
    "Mua vé trượt băng Royal City",
    "Mua vé sự kiện gameshow",
    "Thuê PS5 chơi tại gaming cafe",

    # ── 7. Học tập (18) ────────────────────────────────────────────────────
    "Học phí ĐH Bách Khoa Hà Nội",
    "Khóa học Python trên Udemy",
    "Mua sách giáo khoa lớp 12",
    "Lệ phí thi TOEIC tháng 4",
    "Học phí trường mầm non",
    "Khóa học IELTS 6.5 tại IDP",
    "Mua laptop Dell XPS cho học tập",
    "Đóng học phí lớp 10 cho con",
    "Khóa học Data Science trên Coursera",
    "Mua bút và vở cho học sinh",
    "Học phí trung tâm Toán Thầy Long",
    "Lệ phí thi chứng chỉ Google",
    "Mua sách luyện thi Đại học",
    "Khóa học Graphic Design online",
    "Đóng học phí lớp 8",
    "Mua máy tính bảng iPad cho học sinh",
    "Học phí trường quốc tế BPS",
    "Khóa học Frontend React trên Codecademy",

    # ── 8. Nhà ở (20) ─────────────────────────────────────────────────────
    "Tiền thuê nhà tháng 3",
    "Phí quản lý chung cư Mandarin Garden",
    "Internet FPT tại căn hộ",
    "Tiền điện sinh hoạt tháng 2",
    "Sửa điều hòa tại nhà",
    "Tiền nước sinh hoạt tháng 2",
    "Mua nội thất bàn làm việc",
    "Sơn lại tường phòng ngủ",
    "Tiền thuê chỗ để xe",
    "Mua rèm cửa phòng khách",
    "Thay bóng đèn led toàn nhà",
    "Vệ sinh máy giặt tại nhà",
    "Tiền điện thang máy chung cư",
    "Mua ga giường mới",
    "Sửa bồn cầu rò rỉ nước",
    "Tiền thuê nhà tháng 4",
    "Mua cây cảnh trang trí phòng khách",
    "Phí bảo trì tòa nhà",
    "Mua tủ quần áo gỗ",
    "Đóng tiền điện nước nhà trọ",

    # ── 9. Khác (20) ───────────────────────────────────────────────────────
    "Nạp tiền điện thoại cho con",
    "Mua thẻ cào điện thoại",
    "Mua nến và trầm hương",
    "Đi làm tóc tại salon UpperCut",
    "Mua phân bón cho cây cảnh",
    "Đóng tiền bảo hiểm xe máy",
    "Gửi tiền về quê cho mẹ",
    "Mua thức ăn cho mèo",
    "Tip cho nhân viên massage",
    "Mua đồ cho từ thiện",
    "Mua hoa quả biếu bố mẹ",
    "Gửi tiền ATM cho người thân",
    "Nạp tiền ví điện tử MoMo",
    "Mua nước uống đóng chai",
    "Chuyển khoản hỗ trợ em gái học phí",
    "Mua vật tư sửa nhà",
    "Nạp tiền ZaloPay",
    "Mua kem chống nắng Vaseline",
    "Gửi quà sinh nhật cho bạn",
    "Nạp tiền ShopeePay",

    # ── 10. Thu nhập (20) ───────────────────────────────────────────────────
    "Nhận lương tháng 3 từ công ty",
    "Thưởng dự án tháng 2",
    "Nhận lương freelance thiết kế",
    "Tiền hoa hồng bán hàng online",
    "Nhận thanh toán từ FPT cho bài viết",
    "Thưởng Tết Nguyên Đán 2026",
    "Nhận lương tháng 2 công ty XYZ",
    "Tiền dạy kèm online",
    "Nhận thanh toán từ Fiverr",
    "Thu nhập từ khóa học Udemy",
    "Tiền lãi tiết kiệm ngân hàng",
    "Nhận lương bán thời gian",
    "Thưởng KPI quý 1",
    "Tiền bán đồ cũ trên Facebook",
    "Nhận hỗ trợ từ bố mẹ",
    "Thu nhập từ Shopee affiliate",
    "Tiền đặt cọc thuê nhà hoàn lại",
    "Nhận quỹ phát triển cộng đồng",
    "Tiền bảo hiểm được chi trả",
    "Nhận khoản vay cá nhân hoàn lại",
]

# Map training data index ranges to category names
CATEGORY_RANGES = {
    "Ăn uống": (0, 19),
    "Mua sắm": (20, 39),
    "Điện nước & Viễn thông": (40, 60),
    "Đi lại": (61, 81),
    "Y tế": (82, 101),
    "Giải trí": (102, 121),
    "Học tập": (122, 139),
    "Nhà ở": (140, 159),
    "Khác": (160, 179),
    "Thu nhập": (180, 199),
}

CATEGORY_ICONS = {
    "Ăn uống": "utensils",
    "Mua sắm": "shopping-bag",
    "Điện nước & Viễn thông": "zap",
    "Đi lại": "car",
    "Y tế": "heart-pulse",
    "Giải trí": "gamepad-2",
    "Học tập": "graduation-cap",
    "Nhà ở": "home",
    "Khác": "more-horizontal",
    "Thu nhập": "wallet",
}

CATEGORY_COLORS = {
    "Ăn uống": "#f59e0b",
    "Mua sắm": "#ec4899",
    "Điện nước & Viễn thông": "#8b5cf6",
    "Đi lại": "#3b82f6",
    "Y tế": "#ef4444",
    "Giải trí": "#a855f7",
    "Học tập": "#06b6d4",
    "Nhà ở": "#10b981",
    "Khác": "#6b7280",
    "Thu nhập": "#22c55e",
}


def get_amount_range(category_name: str) -> tuple[float, float]:
    """Return (min, max) amount in VND for a category."""
    ranges = {
        "Ăn uống": (20000, 500000),
        "Mua sắm": (50000, 5000000),
        "Điện nước & Viễn thông": (30000, 1500000),
        "Đi lại": (15000, 800000),
        "Y tế": (30000, 5000000),
        "Giải trí": (30000, 2000000),
        "Học tập": (100000, 20000000),
        "Nhà ở": (500000, 30000000),
        "Khác": (20000, 500000),
        "Thu nhập": (500000, 50000000),
    }
    return ranges.get(category_name, (50000, 1000000))


def seed_for_user(db: Session, user: User, category_map: dict):
    """Create 200 fake labeled transactions for a user (one per description)."""
    print(f"\n  Creating 200 transactions for user '{user.name}' (id={user.id})...")

    # Ensure user has at least one account
    account = db.query(Account).filter(Account.user_id == user.id).first()
    if not account:
        account = Account(
            user_id=user.id,
            name="Tài khoản chính",
            account_type="checking",
            balance=100_000_000,
            currency="VND",
            icon="wallet",
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        print(f"    → Created default account (id={account.id})")

    now = datetime.utcnow()
    created_count = 0

    for idx, description in enumerate(TRAINING_DATA):
        # Determine which category this description belongs to
        cat_name = None
        for cname, (start, end) in CATEGORY_RANGES.items():
            if start <= idx <= end:
                cat_name = cname
                break

        if cat_name is None:
            continue

        cat_id = category_map.get(cat_name)
        if cat_id is None:
            print(f"    ⚠ Category '{cat_name}' not found for user {user.id}, skipping")
            continue

        tx_type = (
            TransactionType.INCOME
            if cat_name == "Thu nhập"
            else TransactionType.EXPENSE
        )

        min_amt, max_amt = get_amount_range(cat_name)
        amount = round(random.uniform(min_amt, max_amt), -3)  # round to nearest 1000

        # Spread dates over last 6 months, newest first
        days_ago = (199 - idx) * 0.8 + random.uniform(0, 1)
        tx_date = now - timedelta(days=days_ago)

        transaction = Transaction(
            user_id=user.id,
            account_id=account.id,
            category_id=cat_id,
            amount=amount,
            transaction_type=tx_type,
            description=description,
            date=tx_date,
            is_ai_categorized=False,  # Mark as manually labeled for training
        )
        db.add(transaction)
        created_count += 1

    db.commit()
    print(f"  ✓ Created {created_count} transactions for user '{user.name}'")
    return created_count


def train_classifier_for_user(db: Session, user: User):
    """Train TransactionClassifier for a specific user."""
    print(f"\n  Training classifier for user '{user.name}' (id={user.id})...")

    from app.ai.transaction_classifier import TransactionClassifier

    # Get manually labeled transactions (is_ai_categorized=False)
    labeled = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user.id,
            Transaction.category_id.isnot(None),
            Transaction.is_ai_categorized == False,
        )
        .all()
    )

    if len(labeled) < 10:
        print(f"  ⚠ Only {len(labeled)} labeled transactions, need ≥10. Skipping training.")
        return None

    texts = [t.description or "" for t in labeled]
    labels = [t.category_id for t in labeled]

    classifier = TransactionClassifier(user.id)
    result = classifier.train(texts, labels)

    print(f"  ✓ Classifier trained: accuracy={result.get('accuracy', 0):.2%}, "
          f"f1={result.get('f1', 0):.2%}")
    return result


def main():
    print("=" * 60)
    print("Transaction Classifier — Fake Data Seeder")
    print("=" * 60)

    db = SessionLocal()
    try:
        # 1. Check/create tables
        print("\n[1/5] Verifying database tables...")
        Base.metadata.create_all(bind=engine)
        print("  ✓ Tables OK")

        # 2. Get all users
        print("\n[2/5] Fetching all users...")
        users = db.query(User).all()
        if not users:
            print("  ⚠ No users found in database. Please create at least one user first.")
            return
        print(f"  Found {len(users)} user(s): {', '.join(u.name for u in users)}")

        # 3. Create categories for each user
        print("\n[3/5] Creating/verifying categories for all users...")
        category_map = {}  # category_name -> category_id (for current user)

        for user in users:
            print(f"\n  Processing user '{user.name}'...")

            for cat_name in CATEGORY_RANGES.keys():
                existing = (
                    db.query(Category)
                    .filter(Category.user_id == user.id, Category.name == cat_name)
                    .first()
                )
                if existing:
                    category_map[cat_name] = existing.id
                    print(f"    → Category '{cat_name}' exists (id={existing.id})")
                else:
                    new_cat = Category(
                        user_id=user.id,
                        name=cat_name,
                        icon=CATEGORY_ICONS.get(cat_name, "tag"),
                        color=CATEGORY_COLORS.get(cat_name, "#6366f1"),
                        is_system=False,
                    )
                    db.add(new_cat)
                    db.commit()
                    db.refresh(new_cat)
                    category_map[cat_name] = new_cat.id
                    print(f"    + Created category '{cat_name}' (id={new_cat.id})")

            # 4. Seed transactions
            seed_for_user(db, user, category_map)

            # 5. Train classifier
            train_classifier_for_user(db, user)

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        for user in users:
            tx_count = db.query(Transaction).filter(Transaction.user_id == user.id).count()
            print(f"  User '{user.name}': {tx_count} transactions")

        model_path = os.path.join("/app/ai/models", "classifier_1.pkl")
        if os.path.exists(model_path):
            print(f"\n  ✓ Classifier model saved: {model_path}")

        print("\n✅ Seed complete! All users can now use /ai/categorize endpoint.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
