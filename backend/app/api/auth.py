from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.models import User, Category
from app.schemas.schemas import UserCreate, UserLogin, Token, UserResponse
from datetime import timedelta
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

DEFAULT_CATEGORIES = [
    {"name": "Ăn uống", "icon": "utensils", "color": "#ef4444"},
    {"name": "Di chuyển", "icon": "car", "color": "#3b82f6"},
    {"name": "Mua sắm", "icon": "shopping-bag", "color": "#8b5cf6"},
    {"name": "Giải trí", "icon": "gamepad-2", "color": "#ec4899"},
    {"name": "Nhà cửa", "icon": "home", "color": "#f59e0b"},
    {"name": "Y tế", "icon": "heart-pulse", "color": "#10b981"},
    {"name": "Giáo dục", "icon": "graduation-cap", "color": "#6366f1"},
    {"name": "Tiết kiệm", "icon": "piggy-bank", "color": "#14b8a6"},
    {"name": "Lương", "icon": "wallet", "color": "#22c55e"},
    {"name": "Đầu tư", "icon": "trending-up", "color": "#eab308"},
    {"name": "Khác", "icon": "more-horizontal", "color": "#6b7280"},
]


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create default categories for new user
    for cat_data in DEFAULT_CATEGORIES:
        cat = Category(
            user_id=user.id,
            name=cat_data["name"],
            icon=cat_data["icon"],
            color=cat_data["color"],
            is_system=True,
        )
        db.add(cat)
    db.commit()

    return user


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token(
        subject=str(user.id),
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(__import__("app.api.deps", fromlist=["get_current_user"]).get_current_user)):
    return current_user
