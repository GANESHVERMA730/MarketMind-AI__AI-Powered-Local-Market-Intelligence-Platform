"""Convert seeded MongoDB sales into a product-by-day demand CSV."""

import argparse
import json
from pathlib import Path
import sys

import pandas as pd


OUTPUT_COLUMNS = [
    "date",
    "shop_id",
    "product_id",
    "product_name",
    "sku",
    "category",
    "selling_price",
    "cost_price",
    "opening_stock",
    "units_sold",
    "day_of_week",
    "is_weekend",
    "month",
]


def build_dataset(payload: dict) -> pd.DataFrame:
    """Build a daily demand panel, including dates with zero sales."""
    if payload.get("schemaVersion") != 1:
        raise ValueError("Unsupported raw demand-data schema version")

    seed = payload.get("seed") or {}
    start = pd.to_datetime(seed.get("historyStart"), utc=True, errors="coerce")
    end = pd.to_datetime(seed.get("historyEnd"), utc=True, errors="coerce")
    if pd.isna(start) or pd.isna(end) or start > end:
        raise ValueError("Seed history must have valid, ordered historyStart and historyEnd dates")

    product_rows = payload.get("products")
    if not isinstance(product_rows, list) or not product_rows:
        raise ValueError("At least one seeded product is required")

    products = pd.DataFrame(product_rows)
    required_product_fields = {
        "shop_id",
        "product_id",
        "name",
        "sku",
        "category",
        "selling_price",
        "cost_price",
        "opening_stock",
    }
    missing = required_product_fields.difference(products.columns)
    if missing:
        raise ValueError(f"Product data is missing fields: {', '.join(sorted(missing))}")
    if products[["shop_id", "product_id"]].duplicated().any():
        raise ValueError("A product may appear only once per shop in the seed dataset")

    for field in ("selling_price", "cost_price", "opening_stock"):
        products[field] = pd.to_numeric(products[field], errors="coerce")
        if products[field].isna().any() or (products[field] < 0).any():
            raise ValueError(f"Product field {field} must contain non-negative numbers")
    if (products["opening_stock"] % 1 != 0).any():
        raise ValueError("Product opening_stock values must be whole numbers")

    product_keys = set(zip(products["shop_id"].astype(str), products["product_id"].astype(str)))
    demand_rows = []
    sales = payload.get("sales", [])
    if not isinstance(sales, list):
        raise ValueError("Sales data must be a list")

    for sale in sales:
        shop_id = str(sale.get("shop_id", ""))
        sold_at = pd.to_datetime(sale.get("sold_at"), utc=True, errors="coerce")
        if pd.isna(sold_at):
            raise ValueError("Every sale must have a valid sold_at timestamp")
        sold_day = sold_at.normalize()
        if sold_day < start or sold_day > end:
            raise ValueError("Sale date falls outside the seed history range")

        items = sale.get("items")
        if not isinstance(items, list) or not items:
            raise ValueError("Every sale must contain at least one item")
        for item in items:
            product_id = str(item.get("product_id", ""))
            if (shop_id, product_id) not in product_keys:
                raise ValueError(f"Sale references an unknown product: {product_id}")
            quantity = item.get("quantity")
            if isinstance(quantity, bool) or not isinstance(quantity, int) or quantity < 1:
                raise ValueError("Sale item quantities must be positive whole numbers")
            if sale.get("status") == "completed":
                demand_rows.append(
                    {
                        "shop_id": shop_id,
                        "product_id": product_id,
                        "date": sold_day,
                        "units_sold": quantity,
                    }
                )

    if demand_rows:
        demand = (
            pd.DataFrame(demand_rows)
            .groupby(["shop_id", "product_id", "date"], as_index=False)["units_sold"]
            .sum()
        )
    else:
        demand = pd.DataFrame(columns=["shop_id", "product_id", "date", "units_sold"])

    dates = pd.date_range(start=start, end=end, freq="D", tz="UTC")
    products["shop_id"] = products["shop_id"].astype(str)
    products["product_id"] = products["product_id"].astype(str)
    products["key"] = 1
    calendar = pd.DataFrame({"date": dates, "key": 1})
    panel = products.merge(calendar, on="key").drop(columns="key")
    panel = panel.merge(
        demand,
        on=["shop_id", "product_id", "date"],
        how="left",
        validate="one_to_one",
    )
    panel["units_sold"] = pd.to_numeric(panel["units_sold"], errors="coerce").fillna(0).astype("int64")
    panel["day_of_week"] = panel["date"].dt.dayofweek.astype("int64")
    panel["is_weekend"] = panel["day_of_week"].isin([5, 6]).astype("int64")
    panel["month"] = panel["date"].dt.month.astype("int64")
    panel["date"] = panel["date"].dt.strftime("%Y-%m-%d")
    panel = panel.rename(
        columns={
            "name": "product_name",
        }
    )
    panel = panel[OUTPUT_COLUMNS].sort_values(
        ["shop_id", "product_id", "date"], kind="stable"
    ).reset_index(drop=True)

    expected_rows = len(products) * len(dates)
    if len(panel) != expected_rows:
        raise ValueError("Daily demand panel does not contain one row per product and date")
    return panel


def export_dataset(input_path: Path, output_path: Path) -> int:
    with input_path.open("r", encoding="utf-8") as source:
        payload = json.load(source)
    dataset = build_dataset(payload)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_csv(output_path, index=False)
    return len(dataset)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Temporary JSON export from the Node/MongoDB exporter")
    parser.add_argument("--output", required=True, type=Path, help="Destination product-level daily CSV")
    args = parser.parse_args()
    try:
        row_count = export_dataset(args.input, args.output)
    except (OSError, json.JSONDecodeError, ValueError, KeyError) as error:
        print(f"Could not export demand dataset: {error}", file=sys.stderr)
        return 1
    print(f"Exported {row_count} product-day demand rows to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
