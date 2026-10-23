
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "ml-service" / "data" / "processed" / "product-daily-demand.csv"
MODEL = ROOT / "ml-service" / "models" / "demand_model.joblib"
METRICS = ROOT / "ml-service" / "models" / "metrics.json"

FEATURES = [
    "lag_1", "lag_7", "rolling_mean_7", "rolling_mean_28",
    "selling_price", "cost_price", "day_of_week",
    "is_weekend", "month", "category_code"
]


def main():
    df = pd.read_csv(DATA, parse_dates=["date"])
    df = df.sort_values(["shop_id", "product_id", "date"]).reset_index(drop=True)

    groups = df.groupby(["shop_id", "product_id"])["units_sold"]
    df["lag_1"] = groups.shift(1)
    df["lag_7"] = groups.shift(7)
    df["rolling_mean_7"] = groups.transform(
        lambda s: s.shift(1).rolling(7).mean()
    )
    df["rolling_mean_28"] = groups.transform(
        lambda s: s.shift(1).rolling(28).mean()
    )

    categories = sorted(df["category"].fillna("unknown").unique())
    category_map = {name: i for i, name in enumerate(categories)}
    df["category_code"] = (
        df["category"].fillna("unknown").map(category_map).astype(int)
    )

    df = df.dropna(subset=FEATURES + ["units_sold"]).copy()
    dates = sorted(df["date"].unique())
    if len(dates) < 35:
        raise ValueError("Not enough historical data to train the model.")

    test_dates = dates[-28:]
    train = df[~df["date"].isin(test_dates)]
    test = df[df["date"].isin(test_dates)]

    model = RandomForestRegressor(
        n_estimators=100,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(train[FEATURES], train["units_sold"].clip(lower=0))

    predictions = np.maximum(model.predict(test[FEATURES]), 0)
    mae = mean_absolute_error(test["units_sold"], predictions)
    rmse = np.sqrt(mean_squared_error(test["units_sold"], predictions))

    joblib.dump({
        "model": model,
        "features": FEATURES,
        "category_map": category_map
    }, MODEL)

    metrics = {
        "model": "RandomForestRegressor",
        "training_rows": int(len(train)),
        "testing_rows": int(len(test)),
        "test_period_days": 28,
        "mae": round(float(mae), 3),
        "rmse": round(float(rmse), 3)
    }
    METRICS.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("Model training completed.")
    print(json.dumps(metrics, indent=2))
    print(f"Model saved: {MODEL}")


if __name__ == "__main__":
    main()
