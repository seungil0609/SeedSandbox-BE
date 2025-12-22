# SeedSandbox Server

"The Safest Laboratory to Start Investing" — Backend API

![Build](https://img.shields.io/badge/build-passing-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/node-%3E%3D16-brightgreen) ![Express](https://img.shields.io/badge/framework-express-404d59) ![MongoDB](https://img.shields.io/badge/db-mongodb-47A248)

---

## Introduction

SeedSandbox Server is a production-ready RESTful API that handles financial data aggregation, portfolio and transaction management, and AI-driven portfolio diagnosis. The server acts as a secure proxy for external services (Yahoo Finance, Google Gemini), performing critical data normalization and validation before exposing APIs to the frontend.

Frontend repository: [Insert Frontend Repo Link]

---

## Tech Stack & Architecture

- Runtime: **Node.js** (TypeScript)
- Framework: **Express.js** (MVC-style organization: controllers → services → models)
- Database: **MongoDB Atlas** via **Mongoose** ODM
- External APIs: **yahoo-finance2** (market data), **Google Gemini API** (AI)

Architecture highlights:

- **MVC pattern**: Controllers handle HTTP, Services encapsulate business logic (data normalization, aggregation, AI orchestration), Models define data schema and validation.
- **Data normalization layer**: Every market data response is normalized into consistent OHLCV object arrays and schema-validated documents before storage or forwarding to clients.
- **Atomic updates & consistency**: Portfolio/transaction state updates use Mongoose transactions (sessions) or optimistic checks to ensure accurate asset totals and prevent race conditions.

---

## Database Schema

Entities and relationships:
<img width="744" height="706" alt="Image" src="https://github.com/user-attachments/assets/055d4810-90d7-4a7a-b114-6982dd4b501e" />

Relationships summary:

- User (1) --- (N) Portfolio
- Portfolio (1) --- (N) Transaction
- Transaction -> references Asset (by symbol)
- Portfolio maintains denormalized snapshot of holdings for fast reads and analytics

Design considerations:

- Use Mongoose schemas with strict validation and compound indexes for frequent queries (e.g., { user: 1, name: 1 } unique per user).
- Use MongoDB sessions for multi-document transactions when updating Portfolio totals and appending Transactions to guarantee atomicity.

---

## API Reference (Key Endpoints)

| Endpoint                                  | Method | Auth | Description                                                                |
| ----------------------------------------- | -----: | :--: | -------------------------------------------------------------------------- |
| GET /api/portfolios                       |    GET | Yes  | List portfolios for the authenticated user                                 |
| POST /api/portfolios                      |   POST | Yes  | Create a new portfolio (name, baseCurrency)                                |
| GET /api/portfolios/:id                   |    GET | Yes  | Get portfolio details including holdings and metrics                       |
| POST /api/transactions                    |   POST | Yes  | Create a transaction; server updates portfolio holdings atomically         |
| GET /api/transactions?portfolio=:id       |    GET | Yes  | List transactions for a portfolio                                          |
| GET /api/market/search?q=                 |    GET |  No  | Search market assets by symbol/name (proxy to yahoo-finance2)              |
| GET /api/market/history?symbol=&from=&to= |    GET |  No  | Returns normalized OHLCV time-series (server-normalized)                   |
| POST /api/ai/analyze                      |   POST | Yes  | Send portfolio snapshot to Google Gemini, sanitize and return AI diagnosis |
| GET /api/analytics/portfolio/:id          |    GET | Yes  | Compute risk metrics (Volatility, Beta, Sharpe, MDD) for portfolio         |

Notes:

- All endpoints that mutate user resources require Firebase-authenticated requests (Firebase token validated by `authMiddleware`).
- Market endpoints act as a **normalizing proxy** that converts fragmented API responses into consistent OHLCV arrays before returning to the client.

Example: Normalized time-series response

```json
{
  "symbol": "AAPL",
  "series": [
    {"date":"2025-01-02","open":130.12,"high":132.0,"low":129.5,"close":131.4,"volume":900000},
    ...
  ]
}
```

---

## Environment Variables

Minimum required variables (add to `.env`):

- NODE_ENV=development|production
- PORT=8080
- MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
- FIREBASE_PROJECT_ID=
- FIREBASE_CLIENT_EMAIL=
- FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
- GEMINI_API_KEY=your_google_gemini_key
- YAHOO_API_KEY=optional_if_required
- LOG_LEVEL=info

Security notes:

- Keep `FIREBASE_PRIVATE_KEY` and `GEMINI_API_KEY` out of source control and use secret managers for production deployments (e.g., Vault, cloud secrets).

---

## Data Normalization & Integrity

This server is explicitly responsible for transforming fragmented third-party responses into well-formed, validated records consumable by the frontend and analytic services. Key practices:

- **OHLCV Normalization:** Convert responses that separate timestamps and quotes into arrays of objects with {date, open, high, low, close, volume}.
- **Sanitization:** Strict filtering to remove invalid symbols and null price points (e.g., `.filter(item => item && item.symbol)`).
- **Schema Validation:** Apply Mongoose validation on all persisted documents and run additional business rules in service layer before committing changes.
- **Atomicity:** Use MongoDB sessions for multi-document updates (e.g., when creating a Transaction and updating Portfolio totals) to maintain consistent state.

These measures prevent client-side rendering failures and ensure analytics (volatility, correlations) are computed on clean, dependable data.

---

## Installation & Run Guide

1. Clone:

```bash
git clone https://github.com/your-org/SeedSandbox-BE.git
cd SeedSandbox-BE
```

2. Install:

```bash
npm install
```

3. Configure `.env` (see "Environment Variables" above).

4. Run locally (development):

```bash
npm run dev
# or
npm run start:dev
```

5. Build & start (production):

```bash
npm run build
npm start
```

6. API docs (Swagger):

- Open `http://localhost:<PORT>/api-docs` after server starts.

---

## Operational Considerations

- Monitoring: Add metrics for normalized records, failed sanitizations, and AI request latencies.
- Rate-limiting & caching: Cache normalized market series to reduce external API hits and implement rate limits for public market endpoints.
- Testing: Unit tests for normalization logic and integration tests for transaction atomicity are high priority.

---

## Contributing & Support

- Follow the project contribution guidelines, write tests for new logic, and keep changes small and focused.
- Open issues or PRs to `https://github.com/your-org/SeedSandbox-BE`.

---

**SeedSandbox Server** — Production-grade financial backend focused on data integrity and reliable analytics. 🎯
