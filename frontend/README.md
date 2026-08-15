# Price Comparison App — Frontend

React + Vite + TypeScript frontend for the Price Comparison App. See the
[project root README](../README.md) for full documentation (architecture,
API overview, setup for both frontend and backend together, testing, etc.)
— this file just covers frontend-specific commands.

## Setup

```bash
npm install
cp .env.example .env    # set VITE_API_URL to your backend URL
npm run dev
```

Runs at `http://localhost:5173`. Requires the backend running (see
`../backend/README` via the root README) and `VITE_API_URL` pointing at it.

## Scripts

```bash
npm run dev         # start dev server
npm run build        # typecheck (tsc -b) + production build to dist/
npm run preview      # preview the production build locally
npx tsc --noEmit     # typecheck only, no build output
```

## Structure

```
src/
├── App.tsx, main.tsx      # routes, entry point
├── types/                  # TypeScript types mirroring the backend's Pydantic schemas
├── services/api.ts         # single fetch client (auth header injection, error shaping)
├── state/AuthContext.tsx   # session state, persisted via localStorage
├── hooks/                  # useDebounce, useSpeechRecognition (voice search)
├── components/             # Header, SearchBar, DealCard, BestWayToPayCard,
│                            # LoadingSequence, SkeletonLoader, EmptyState/ErrorState,
│                            # ProtectedRoute
└── pages/                  # Login, Signup, Home, SavedComparisons,
                             # SavedComparisonDetail, Cards
```
