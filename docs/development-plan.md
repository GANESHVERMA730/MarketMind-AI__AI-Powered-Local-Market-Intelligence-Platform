# MarketMind AI — development plan

This document tracks the implementation plan. Later phases must be verified before the next one starts.

## Design decisions

1. **Monorepo, three services.** React, Express, and FastAPI stay separate so each can be deployed independently without extra tooling such as Nx.
2. **JavaScript only** in client and server. No TypeScript.
3. **CommonJS on the server** (`require`) so BCA students can follow Node examples easily. The Vite client uses ES modules.
4. **Browser talks only to Express.** The Python service is not exposed to the frontend by default. This keeps CORS, auth, and ownership in one place.
5. **User-owned shop data.** Every product, sale, and analytics query is scoped to `userId` on the server.
6. **Synthetic public market dataset.** Cross-shop price comparison uses seeded market documents, not other users' private inventory.
7. **Money math.** Revenue, COGS, and gross profit use recorded line-item prices. Totals are calculated on the server.
8. **Time-series ML.** Chronological train/test split. Lags and rolling averages are computed without leaking future values. A seasonal-naive or recent-average baseline is always reported.
9. **Advisor is rule-based first.** An optional LLM can be added later via env vars. The app must work with no paid API.
10. **Reproducible demo.** Fixed random seed (`DEMO_SEED=42` / `RANDOM_SEED=42`). Seed scripts refuse duplicate shops unless the database is reset.

## Target folder layout

```text
MarketMind-AI/
  client/
    public/
    src/
      api/
      components/
      context/
      hooks/
      layouts/
      pages/
      utils/
    index.html
    vite.config.js
    tailwind.config.js
    .env.example
  server/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      utils/
      app.js
      index.js
    scripts/
    tests/
    .env.example
  ml-service/
    app/
      main.py
      pipeline.py
      features.py
      models.py
    data/
    models/
    tests/
    requirements.txt
    .env.example
  docs/
```

## Calculation policy (used in every later phase)

- **Revenue** = sum of sold quantity × recorded selling price (completed sales only).
- **COGS** = sum of sold quantity × recorded cost price.
- **Gross profit** = revenue − COGS.
- **Net profit** is not shown as a fact unless expenses exist.
- Refunded or cancelled sales restore stock when appropriate and are excluded from revenue unless documented otherwise.
- Date filters are inclusive of the start date and exclusive of the day after the end date (UTC stored, shop-local display later if needed).

## Phases

### Phase 1 — complete

Architecture, README, package files, env examples, gitignore, development instructions.

### Phase 2 — complete: Express foundation

Health endpoint, MongoDB connection, user model, register/login/JWT, auth middleware, centralized errors. Verify server startup.

Implemented in `server/src/` with Jest tests using MongoDB Memory Server.

### Phase 3 — complete: Core business API

Products, sales (stock checks, atomic-enough updates), analytics aggregations, backend tests.

Implemented authenticated product CRUD and inventory alerts; sales with server-calculated line totals, stock checks/restoration and optional idempotency keys; date-filtered analytics; and integration tests using MongoDB Memory Server. See [API documentation](./api-documentation.md).

### Phase 4 — complete: React UI

Vite + Tailwind, routing, auth pages, dashboard, products, sales, charts wired to the API.

Implemented responsive public, login, registration, dashboard, inventory, and sales screens. The client uses the documented Express response fields and authenticated routes. Build with `npm run build --prefix client`; tests with `npm test --prefix client`.

### Phase 5 — complete: Synthetic data

Reproducible generator, Mongo seed, ML dataset export, demo account setup without a hardcoded public admin password.

Implemented a seeded MongoDB generator for 10 synthetic shops, 40 products per shop, 270 days of completed sales, and a separate synthetic market-price collection. An existing locally registered account can be explicitly linked for dashboard demos; generated account passwords are random and never displayed. A pandas exporter creates a zero-filled product-day demand CSV. See the README for setup, reset, and export commands.

### Phase 6 — ML service

Feature pipeline, baseline + regressor, MAE and a second metric, FastAPI `/health`, `/train`, `/forecast`, `/metrics`. Independent pytest.

### Phase 7 — Intelligence features

Forecast UI via Express proxy, simulated market intel, rule-based advisor.

### Phase 8 — Hardening and docs

Remaining tests, empty/error states, academic docs, API examples.

### Phase 9 — Repository review

Security, isolation, consistent math, instructions, no fake success paths.

## What is intentionally not built in Phase 1

Application source, Mongo connection, UI, seed scripts, trained models, and tests. Those start in Phase 2.
