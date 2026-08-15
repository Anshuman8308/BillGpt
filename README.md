# Price Comparison App (Full Stack)

A moderate full-stack app: a signed-in user searches for something they want
to buy, sees normalized prices across mocked sources, gets a single clear
"best way to pay" recommendation (cheapest source, or a card that earns more
back), and can save comparisons for later — visible only to them.

Built with **React + Vite + TypeScript** (frontend) and **FastAPI + Python**
(backend), matching the provided reference screenshots (yellow surface,
cream cards, black text, chat-style search).

---

## Features

**Core**
- Email/password authentication (JWT), protected routes, persistent session
- Search aggregates and normalizes results from 4 mocked sources (Amazon,
  Flipkart, BigBasket, Myntra) — each with a different raw response shape
- Cheapest deal clearly highlighted
- "Best way to pay" — checks every (deal × active seeded card) combination,
  not just the cheapest listed price, and explains the math in plain English
- Save / list / view / delete comparisons, with strict per-user ownership
  enforced at the database query level (not just hidden in the UI)
- Full loading / error / empty states throughout — the UI never goes blank
- Graceful partial-source-failure handling — one broken mock source doesn't
  take down the whole search

**Bonus features**
1. **Voice search** — Web Speech API, with a graceful typed-search fallback
   when unsupported, and clear handling of denied mic permission
2. **Price-drop indicator** — compares today's cheapest price against the
   user's last search for the same query, per-user, persisted in the DB
3. **Skeleton loaders + staged loading UI** — matches the reference
   screenshot's 3-stage "Analyzing deals → Finding the best ones →
   Comparing and saving you the most money" sequence, plus optimistic
   delete on saved comparisons
4. **Debounced + cancellable search** — typing debounces before searching;
   every new search cancels the previous in-flight request and guards
   against a slow, superseded response overwriting a newer result

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Auth | JWT (python-jose), bcrypt password hashing (passlib) |
| Database | PostgreSQL (production) / SQLite (local dev default) |
| Migrations | Alembic |
| Testing | pytest + FastAPI `TestClient` (44 backend tests) |

---

## Architecture

```
Browser (React SPA)
   │  fetch, Bearer token
   ▼
FastAPI backend
   ├── auth/        register, login, logout, me (JWT)
   ├── search/      queries 4 mock sources → normalizes → cheapest + best-pay + price-drop
   ├── comparisons/ save/list/get/delete, ownership enforced per-query
   └── cards/       seeded reward-rate list
   │
   ▼
PostgreSQL / SQLite
   users · cards · saved_comparisons · search_history
```

Business logic lives in `app/services/` (normalization, best-way-to-pay,
price-drop), not in the route handlers — routers stay thin and just
orchestrate. The frontend has no global state library beyond a small
`AuthContext`; each page owns its own fetch/loading/error state locally.

### Ownership & security model
Every read/write to `saved_comparisons` filters by `user_id ==
current_user.id` **inside the SQL query itself**, not as a post-fetch check
in Python. Requesting another user's comparison ID returns `404` (not
`403`), so the API never confirms whether a given ID exists for someone
else. This is covered by dedicated tests — see `backend/tests/test_comparisons.py`.

### Best-way-to-pay algorithm
Not just "cheapest deal + apply a card to it." The service brute-forces
every `(deal × active card)` pair and returns whichever combination yields
the lowest effective price, falling back to the plain cheapest deal if no
card active card improves on it. See `backend/app/services/best_pay.py` and
its accompanying tests for the exact math, including an edge case worked
out and independently cross-checked in `test_search.py`.

---

## Folder Structure

```
price-compare/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, lifespan startup
│   │   ├── config.py                # env-driven settings
│   │   ├── database.py              # SQLAlchemy engine/session
│   │   ├── models.py                # User, Card, SavedComparison, SearchHistory
│   │   ├── schemas.py               # Pydantic request/response models
│   │   ├── security.py              # bcrypt hashing, JWT
│   │   ├── deps.py                  # get_current_user auth dependency
│   │   ├── seed.py                  # seeds reward cards
│   │   ├── routers/                 # auth, search, comparisons, cards
│   │   ├── mock_sources/            # 4 fake vendor "APIs"
│   │   └── services/                # normalize, best_pay, price_history
│   ├── tests/                       # 44 pytest tests (auth, search, ownership, price-drop)
│   ├── alembic/                     # DB migrations
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── requirements-dev.txt         # pytest, httpx (test-only deps)
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx, main.tsx        # routes, entry point
│   │   ├── types/                   # TS types mirroring backend schemas
│   │   ├── services/api.ts          # single fetch client
│   │   ├── state/AuthContext.tsx    # auth/session state
│   │   ├── hooks/                   # useDebounce, useSpeechRecognition
│   │   ├── components/              # Header, SearchBar, DealCard, etc.
│   │   └── pages/                   # Login, Signup, Home, Saved*, Cards
│   ├── package.json, tsconfig*.json, tailwind.config.js
│   └── .env.example
│
└── README.md   ← you are here
```

---

## Setup & Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # change JWT_SECRET before any real deployment
alembic upgrade head              # applies migrations
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. Visit `/health` to confirm it's up
(`{"status":"ok"}`). The app also auto-creates tables and seeds cards on
startup regardless of Alembic, so it works out of the box even on a
completely fresh SQLite file.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env              # VITE_API_URL=http://localhost:8000
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Environment variables

**`backend/.env`**
| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | No | `sqlite:///./price_compare.db` | Set to a Postgres URL for production |
| `JWT_SECRET` | **Yes, before deploying** | placeholder | Must be a long random string in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | |
| `CORS_ORIGINS` | No | `localhost:5173` origins | Comma-separated list |

**`frontend/.env`**
| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | Yes | Base URL of the backend |



---



## API Overview

All endpoints except `/health`, `/auth/register`, `/auth/login` require
`Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/auth/register` | Create account, returns token |
| POST | `/auth/login` | Returns token |
| POST | `/auth/logout` | Stateless — client discards token |
| GET | `/auth/me` | Current user info |
| GET | `/search?q=...` | Aggregated, normalized deals + best-pay + price-drop |
| POST | `/comparisons` | Save a comparison |
| GET | `/comparisons` | List **only your own** saved comparisons |
| GET | `/comparisons/{id}` | Get one (404 if not yours) |
| DELETE | `/comparisons/{id}` | Delete one (404 if not yours) |
| GET | `/cards` | List seeded reward cards |

Full request/response shapes: `backend/app/schemas.py`.

---

## Known Assumptions & Simplifications

- Cards are global and seeded — there's no per-user "which cards do I
  actually own" selection. Every active card is considered for every user's
  best-way-to-pay calculation. The "Your cards" screen displays the seeded
  list for transparency but is read-only.
- No refresh-token rotation — access tokens simply expire after
  `ACCESS_TOKEN_EXPIRE_MINUTES` and the user is routed back to login.
- Mock sources intentionally have randomized prices, occasional simulated
  outages, and occasional malformed data — this is by design, to exercise
  the normalization and partial-failure-handling requirements, not a bug.
- No desktop-specific redesign beyond a centered max-width container — the
  app is mobile-first per the reference screenshots and remains usable, but
  wasn't given a distinct wide-screen layout.

## Deployment

- Frontend: Vercel
- Backend: Render
- Database: Neon PostgreSQL

The frontend communicates with the deployed FastAPI backend through `VITE_API_URL`, and the backend is configured with the deployed frontend origin through `CORS_ORIGINS`.
