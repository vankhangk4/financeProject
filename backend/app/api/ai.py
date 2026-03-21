from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import User, Transaction, Category, TransactionType
from app.schemas.schemas import AICategorizationRequest, AICategorizationResponse, CashFlowPrediction, AnomalyAlert
from app.ai.transaction_classifier import TransactionClassifier
from app.ai.cash_flow_predictor import CashFlowPredictor
from app.ai.anomaly_detector import AnomalyDetector
from app.api.deps import get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/categorize", response_model=AICategorizationResponse)
def categorize_transaction(
    request: AICategorizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Auto-categorize a transaction using ML."""
    classifier = TransactionClassifier(current_user.id)

    # Get user's labeled transactions for training
    labeled = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id.isnot(None),
            Transaction.is_ai_categorized == False,
        )
        .all()
    )

    if len(labeled) >= 10 and not classifier.is_trained:
        texts = [t.description or "" for t in labeled]
        labels = [t.category_id for t in labeled]
        classifier.train(texts, labels)

    category_id, confidence = classifier.predict(request.description)

    if category_id == 0:
        # Return most common category as fallback
        default = db.query(Category).filter(Category.user_id == current_user.id).first()
        if default:
            return AICategorizationResponse(
                category_id=default.id,
                category_name=default.name,
                confidence=0.0,
            )
        raise HTTPException(status_code=404, detail="No categories found")

    category = db.query(Category).filter(Category.id == category_id).first()
    return AICategorizationResponse(
        category_id=category_id,
        category_name=category.name if category else "Unknown",
        confidence=confidence,
    )


@router.post("/train-classifier")
def train_classifier(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrain the classifier with user's labeled data."""
    labeled = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id.isnot(None),
            Transaction.is_ai_categorized == False,
        )
        .all()
    )

    classifier = TransactionClassifier(current_user.id)
    result = classifier.train(
        texts=[t.description or "" for t in labeled],
        labels=[t.category_id for t in labeled],
    )
    return result


@router.get("/predict-cashflow", response_model=List[CashFlowPrediction])
def predict_cashflow(
    months: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Predict future cash flow."""
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type != TransactionType.TRANSFER.value,
        )
        .all()
    )

    tx_data = [
        {
            "date": t.date,
            "amount": t.amount,
            "type": t.transaction_type,
        }
        for t in transactions
    ]

    predictor = CashFlowPredictor(current_user.id)
    if len(tx_data) >= 30:
        predictor.train(tx_data)

    predictions = predictor.predict(tx_data, months)
    return [CashFlowPrediction(**p) for p in predictions]


@router.get("/anomaly-alerts", response_model=List[AnomalyAlert])
def get_anomaly_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get spending anomaly alerts."""
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type != TransactionType.TRANSFER.value,
        )
        .all()
    )

    budgets = db.query(Category).filter(Category.user_id == current_user.id).all()

    tx_data = [
        {
            "date": t.date,
            "amount": t.amount,
            "type": t.transaction_type,
            "category_id": t.category_id,
        }
        for t in transactions
    ]

    budget_data = [
        {"category_id": c.id, "category_name": c.name, "amount": 0}  # Will be filled from budgets table
        for c in budgets
    ]

    detector = AnomalyDetector(current_user.id)
    if len(tx_data) >= 20:
        detector.train(tx_data)

    alerts = detector.get_budget_alerts(tx_data, budget_data)
    return [AnomalyAlert(**a) for a in alerts]
