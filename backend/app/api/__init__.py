from app.api.auth import router as auth_router
from app.api.accounts import router as accounts_router
from app.api.categories import router as categories_router
from app.api.transactions import router as transactions_router
from app.api.budgets import router as budgets_router
from app.api.dashboard import router as dashboard_router
from app.api.reports import router as reports_router
from app.api.ai import router as ai_router
from app.api.chatbot import router as chatbot_router
from app.api.alerts import router as alerts_router
from app.api.chat_sessions import router as chat_sessions_router

__all__ = [
    "auth_router",
    "accounts_router",
    "categories_router",
    "transactions_router",
    "budgets_router",
    "dashboard_router",
    "reports_router",
    "ai_router",
    "chatbot_router",
    "alerts_router",
    "chat_sessions_router",
]
