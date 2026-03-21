import os
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import MinMaxScaler
from typing import List, Tuple
from datetime import datetime, timedelta
from app.core.config import settings


class CashFlowPredictor:
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.model_income_path = os.path.join(settings.AI_MODELS_PATH, f"income_pred_{user_id}.pkl")
        self.model_expense_path = os.path.join(settings.AI_MODELS_PATH, f"expense_pred_{user_id}.pkl")
        self.scaler_path = os.path.join(settings.AI_MODELS_PATH, f"scaler_{user_id}.pkl")
        self.model_income = None
        self.model_expense = None
        self.scaler = None
        self.is_trained = False

    def train(self, transactions: List[dict]) -> dict:
        """Train prediction model using historical transaction data."""
        if len(transactions) < 30:
            return {"error": "Need at least 30 transactions to train"}

        df = pd.DataFrame(transactions)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")
        df["month"] = df["date"].dt.to_period("M")

        monthly = df.groupby(["month", "type"])["amount"].sum().unstack(fill_value=0)
        monthly = monthly.reindex(pd.period_range(monthly.index.min(), monthly.index.max(), freq="M"), fill_value=0)

        if len(monthly) < 3:
            return {"error": "Need at least 3 months of data"}

        for col in ["income", "expense"]:
            if col not in monthly.columns:
                monthly[col] = 0

        # Features: lag values — use only 1 lag for small datasets to prevent overfitting
        # LinearRegression with n_samples and k_features has ~n-k degrees of freedom
        # For n=6 months, lag=1 + lag=2 + ma3 = 3 features → 3 degrees of freedom (tight but valid)
        num_lags = 1 if len(monthly) < 12 else 3
        for lag in range(1, num_lags + 1):
            monthly[f"income_lag{lag}"] = monthly["income"].shift(lag)
            monthly[f"expense_lag{lag}"] = monthly["expense"].shift(lag)

        monthly["income_ma3"] = monthly["income"].rolling(3).mean()
        monthly["expense_ma3"] = monthly["expense"].rolling(3).mean()

        monthly = monthly.dropna()

        if len(monthly) < 3:
            return {"error": "Not enough data after preprocessing"}

        # Train income model
        feature_cols = [c for c in monthly.columns if "lag" in c or "ma" in c]
        X = monthly[feature_cols].values
        y_income = monthly["income"].values
        y_expense = monthly["expense"].values

        self.scaler = MinMaxScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Use Ridge with moderate alpha to prevent perfect fit on small datasets.
        # Overfitting on 6 months of data produces unrealistic R²=1.0 and
        # flat predictions. Ridge shrinks coefficients toward zero, producing
        # more honest metrics and reasonable forecasts.
        from sklearn.linear_model import Ridge

        alpha = max(1.0, len(monthly) * 2)  # stronger regularization for small data
        self.model_income = Ridge(alpha=alpha)
        self.model_expense = Ridge(alpha=alpha)
        self.model_income.fit(X_scaled, y_income)
        self.model_expense.fit(X_scaled, y_expense)

        # Evaluate
        from sklearn.metrics import mean_absolute_error, r2_score

        pred_income = self.model_income.predict(X_scaled)
        pred_expense = self.model_expense.predict(X_scaled)

        income_mae = mean_absolute_error(y_income, pred_income)
        expense_mae = mean_absolute_error(y_expense, pred_expense)
        income_r2 = r2_score(y_income, pred_income)
        expense_r2 = r2_score(y_expense, pred_expense)

        # Save
        os.makedirs(settings.AI_MODELS_PATH, exist_ok=True)
        import joblib
        joblib.dump(self.model_income, self.model_income_path)
        joblib.dump(self.model_expense, self.model_expense_path)
        joblib.dump(self.scaler, self.scaler_path)
        self.is_trained = True

        return {
            "income_mae": float(income_mae),
            "expense_mae": float(expense_mae),
            "income_r2": float(income_r2),
            "expense_r2": float(expense_r2),
        }

    def predict(self, recent_transactions: List[dict], months: int = 3) -> List[dict]:
        """Predict cash flow for next N months."""
        if not self.is_trained:
            self._load_model()
        if self.model_income is None or self.model_expense is None:
            return []

        df = pd.DataFrame(recent_transactions)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")
        df["month"] = df["date"].dt.to_period("M")

        monthly = df.groupby(["month", "type"])["amount"].sum().unstack(fill_value=0)
        monthly = monthly.reindex(pd.period_range(monthly.index.min(), monthly.index.max(), freq="M"), fill_value=0)
        for col in ["income", "expense"]:
            if col not in monthly.columns:
                monthly[col] = 0

        # Build features — match lag count used during training
        num_lags = 1 if len(monthly) < 12 else 3
        for lag in range(1, num_lags + 1):
            monthly[f"income_lag{lag}"] = monthly["income"].shift(lag)
            monthly[f"expense_lag{lag}"] = monthly["expense"].shift(lag)
        monthly["income_ma3"] = monthly["income"].rolling(3).mean()
        monthly["expense_ma3"] = monthly["expense"].rolling(3).mean()
        monthly = monthly.dropna()

        if len(monthly) < 3:
            return []

        feature_cols = [c for c in monthly.columns if "lag" in c or "ma" in c]
        last_features = monthly[feature_cols].iloc[-1:].values
        last_scaled = self.scaler.transform(last_features)

        # For each future month, decay the model prediction toward the long-term
        # average. The further ahead, the more we rely on the average.
        # This prevents flat-line predictions and simulates natural variation.
        income_avg = monthly["income"].tail(3).mean()
        expense_avg = monthly["expense"].tail(3).mean()

        predictions = []
        for i in range(1, months + 1):
            next_month = monthly.index[-1] + i
            raw_income = self.model_income.predict(last_scaled)[0]
            raw_expense = self.model_expense.predict(last_scaled)[0]

            # Blend model prediction with average — further months → more average
            decay = 0.5 ** i  # month 1: 0.5, month 2: 0.25, month 3: 0.125
            pred_income = max(0, raw_income * (1 - decay) + income_avg * decay)
            pred_expense = max(0, raw_expense * (1 - decay) + expense_avg * decay)

            # Confidence decreases further into the future
            confidence = max(0.3, 1.0 - (i - 1) * 0.15)

            predictions.append({
                "month": str(next_month),
                "predicted_income": round(float(pred_income), 2),
                "predicted_expense": round(float(pred_expense), 2),
                "confidence": round(float(confidence), 2),
            })

        return predictions

    def _load_model(self):
        import joblib
        if os.path.exists(self.model_income_path) and os.path.exists(self.model_expense_path):
            self.model_income = joblib.load(self.model_income_path)
            self.model_expense = joblib.load(self.model_expense_path)
            self.scaler = joblib.load(self.scaler_path)
            self.is_trained = True
