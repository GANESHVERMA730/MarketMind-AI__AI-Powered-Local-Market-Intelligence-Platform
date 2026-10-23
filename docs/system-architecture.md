# MarketMind AI — System Architecture

## Components

| Component | Responsibility |
|---|---|
| React + Vite client | Authentication, dashboard, inventory, sales, and forecast chart |
| Express API | Authentication, product and sales APIs, analytics, and ML proxy |
| MongoDB | User accounts, products, sales, and synthetic market data |
| FastAPI ML service | Demand prediction using a trained Random Forest model |
| CSV dataset | Historical daily product demand used by the ML service |

## Forecast data flow

1. The user selects a product and requests a forecast in the dashboard.
2. React sends an authenticated `GET /api/forecasts/:productId?days=7` request to Express.
3. Express forwards the product ID and forecast horizon to the ML service using `POST /predict`.
4. FastAPI loads historical demand from the exported CSV and generates predictions using the trained model.
5. Express returns the prediction response to React, which displays the forecast chart.

## Important implementation details

- The Python service loads `ml-service/models/demand_model.joblib` and `ml-service/data/processed/product-daily-demand.csv`.
- Forecasts use the exported dataset, not live MongoDB sales history.
- The ML service supports forecast horizons from 1 to 30 days.
- The Express forecast route requires authentication.
- Market intelligence and the advisor should not be considered implemented until their code is verified.

## Service endpoints

| Service | Method | Endpoint |
|---|---|---|
| Express | GET | `/api/health` |
| Express | GET | `/api/forecasts/:productId?days=7` |
| FastAPI | GET | `/health` |
| FastAPI | POST | `/predict` |
