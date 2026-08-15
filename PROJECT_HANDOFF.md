# Project Handoff — Price Comparison App (Full Stack)

This document is written for another coding agent (or developer) picking up this
project with no other context. It describes what exists, what is verified,
and what is not.

---

## 1. Project Purpose

A take-home assignment: a full-stack "Price Comparison App." A signed-in user
searches for something they want to buy (e.g. "groceries"), the backend
queries 3–4 mocked price sources, normalizes the results, highlights the
cheapest deal, and computes a single "best way to pay" recommendation
(cheapest source, or a seeded credit card's reward rate applied to any deal,
whichever is actually cheapest). Users can save comparisons and can only ever
see their own saved data. Frontend: React + Vite + TypeScript, styled to
match provided reference screenshots (yellow surface, cream cards, black
text, chat-style search UI). Backend: FastAPI + SQLAlchemy + Postgres
(SQLite for local dev).

---

## 2. Directory Structure

```
price-compare/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, startup, exception handler
│   │   ├── config.py                # env-driven Settings
│   │   ├── database.py              # SQLAlchemy engine/session/Base
│   │   ├── models.py                # User, Card, SavedComparison, SearchHistory
│   │   ├── schemas.py               # Pydantic request/response models
│   │   ├── security.py              # bcrypt hashing, JWT create/decode
│   │   ├── deps.py                  # get_current_user() auth dependency
│   │   ├── seed.py                  # seeds 5 cards with reward rates
│   │   ├── routers/
│   │   │   ├── auth.py              # /auth/*
│   │   │   ├── search.py            # /search
│   │   │   ├── comparisons.py       # /comparisons/*
│   │   │   └── cards.py             # /cards
│   │   ├── mock_sources/
│   │   │   └── sources.py           # 4 fake vendor "APIs" (Amazon/Flipkart/BigBasket/Myntra)
│   │   └── services/
│   │       ├── normalize.py         # raw source dict -> Deal schema
│   │       ├── best_pay.py          # best-way-to-pay algorithm
│   │       └── price_history.py     # price-drop bonus feature
│   ├── alembic/                     # migrations (env.py wired to app.database.Base)
│   │   └── versions/a39a794f0cea_initial_schema.py   # the one and only migration
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx / App.tsx        # routes
│   │   ├── index.css                 # Tailwind + custom theme (yellow/cream/ink palette)
│   │   ├── types/index.ts            # TS types mirroring backend Pydantic schemas
│   │   ├── services/api.ts           # single fetch client, token handling, 401 event
│   │   ├── state/AuthContext.tsx     # auth provider, session persistence via localStorage
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   └── useSpeechRecognition.ts   # Web Speech API wrapper (voice bonus)
│   │   ├── components/
│   │   │   ├── Header.tsx, SearchBar.tsx, LoadingSequence.tsx, SkeletonLoader.tsx,
│   │   │   │   DealCard.tsx, BestWayToPayCard.tsx (+PriceDropBadge),
│   │   │   │   EmptyState.tsx (+ErrorState), ProtectedRoute.tsx
│   │   └── pages/
│   │       ├── Login.tsx, Signup.tsx, Home.tsx, SavedComparisons.tsx,
│   │       │   SavedComparisonDetail.tsx, Cards.tsx
│   ├── tailwind.config.js, postcss.config.js
│   ├── vite.config.ts, tsconfig*.json
│   ├── package.json / package-lock.json
│   └── .env.example
```

No `README.md` exists at the project root yet. `frontend/README.md` present
in the zip is just the **unedited Vite scaffold default** — it has not been
replaced with real project documentation. That is still outstanding work.

There is **no test suite** (no `tests/` directory, no pytest/vitest/jest
files anywhere). All verification so far was manual (see §7).

---

## 3. Frontend Stack & Architecture

- React 19 + TypeScript, built with Vite, routed with `react-router-dom` (client-side `BrowserRouter`).
- Styling: Tailwind CSS v3, custom theme colors (`surface`, `cream`, `ink`, `accent.green/red`) defined in `tailwind.config.js` to match the reference screenshots.
- State: no Redux/Zustand — just React Context (`AuthContext`) for auth, and local `useState` per page for search/loading/results. No global client-side cache library (no React Query).
- API access is centralized in `src/services/api.ts` — a single `request<T>()` wrapper that injects the `Authorization: Bearer <token>` header, parses backend error shapes into a typed `ApiError`, and dispatches a custom `window` event (`price-compare:unauthorized`) on any 401 (except from the login/register endpoints themselves) so `AuthContext` can react globally and force a redirect to `/login`.
- Auth token stored in `localStorage` under key `price_compare_token` (this is a real deployed app, not a Claude Artifact, so `localStorage` is appropriate here — not subject to the artifact-sandbox restriction).

---

## 4. Backend Stack & Architecture

- FastAPI + SQLAlchemy 2.0 (declarative), Pydantic v2 schemas.
- DB: defaults to local SQLite (`sqlite:///./price_compare.db`) via `DATABASE_URL` env var; swap to Postgres by setting `DATABASE_URL=postgresql://...` — `psycopg2-binary` is already in requirements.txt.
- Auth: JWT (HS256, `python-jose`), passwords hashed with bcrypt (`passlib`). No refresh-token rotation implemented — access tokens are single, long-lived (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 60), decoded on every request via `deps.get_current_user`.
- On startup (`main.py` `@app.on_event("startup")`): `Base.metadata.create_all()` runs (idempotent, in addition to Alembic) and `seed.seed()` seeds/upserts the 5 reward cards. This means the app works out of the box even if Alembic was never run, but Alembic is the "real" migration path per the assignment's requirement to use migrations rather than ad hoc table creation.
- CORS origins are configured via `CORS_ORIGINS` env var (comma-separated).

### 4.1 Database Schema

- **users**: `id` (UUID str, PK), `email` (unique, indexed), `hashed_password`, `created_at`
- **cards**: `id`, `name` (unique), `issuer`, `reward_rate` (float, e.g. 0.05 = 5%), `is_active`
- **saved_comparisons**: `id`, `user_id` (FK → users, indexed), `query`, `created_at`, `deals` (JSON array of Deal objects), `cheapest_deal` (JSON), `best_way_to_pay` (JSON)
- **search_history**: `id`, `user_id` (FK, indexed), `normalized_query` (indexed), `lowest_price`, `source`, `checked_at` — powers the price-drop bonus feature; one row is appended per search (not upserted), most recent is queried via `ORDER BY checked_at DESC LIMIT 1`.

---

## 5. Backend API Reference

All routes except `/health`, `/auth/register`, `/auth/login` require
`Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Liveness check, returns `{"status": "ok"}` |
| POST | `/auth/register` | No | Body: `{email, password}` (password min 8 chars). Returns `{access_token, token_type, user}`. 400 if email already registered, 422 on validation failure. |
| POST | `/auth/login` | No | Body: `{email, password}`. Returns same shape as register. 401 on bad credentials. |
| POST | `/auth/logout` | Yes | Stateless (JWT) — just returns `{"detail": "Logged out."}`; actual logout is client discarding the token. |
| GET | `/auth/me` | Yes | Returns current `UserOut`. Used by frontend on load to validate a stored token. |
| GET | `/search?q=...` | Yes | Core search endpoint. See §6 for full behavior. |
| POST | `/comparisons` | Yes | Body: `SavedComparisonCreate` (`query`, `deals[]`, `cheapest_deal`, `best_way_to_pay`). Saves under the current user. Returns 201 + the created record. |
| GET | `/comparisons` | Yes | Lists **only** the current user's comparisons, newest first. |
| GET | `/comparisons/{id}` | Yes | Returns one comparison **iff** it belongs to the current user; otherwise 404 (deliberately not 403, to avoid confirming the ID exists for someone else). |
| DELETE | `/comparisons/{id}` | Yes | Same ownership check as GET; 204 on success, 404 if not owned/not found. |
| GET | `/cards` | Yes | Lists active seeded reward cards (id, name, issuer, reward_rate). |

### Request/response schemas
See `backend/app/schemas.py` for the authoritative Pydantic definitions
(`Deal`, `BestWayToPay`, `PriceDrop`, `SearchResponse`,
`SavedComparisonCreate`/`Out`, `CardOut`, `Token`, `UserOut`, etc.). The
frontend's `src/types/index.ts` mirrors these by hand (not code-generated) —
if you change one, update the other.

---

## 6. Key Business Logic

### 6.1 Search aggregation & normalization
`routers/search.py` calls all 4 functions in `mock_sources/sources.py`
(`ALL_SOURCES` dict: Amazon, Flipkart, BigBasket, Myntra) in a loop. Each mock
function:
- Returns a **differently-shaped raw dict** per vendor (e.g. Amazon uses
  `listing_price`/`mrp`, Flipkart uses `sale_price`/`list_price`, BigBasket
  returns price as a string like `"INR 996"`, Myntra sometimes returns
  `price: None` to simulate malformed data).
- Has a random chance of raising `ConnectionError` to simulate an outage
  (5% for Amazon/Flipkart/BigBasket, 15% for Myntra) — proves partial-failure
  resilience.
- Base price is derived from keyword matching against `BASE_PRICES` dict
  (groceries, milk, flight, netflix, etc.) or a deterministic hash-based
  fallback for unrecognized queries, then randomized ±.

Each source's raw dict is passed through its matching function in
`services/normalize.py` (`NORMALIZERS` dict) to produce a common `Deal`
Pydantic object. Normalizers raise `SourceDataError` on unusable data (e.g.
Myntra's `price: None` case), which the router catches alongside
`ConnectionError` — **a failing/malformed source is added to
`failed_sources[]` in the response and does not crash the request or block
the other sources.** If ALL sources fail, `deals: []` is returned with
`cheapest: null` and `best_way_to_pay: null` (frontend shows an empty state).

### 6.2 Cheapest-deal calculation
`min()` over in-stock deals by `price`, done in the router after normalization.

### 6.3 Best-way-to-pay calculation
`services/best_pay.py` — **not** just "cheapest deal + best card on that
deal." It checks the effective price of **every (deal × active card)**
combination against the plain cheapest price, so a slightly pricier source
can still win if a card's reward rate makes its effective price lower than
the plain cheapest deal. Returns a `BestWayToPay` with a human-readable
`reason` string explaining the math (e.g. "Pay 980 at Flipkart with your
HDFC Regalia (5% back) for an effective cost of 931 — 49 cheaper than the
plain cheapest option..."). Falls back to "cheapest source, no card" if no
card beats it.

### 6.4 Save/list/get/delete comparisons
Ownership is enforced **at the query level** in every read/delete
(`.filter(SavedComparison.user_id == current_user.id)` combined with the
`id` filter in the same query) — never fetched first and checked in Python.
Verified live: a second test user (`userB`) requesting a comparison created
by a first test user (`userA`) got a `404`, not the record.

### 6.5 Price-drop feature
`services/price_history.py`. On every search, the query string is normalized
(lowercased, punctuation stripped, whitespace collapsed) and looked up
against `search_history` for that user's most recent entry with the same
normalized query. Compares `previous.lowest_price` to the new cheapest price
with a ±0.5 tolerance band for "no change." Then **always appends** a new
`search_history` row (not an upsert) — so history is a full log, and "most
recent" is determined by `ORDER BY checked_at DESC`. Verified live: a second
identical search correctly reported "₹X cheaper than your previous check."

### 6.6 Mock source behavior summary
See §6.1. Important: these are **intentionally imperfect** —
different shapes, different discount handling, and injected random failures
— by design, to exercise the normalization and partial-failure requirements
in the assignment. This is not a bug.

---

## 7. Frontend Details

### 7.1 Pages/routes
- `/login`, `/signup` — public, redirect to `/` on success
- `/` (Home) — protected. Chat-style search UI matching the reference
  screenshots: greeting + 4 quick-action chips when idle; on search, shows a
  user message bubble, a 3-stage `LoadingSequence` (Analyzing deals → Finding
  the best ones → Comparing and saving you the most money, matching the
  screenshot text exactly), then results (deal cards, cheapest badge,
  price-drop badge, best-way-to-pay panel, Save button).
- `/saved` — protected, list of the user's saved comparisons with delete
  (optimistic removal, rolls back on failure).
- `/saved/:id` — protected, detail view of one saved comparison.
- `/cards` — protected, lists the seeded reward cards ("Your cards" button
  in the header, matching the screenshot).
- `*` — redirects to `/`.

### 7.2 Auth/session flow
`AuthContext` checks `localStorage` for a token on mount; if present, calls
`GET /auth/me` to validate it before marking the session `authenticated`
(handles expired/invalid tokens gracefully — falls back to
`unauthenticated`, no crash). `ProtectedRoute` shows a spinner while
`status === "loading"`, redirects to `/login` (preserving the attempted
route via router state) when `unauthenticated`. Any 401 from any API call
anywhere in the app fires the global `price-compare:unauthorized` event,
which `AuthContext` listens for to force logout + show a "session expired"
message on the login page — this was a deliberate design choice so a token
expiring mid-session doesn't just silently fail requests.

### 7.3 State management
No global store. `AuthContext` for auth only. Each page owns its own
fetch/loading/error state locally via `useState`. `Home.tsx` is the most
complex: manages `inputValue`, `activeQuery`, a `status` state machine
(`idle | loading | success | error | empty`), an `AbortController` ref, and
a monotonically increasing `requestId` ref to discard stale/out-of-order
responses.

### 7.4 Loading/error/empty states
Implemented on every data-fetching page (Home, SavedComparisons,
SavedComparisonDetail, Cards): skeleton loaders during fetch, `ErrorState`
component with a retry button on failure, `EmptyState` component for "no
results"/"no saved comparisons yet." Home also surfaces
`failed_sources` from the search response as a small non-blocking banner
("BigBasket was temporarily unavailable — showing results from the other
sources") rather than treating partial failure as an error.

### 7.5 Responsive behavior
Built mobile-first (max-width containers, `flex flex-col`, sticky bottom
search bar) per the reference screenshots, which are mobile screens. Uses
Tailwind's default breakpoints implicitly but **no explicit desktop/tablet
layout variants (`md:`/`lg:` classes) were added** — the app will render
usably on desktop (centered narrow column, nothing broken) but has not been
visually differentiated for wider viewports. This is a known gap, not a
tested-and-passed responsive design — see §9.

---

## 8. Bonus Features

1. **Voice input** — `hooks/useSpeechRecognition.ts` wraps the Web Speech
   API (`SpeechRecognition`/`webkitSpeechRecognition`) with manual TS
   ambient types (not in default DOM lib). `SearchBar.tsx` shows a mic
   button that starts/stops listening, streams interim transcript into the
   controlled input live, and **auto-submits the search** when listening
   stops with a non-empty transcript. Gracefully degrades: if the API isn't
   present (`isSupported === false`), clicking mic shows an inline error
   message instead of throwing; voice is never required to search.
2. **Price-drop indicator** — backend-driven, see §6.5. Rendered via
   `PriceDropBadge` (green ↓ / red ↑ / neutral · ), hidden entirely on
   `status === "no_history"` (first-ever search for that query).
3. **Skeleton loaders + optimistic UI** — `SkeletonLoader.tsx` (chip and
   card variants) used during search and on the saved-comparisons list.
   `LoadingSequence.tsx` is a self-contained timed 3-stage indicator (not
   driven by real backend progress — the backend responds in one shot, so
   this is a UX-only staged reveal, matching the screenshot's visual
   language). Delete-comparison is genuinely optimistic (row removed from
   UI immediately, rolled back on API failure).
4. **Debounced + cancellable search** — `Home.tsx`: typing debounces 550ms
   before auto-searching (only fires for queries ≥3 chars); every search
   call aborts the previous in-flight request via `AbortController`; a
   `requestId` ref guards against a slow earlier response overwriting a
   newer one even in the (unlikely) case abort doesn't land before the
   response resolves. Explicit form submit / quick-action-chip clicks bypass
   the debounce and search immediately.

---

## 9. Current Status — Be Precise About This

**This section was updated after a subsequent QA pass** (source-level audit,
real bug fixes, a full pytest suite added, README written). See §11 for what
changed since the original handoff.

### Verified (actually run and observed, not just read)
- Backend installs and boots cleanly (`uvicorn app.main:app`), `/health` returns 200.
- Alembic migration generated via `--autogenerate` and applied successfully against SQLite.
- **44 automated pytest tests** (`backend/tests/`), run via FastAPI's `TestClient`
  against an isolated in-memory SQLite DB, passing consistently across
  multiple repeated runs (no flakiness) — auth, search/normalization,
  partial-source-failure and malformed-data handling, best-way-to-pay math
  (independently cross-checked via brute-force comparison inside the test),
  ownership isolation (two real users, confirmed 404 not 403), price-drop
  tracking (all four states + per-user isolation + query normalization).
- Full auth flow additionally tested live via `curl`: register, login, `/auth/me`.
- Ownership enforcement additionally tested live with two real registered users.
- Price-drop additionally tested live via repeated `curl` searches.
- Actual search response latency measured live: ~35ms (informed a real bug fix — see §11).
- Frontend: `npx tsc --noEmit` passes with zero errors. `npm run build` succeeds.

### NOT verified — inspected in code only
- **No browser/E2E testing was ever performed**, in either QA pass. A real
  Chromium binary is not obtainable in this sandbox — Playwright's browser
  download is blocked by network restrictions, and Ubuntu's `chromium`
  apt package is a snap-only stub with no working binary (confirmed by
  attempting the install). Visual layout, animation feel, actual click
  interactions, and the mic permission prompt flow have only been reasoned
  about from source/Tailwind classes, never observed rendering.
- Login/Signup/SavedComparisons/Cards pages were read line-by-line for
  logic bugs but never exercised against a running frontend+backend pair
  together in a browser.

### Known issues / gaps (as of this update)
- No per-user card selection — see §11, unchanged design decision, now
  documented explicitly in the root README's "Known Assumptions" section.
- No refresh-token flow — unchanged, documented in README.
- No explicit `md:`/`lg:` Tailwind breakpoint variants — pages now have a
  `max-w-lg mx-auto` wrapper (added in this QA pass) so content doesn't
  stretch unreasonably wide on desktop, but there is still no distinct
  wide-screen layout redesign.
- Deployment has not been attempted from within this environment.

## 11. Changes Made In This QA Pass (chronological, for anyone diffing)

**Real bugs found and fixed:**
1. **Debounce/voice duplicate-search bug** (`Home.tsx`, `SearchBar.tsx`):
   quick-action clicks and voice input both wrote into `inputValue`, which
   also fed the debounced-search effect — causing a duplicate search ~550ms
   after every quick-action click or voice submission. Voice's live interim
   transcript could also trigger a premature search on an incomplete
   sentence if the speaker paused mid-thought. Fixed via a
   `lastSearchedRef` (skip debounce if the exact query was just searched)
   and an `isVoiceActiveRef` (suspend debounce entirely while listening).
2. **Silent delete failures** (`SavedComparisons.tsx`,
   `SavedComparisonDetail.tsx`): the optimistic-UI delete rolled back on
   API failure but showed the user no error message at all. Added visible
   error messaging on both pages.
3. **No cleanup / poor error differentiation in voice search**
   (`useSpeechRecognition.ts`): recognition session wasn't stopped on
   unmount (resource leak risk); all recognition errors (including the
   benign "no speech detected") showed the same alarming message, and mic
   permission denial wasn't distinguished from a generic failure. Fixed all
   three.
4. **Hamburger menu had no dismiss affordance** (`Header.tsx`): could only
   be closed by clicking a menu item, not by clicking outside or pressing
   Escape. Added both.
5. **Loading animation was invisible in practice** (`Home.tsx`): the
   reference-screenshot-matching 3-stage `LoadingSequence` takes ~1.15s to
   animate, but real backend search latency was measured live at ~35ms —
   meaning the staged loading UI would be replaced by results almost
   instantly and effectively never be seen. Added a minimum-loading-display
   floor (1.3s) that pads only when the real response is faster, never adds
   latency beyond genuinely slow responses, and correctly respects
   cancellation/staleness for superseded searches.
6. **Awkward chat-bubble phrasing**: quick actions like "Flight deals" or
   "Cut My Bills" produced "I want to buy flight" / "I want to buy
   electricity bill". Now phrased per action.
7. **`@app.on_event("startup")` deprecation** (`main.py`): migrated to the
   modern `lifespan` context manager.
8. Desktop layout: added a `max-w-lg mx-auto` content wrapper to Home,
   SavedComparisons, SavedComparisonDetail, Cards, and Header, so content
   doesn't stretch unreasonably wide on desktop viewports (previously
   unbounded).

**Test-writing mistakes caught and corrected while building the pytest
suite** (documented in case they cause confusion diffing test history):
using the real random mock sources instead of deterministic fakes made two
tests flaky; incorrect manual arithmetic in two best-way-to-pay test
assertions was corrected against independently-computed expected values.

**Added:**
- `backend/tests/` — 44 pytest tests (see §10 for how to run).
- `backend/requirements-dev.txt` — pytest, httpx (test-only deps).
- Root `README.md` — full project documentation.
- `frontend/README.md` — replaced the default Vite template with a short
  frontend-specific pointer to the root README plus script reference.

**Confirmed NOT changed:** no rewrites of working backend business logic
(normalize.py, best_pay.py, price_history.py, the routers) — every change
listed above is either a genuine bug fix, a test, or documentation.

---

## 10. How to Run

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # edit JWT_SECRET before any real deployment
alembic upgrade head              # applies the existing migration
uvicorn app.main:app --reload --port 8000
```
Runs on `http://localhost:8000`. `/health` should return `{"status":"ok"}`.
Cards are auto-seeded on startup regardless of whether you ran Alembic
(`app/main.py` calls `seed.seed()` on the `startup` event).

### Frontend
```bash
cd frontend
npm install
cp .env.example .env              # VITE_API_URL=http://localhost:8000
npm run dev
```
Runs on `http://localhost:5173`.

### Build/typecheck (already verified passing)
```bash
cd frontend
npx tsc --noEmit
npm run build
```

### Required environment variables
**Backend** (`backend/.env`):
- `DATABASE_URL` — defaults to local SQLite if unset; set to a Postgres URL for production.
- `JWT_SECRET` — **must** be changed from the placeholder before any real deployment.
- `ACCESS_TOKEN_EXPIRE_MINUTES` — optional, defaults to 60.
- `CORS_ORIGINS` — comma-separated list of allowed frontend origins.
- `ENV` — informational only, defaults to `development`.

**Frontend** (`frontend/.env`):
- `VITE_API_URL` — base URL of the backend, e.g. `http://localhost:8000` locally.

### Regenerating the migration (only if models.py changes)
```bash
cd backend
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

---

## 11. Suggested Next Steps (in priority order)

1. Write the real root `README.md` (and replace `frontend/README.md`) per
   the assignment's documentation checklist.
2. Actually run the frontend and backend together and click through every
   flow in a real browser — this has never been done. Fix whatever breaks.
3. Add explicit responsive (`md:`/`lg:`) styles and verify at the specific
   breakpoints the assignment calls out (375/390/414/tablet/desktop).
4. Decide whether "Your cards" needs to become an actual per-user card
   selector (currently all seeded cards are considered for every user), and
   implement if the assignment requires it.
5. Add a minimal automated test pass (at least a few backend pytest cases
   for auth/ownership/best-pay, since none exist yet) if time allows.
6. Deploy (Postgres → Render backend → Vercel frontend → wire CORS) per the
   steps already discussed separately with the project owner.
