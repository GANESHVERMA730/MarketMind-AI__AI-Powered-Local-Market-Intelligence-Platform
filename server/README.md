# MarketMind AI — server

Express + MongoDB API. Phase 2: health check, user accounts, and JWT auth.

## Setup

```bash
cd server
npm install
copy .env.example .env
```

Set `MONGODB_URI` and `JWT_SECRET` in `.env`. Do not commit `.env`.

## Run

```bash
npm run dev
```

- Health: `GET http://localhost:5000/api/health`
- Register: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- Current user: `GET /api/auth/me` (Bearer token)

If MongoDB is unreachable, startup fails with an explicit message and exit code 1.

## Tests

```bash
npm test
```

Tests spin up MongoDB Memory Server and do not use your `.env` database.
