import json
import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.export_demand_dataset import OUTPUT_COLUMNS, build_dataset, export_dataset


def sample_payload():
    return {
        "schemaVersion": 1,
        "seed": {
            "historyStart": "2026-01-01",
            "historyEnd": "2026-01-03",
        },
        "products": [
            {
                "shop_id": "shop-01",
                "product_id": "product-01",
                "name": "Rice 1 kg",
                "sku": "S01-GRO-001",
                "category": "groceries",
                "selling_price": 25.5,
                "cost_price": 20,
                "opening_stock": 8,
            },
            {
                "shop_id": "shop-01",
                "product_id": "product-02",
                "name": "Tea 250 g",
                "sku": "S01-GRO-002",
                "category": "groceries",
                "selling_price": 50,
                "cost_price": 40,
                "opening_stock": 3,
            },
        ],
        "sales": [
            {
                "shop_id": "shop-01",
                "sold_at": "2026-01-01T13:20:00.000Z",
                "status": "completed",
                "items": [{"product_id": "product-01", "quantity": 2}],
            },
            {
                "shop_id": "shop-01",
                "sold_at": "2026-01-01T16:30:00.000Z",
                "status": "completed",
                "items": [{"product_id": "product-01", "quantity": 1}],
            },
            {
                "shop_id": "shop-01",
                "sold_at": "2026-01-02T09:00:00.000Z",
                "status": "cancelled",
                "items": [{"product_id": "product-02", "quantity": 2}],
            },
        ],
    }


def test_builds_product_day_panel_and_excludes_cancelled_sales():
    dataset = build_dataset(sample_payload())

    assert list(dataset.columns) == OUTPUT_COLUMNS
    assert len(dataset) == 6
    rice = dataset[dataset["product_id"] == "product-01"].set_index("date")
    tea = dataset[dataset["product_id"] == "product-02"].set_index("date")
    assert rice.loc["2026-01-01", "units_sold"] == 3
    assert rice.loc["2026-01-02", "units_sold"] == 0
    assert rice.loc["2026-01-03", "units_sold"] == 0
    assert tea.loc["2026-01-02", "units_sold"] == 0
    assert rice.loc["2026-01-03", "day_of_week"] == 5
    assert rice.loc["2026-01-03", "is_weekend"] == 1


def test_aggregates_all_lines_for_each_product_day():
    payload = sample_payload()
    payload["sales"][1]["items"][0]["product_id"] = "product-01"

    dataset = build_dataset(payload)
    value = dataset.loc[
        (dataset["product_id"] == "product-01") & (dataset["date"] == "2026-01-01"),
        "units_sold",
    ].item()
    assert value == 3


def test_rejects_foreign_or_unknown_product_references():
    payload = sample_payload()
    payload["sales"][0]["shop_id"] = "shop-02"

    with pytest.raises(ValueError, match="unknown product"):
        build_dataset(payload)


def test_rejects_invalid_history_and_quantities():
    payload = sample_payload()
    payload["sales"][0]["items"][0]["quantity"] = 0
    with pytest.raises(ValueError, match="positive whole numbers"):
        build_dataset(payload)

    payload = sample_payload()
    payload["seed"]["historyStart"] = "2026-02-01"
    with pytest.raises(ValueError, match="ordered"):
        build_dataset(payload)


def test_empty_sales_produce_zero_demand_for_every_day():
    payload = sample_payload()
    payload["sales"] = []

    dataset = build_dataset(payload)
    assert len(dataset) == 6
    assert (dataset["units_sold"] == 0).all()


def test_exports_csv_without_private_account_fields(tmp_path):
    input_path = tmp_path / "seed.json"
    output_path = tmp_path / "nested" / "demand.csv"
    input_path.write_text(json.dumps(sample_payload()), encoding="utf-8")

    row_count = export_dataset(input_path, output_path)
    exported = pd.read_csv(output_path)

    assert row_count == 6
    assert len(exported) == row_count
    assert list(exported.columns) == OUTPUT_COLUMNS
    assert "email" not in exported.columns
    assert exported.loc[
        (exported["product_id"] == "product-01") & (exported["date"] == "2026-01-01"),
        "units_sold",
    ].item() == 3
