
from datetime import timedelta
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/processed/product-daily-demand.csv"
MODEL_PATH = ROOT / "models/demand_model.joblib"

app = FastAPI(title="MarketMind AI", version="1.0.0")

bundle = joblib.load(MODEL_PATH)
model = bundle["model"]
FEATURES = bundle["features"]
CATEGORY_MAP = bundle["category_map"]

history = pd.read_csv(DATA_PATH, parse_dates=["date"])


class PredictionRequest(BaseModel):
    product_id: str
    days: int = Field(default=7, ge=1, le=30)


@app.get("/health")
def health():
    return {"status": "healthy", "service": "MarketMind AI"}


@app.post("/predict")
def predict(request: PredictionRequest):
    product = history[
        history["product_id"].astype(str) == request.product_id
    ].sort_values("date")

    if product.empty:
        raise HTTPException(status_code=404, detail="Product not found")

    product = product.copy()
    latest = product.iloc[-1]
    demand = product["units_sold"].astype(float).tolist()

    if len(demand) < 28:
        raise HTTPException(
            status_code=400,
            detail="Insufficient history for prediction"
        )

    results = []
    next_date = product["date"].max() + timedelta(days=1)

    for offset in range(request.days):
        date = next_date + timedelta(days=offset)

        row = {
            "lag_1": demand[-1],
            "lag_7": demand[-7],
            "rolling_mean_7": sum(demand[-7:]) / 7,
            "rolling_mean_28": sum(demand[-28:]) / 28,
            "selling_price": float(latest["selling_price"]),
            "cost_price": float(latest["cost_price"]),
            "day_of_week": date.dayofweek,
            "is_weekend": int(date.dayofweek >= 5),
            "month": date.month,
            "category_code": CATEGORY_MAP.get(
                str(latest["category"]), 0
            ),
        }

        features = pd.DataFrame([row])[FEATURES]
        predicted = max(0.0, float(model.predict(features)[0]))
        predicted = round(predicted, 2)
        demand.append(predicted)

        results.append({
            "date": date.strftime("%Y-%m-%d"),
            "predicted_demand": predicted
        })

    return {
        "product_id": request.product_id,
        "product_name": str(latest["product_name"]),
        "forecast_days": request.days,
        "predictions": results
    }
