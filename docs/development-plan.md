# MarketMind AI — Development Plan

This document tracks the implementation status of MarketMind AI.

## Design Decisions

1. **Monorepo with three services:** React, Express, and FastAPI remain separate.
2. **JavaScript only:** The client and server use JavaScript; no TypeScript.
3. **CommonJS server:** The Express backend uses `require`; the Vite client uses ES modules.
4. **Express as the frontend API:** The browser communicates with Express, which proxies forecast requests to FastAPI.
5. **User-owned data:** Product, sales, and analytics queries are scoped to the authenticated user.
6. **Synthetic market data:** Market comparisons use seeded synthetic market records, not other users' private inventory.
7. **Consistent financial calculations:** Revenue, COGS, and gross profit use recorded sale prices and quantities.
8. **Time-series forecasting:** The ML model uses historical demand, lag features, rolling averages, prices, and calendar features.
9. **Rule-based advisor:** Advisor functionality must be verified before being marked complete.
10. **Reproducible demo:** Seed scripts use fixed random seeds and support controlled demo-data generation.

## Target Folder Layout

```text
MarketMind-AI/
├── client/
│   └── src/
├── server/
│   ├── src/
│   ├── scripts/
│   └── tests/
├── ml-service/
│   ├── app/
│   ├── data/
│   ├── models/
│   ├── scripts/
│   └── tests/
└── docs/
```

## Calculation Policy

- **Revenue:** Sum of sold quantity × recorded selling price for completed sales.
- **COGS:** Sum of sold quantity × recorded cost price.
- **Gross profit:** Revenue − COGS.
- **Net profit:** Not reported as a fact because operating expenses are not recorded.
- Cancelled sales are excluded from sales analytics, and successful cancellations restore stock.
- Date filters use inclusive start and end dates where documented, with UTC date handling.

## Implementation Phases

### Phase 1 — Complete: Project Foundation

Established the project structure, package configuration, environment examples, Git ignore rules, and initial architecture.

### Phase 2 — Complete: Express Foundation

Implemented the Express application, MongoDB connection, user model, authentication, JWT middleware, health endpoint, and centralized error handling.

### Phase 3 — Complete: Core Business API

Implemented authenticated product CRUD, inventory alerts, sales recording and cancellation, stock validation, optional idempotency keys, date-filtered analytics, and backend integration tests.

See [API Documentation](./api-documentation.md).

### Phase 4 — Complete: React UI

Implemented the React + Vite interface, authentication screens, dashboard, inventory and sales pages, and API-connected charts.

Build using:

```bash
npm run build --prefix client
```

### Phase 5 — Complete: Synthetic Demo Data

Implemented reproducible demo-data generation, synthetic shops and products, sales history, synthetic market-price observations, and product-day demand dataset export.

The demo data is synthetic and should not be presented as real market data.

### Phase 6 — Complete: ML Demand Forecasting

Implemented a FastAPI prediction service, trained Random Forest model, exported demand dataset, and demand forecast endpoint.

Available ML endpoints:

- `GET /health`
- `POST /predict`

Model evaluation:

| Metric | Result |
|---|---:|
| Training rows | 85,600 |
| Testing rows | 11,200 |
| Test period | 28 days |
| MAE | 0.348 |
| RMSE | 0.674 |

The trained model uses lagged demand, rolling averages, prices, product category, and calendar features. Forecasts are generated from the exported CSV dataset, not live MongoDB sales history.

### Phase 7 — Partially Complete: Intelligence Features

**Completed:** Express forecast proxy and dashboard forecast chart.

The authenticated Express endpoint is:

`GET /api/forecasts/:productId?days=7`

It forwards the product ID and requested forecast horizon to the FastAPI `/predict` endpoint.

Market intelligence and rule-based advisor functionality still require implementation verification before this phase can be marked complete.

### Phase 8 — In Progress: Hardening and Documentation

- Update API documentation and architecture diagrams.
- Verify endpoint behavior and error handling.
- Review empty states and ML service failures.
- Verify automated tests and setup instructions.
- Complete academic documentation and examples.

### Phase 9 — Pending: Repository Review

- Review authentication and data isolation.
- Check financial calculation consistency.
- Verify setup and deployment instructions.
- Remove misleading or unverified functionality claims.
- Run the available builds and tests before final submission.

## Items Not Included in the Initial Phase

The initial foundation phase did not include the complete application source, database integration, frontend, seed scripts, trained ML models, or tests. These were implemented in later phases.
