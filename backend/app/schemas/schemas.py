from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.models import TransactionType, BudgetPeriod


# Auth
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


# Account
class AccountCreate(BaseModel):
    name: str
    account_type: str
    currency: str = "VND"
    icon: str = "wallet"


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    icon: Optional[str] = None


class AccountResponse(BaseModel):
    id: int
    user_id: int
    name: str
    account_type: str
    balance: float
    currency: str
    icon: str
    created_at: datetime

    class Config:
        from_attributes = True


# Category
class CategoryCreate(BaseModel):
    name: str
    icon: str = "tag"
    color: str = "#6366f1"
    parent_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    icon: str
    color: str
    parent_id: Optional[int]
    is_system: bool

    class Config:
        from_attributes = True


# Transaction
class TransactionCreate(BaseModel):
    account_id: int
    category_id: Optional[int] = None
    amount: float = Field(gt=0)
    transaction_type: TransactionType
    description: Optional[str] = None
    date: datetime


class TransactionUpdate(BaseModel):
    category_id: Optional[int] = None
    description: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    account_id: int
    category_id: Optional[int]
    amount: float
    transaction_type: TransactionType
    description: Optional[str]
    date: datetime
    is_ai_categorized: bool
    created_at: datetime
    category: Optional[CategoryResponse]

    class Config:
        from_attributes = True


# Budget
class BudgetCreate(BaseModel):
    category_id: int
    amount: float = Field(gt=0)
    period: BudgetPeriod = BudgetPeriod.MONTHLY


class BudgetUpdate(BaseModel):
    amount: Optional[float] = None
    period: Optional[BudgetPeriod] = None


class BudgetResponse(BaseModel):
    id: int
    user_id: int
    category_id: int
    amount: float
    period: BudgetPeriod
    category: CategoryResponse

    class Config:
        from_attributes = True


class BudgetProgress(BaseModel):
    budget: BudgetResponse
    spent: float
    remaining: float
    percentage: float


# Transfer
class TransferCreate(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: float = Field(gt=0)
    description: Optional[str] = None
    date: datetime


class TransferResponse(BaseModel):
    from_transaction: TransactionResponse
    to_transaction: TransactionResponse


# Confirm Delete
class ConfirmDelete(BaseModel):
    password: str = Field(min_length=1)


# Dashboard
class DashboardStats(BaseModel):
    total_balance: float
    monthly_income: float
    monthly_expense: float
    savings_rate: float
    top_categories: List[dict]
    recent_transactions: List[TransactionResponse]
    budget_alerts: List[BudgetProgress]


# Reports
class CategorySummary(BaseModel):
    category_id: int
    category_name: str
    category_color: str
    total_amount: float
    transaction_count: int
    percentage: float


class MonthlyReport(BaseModel):
    month: str
    income: float
    expense: float
    net: float
    categories: List[CategorySummary]


# AI
class AICategorizationRequest(BaseModel):
    description: str
    amount: Optional[float] = None


class AICategorizationResponse(BaseModel):
    category_id: int
    category_name: str
    confidence: float


class CashFlowPrediction(BaseModel):
    month: str
    predicted_income: float
    predicted_expense: float
    confidence: float


class AnomalyAlert(BaseModel):
    category_name: str
    expected_amount: float
    actual_amount: float
    deviation: float
    severity: str  # low, medium, high


# Chatbot
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[int] = None


class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[str]] = None
    session_id: Optional[int] = None


# Chat Sessions
class ChatSessionCreate(BaseModel):
    title: Optional[str] = None


class ChatSessionUpdate(BaseModel):
    title: str


class ChatSessionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatMessageItem(BaseModel):
    id: int
    user_id: int
    session_id: Optional[int]
    message: str
    response: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionDetail(ChatSessionResponse):
    messages: List[ChatMessageItem] = []


# Pagination
class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    page_size: int
    pages: int
