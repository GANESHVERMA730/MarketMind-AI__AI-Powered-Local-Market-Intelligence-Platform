# MarketMind AI API — Phases 2–3

The API is served by the Express backend. Except for health and authentication endpoints, business endpoints require:

```http
Authorization: Bearer <JWT>
```

All business records are scoped to the authenticated user's account. Errors use `{ "success": false, "message": "...", "errors": [...] }` when validation details apply.

## Products and inventory

Products are available under `/api/products`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/products` | Create a product |
| `GET` | `/api/products` | List and search products |
| `GET` | `/api/products/:id` | Get a product |
| `PATCH` | `/api/products/:id` | Update one or more product fields |
| `DELETE` | `/api/products/:id` | Delete a product or archive it if sales reference it |

Create requires `name`, `sku`, `category`, `costPrice`, `sellingPrice`, and integer `stockQuantity`. Optional fields: `description`, integer `minStockThreshold` (defaults to `5`), and `supplierName`. Categories: `groceries`, `beverages`, `snacks`, `personal_care`, `household`, `other`. SKU uniqueness is per user.

List filters: `page`, `limit` (maximum `100`), `sort`, `order`, `category`, `search` (name or SKU), `lowStock=true`, and `includeArchived=true`. Low stock means `stockQuantity <= minStockThreshold`. Product responses include calculated `isLowStock`, inventory value at recorded cost, and potential gross profit at current prices.

## Sales

Sales are available under `/api/sales`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/sales` | Record a completed multi-item sale |
| `GET` | `/api/sales` | List sales |
| `GET` | `/api/sales/:id` | Get a sale |
| `POST` | `/api/sales/:id/cancel` | Cancel a sale and restore its stock |

Create body example:

```json
{
  "items": [
    { "productId": "673a5a4b83c103a651e87311", "quantity": 2 }
  ],
  "paymentMethod": "cash",
  "clientRequestId": "receipt-request-0001"
}
```

Quantities must be positive integers, duplicate product IDs must be combined, and only active products owned by the user may be sold. Prices, line totals, COGS, and gross profit are copied/calculated from the product on the server; client-supplied totals are rejected. A sale fails if stock is insufficient, without leaving a partial stock deduction. `clientRequestId` is optional and makes retries for a given user idempotent.

List filters: `page`, `limit`, `status` (`completed` or `cancelled`), `preset` (`day`, `week`, `month`, `custom`), `from`, and `to`. For custom date-only values, both `from` and `to` are inclusive UTC calendar dates. Cancelling an already-cancelled sale is rejected; a successful cancellation restores stock and the cancelled sale is excluded from analytics.

## Analytics

`GET /api/analytics/dashboard` accepts `preset=day|week|month` or `preset=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`. With no parameters it defaults to the current day and preceding 29 days, through today. Custom date-only end dates are inclusive and interpreted as UTC.

The response includes revenue, COGS, gross profit, order count, and units sold; a daily series (including zero-sale days); best-selling products; slow-moving active products; category performance; low-stock products; and recent completed sales. All numbers are based on completed sales owned by the authenticated user. Gross profit is revenue minus COGS; net profit is not calculated because operating expenses are not recorded.

## Errors and consistency

- `400`: validation failures, insufficient stock, duplicate sale lines, or cancelling a cancelled sale.
- `401`: missing or invalid authentication.
- `404`: unknown resources or resources belonging to another user.
- `409`: duplicate SKU.
- Inventory and sale writes use transactions on MongoDB deployments that support them; standalone MongoDB uses conditional atomic stock updates and compensating updates.

## Demand Forecast

The forecast endpoint requires JWT authentication.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/forecasts/:productId?days=7` | Forecast product demand |

- `productId`: Product ID available in the trained ML dataset.
- `days`: Forecast horizon from 1 to 30 days; defaults to 7.
- Express forwards the request to the Python ML service at `POST /predict`.
- Successful responses contain `product_id`, `product_name`, `forecast_days`, and a `predictions` array with `date` and `predicted_demand`.
- The ML service returns `404` if the product is absent from its dataset and `400` if demand history is insufficient.
- The model uses the exported dataset and trained model file. Predictions are based on that dataset, not live MongoDB sales.

Start the ML service before requesting forecasts. Configure `ML_SERVICE_URL` if it is not running at `http://127.0.0.1:8000`.
