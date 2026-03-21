from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, ChatHistory, ChatSession
from app.schemas.schemas import ChatMessage, ChatResponse
from app.services.chatbot import FinanceChatbot
from app.api.deps import get_current_user

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


@router.post("/chat", response_model=ChatResponse)
def chat(
    data: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chat with the financial advisor bot."""
    chatbot = FinanceChatbot(current_user.id)
    result = chatbot.chat(data.message)

    session_id = data.session_id

    # If no session_id provided, create a new session automatically
    if session_id is None:
        # Auto-title from first 50 chars of message
        title = data.message[:50].strip() if len(data.message) > 50 else data.message.strip()
        if not title:
            title = "Phiên mới"
        session = ChatSession(user_id=current_user.id, title=title)
        db.add(session)
        db.flush()
        session_id = session.id
    else:
        # Verify session belongs to user
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
            .first()
        )
        if not session:
            # Fall back: create a new session
            title = data.message[:50].strip() if len(data.message) > 50 else data.message.strip()
            session = ChatSession(user_id=current_user.id, title=title)
            db.add(session)
            db.flush()
            session_id = session.id
        else:
            # Update session updated_at
            session.updated_at = session.updated_at

    # Save to history with session_id
    history = ChatHistory(
        user_id=current_user.id,
        session_id=session_id,
        message=data.message,
        response=result["response"],
    )
    db.add(history)
    db.commit()

    return ChatResponse(
        response=result["response"],
        sources=result.get("sources"),
        session_id=session_id,
    )
