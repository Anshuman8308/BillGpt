import { useCallback, useRef, useState } from "react";
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import LoadingSequence from "../components/LoadingSequence";
import DealCard from "../components/DealCard";
import { DealChipSkeleton } from "../components/SkeletonLoader";
import { BestWayToPayCard, PriceDropBadge } from "../components/BestWayToPayCard";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { ApiError, saveComparison, searchDeals } from "../services/api";
import type { SearchResponse } from "../types";

const QUICK_ACTIONS = [
  { label: "Buy Groceries", emoji: "🛍️", query: "groceries", phrasing: "I want to buy groceries" },
  { label: "Cut My Bills", emoji: "📃", query: "electricity bill", phrasing: "I want to cut my electricity bill" },
  { label: "Flight deals", emoji: "✈️", query: "flight", phrasing: "Find me flight deals" },
  { label: "Offers Near Me", emoji: "📍", query: "mobile bill", phrasing: "I want to cut my mobile bill" },
];

function bubbleTextFor(query: string): string {
  const match = QUICK_ACTIONS.find((a) => a.query === query);
  if (match) return match.phrasing;
  return `Find me the best deal on ${query}`;
}

const MIN_LOADING_DISPLAY_MS = 1300;

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "empty">("idle");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const lastSearchedRef = useRef<string>("");
  const isVoiceActiveRef = useRef(false);

  const runSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    lastSearchedRef.current = trimmed;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestId = ++requestIdRef.current;
    const startedAt = Date.now();

    setActiveQuery(trimmed);
    setStatus("loading");
    setSaveState("idle");
    setErrorMessage(null);

    async function settleNoEarlierThanMinDisplay() {
      const elapsed = Date.now() - startedAt;
      const remaining = MIN_LOADING_DISPLAY_MS - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
    }

    try {
      const res = await searchDeals(trimmed, controller.signal);
      await settleNoEarlierThanMinDisplay();
      if (requestIdRef.current !== requestId) return;
      setResult(res);
      setStatus(res.deals.length === 0 ? "empty" : "success");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await settleNoEarlierThanMinDisplay();
      if (requestIdRef.current !== requestId) return;
      setErrorMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }, []);

  function handleExplicitSearch(query: string) {
    setInputValue(query);
    runSearch(query);
  }

  function handleListeningChange(listening: boolean) {
    isVoiceActiveRef.current = listening;
  }

  async function handleSave() {
    if (!result?.cheapest || !result.best_way_to_pay) return;
    setSaveState("saving");

    try {
      await saveComparison({
        query: result.query,
        deals: result.deals,
        cheapest_deal: result.cheapest,
        best_way_to_pay: result.best_way_to_pay,
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  const showGreeting = status === "idle";

  return (
    <div className="min-h-screen bg-surface-gradient flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col px-4 pb-4 overflow-y-auto w-full max-w-lg mx-auto">
        {showGreeting && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-200 to-surface-dark shadow-card mb-5" />
            <p className="text-ink/70 text-sm">Hey there,</p>
            <h1 className="text-2xl font-extrabold text-ink mt-1 max-w-xs">
              What do you want to save on today?
            </h1>

            <div className="grid grid-cols-1 gap-2.5 mt-7 w-full max-w-xs">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleExplicitSearch(action.query)}
                  className="flex items-center gap-2 bg-cream rounded-full px-4 py-3 text-sm font-semibold text-ink shadow-pill hover:brightness-95 active:scale-[0.98] transition"
                >
                  <span aria-hidden="true">{action.emoji}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!showGreeting && (
          <div className="flex-1 flex flex-col gap-4 pt-2">
            <div className="flex justify-end">
              <div className="bg-white rounded-3xl rounded-tr-md px-4 py-2.5 shadow-card max-w-[80%] text-sm font-medium text-ink animate-fade-in">
                {activeQuery ? bubbleTextFor(activeQuery) : ""}
              </div>
            </div>

            {status === "loading" && (
              <div className="flex flex-col gap-3">
                <LoadingSequence />
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  <DealChipSkeleton />
                  <DealChipSkeleton />
                  <DealChipSkeleton />
                </div>
              </div>
            )}

            {status === "error" && (
              <ErrorState
                message={errorMessage || "Something went wrong."}
                onRetry={() => activeQuery && runSearch(activeQuery)}
              />
            )}

            {status === "empty" && (
              <EmptyState
                title="No deals found."
                subtitle={`We couldn't find anything for "${activeQuery}". Try a different search.`}
              />
            )}

            {status === "success" && result && (
              <div className="flex flex-col gap-4 animate-fade-in">
                {result.failed_sources.length > 0 && (
                  <p className="text-xs text-ink/70 bg-cream/80 rounded-xl px-3 py-2">
                    {result.failed_sources.join(", ")}{" "}
                    {result.failed_sources.length === 1 ? "was" : "were"} temporarily unavailable — showing results from the other sources.
                  </p>
                )}

                {result.price_drop && <PriceDropBadge drop={result.price_drop} />}

                <div className="flex flex-col gap-3">
                  {result.deals.map((deal, i) => (
                    <DealCard
                      key={`${deal.source}-${i}`}
                      deal={deal}
                      isCheapest={
                        result.cheapest?.source === deal.source &&
                        result.cheapest?.price === deal.price
                      }
                    />
                  ))}
                </div>

                {result.best_way_to_pay && (
                  <BestWayToPayCard pay={result.best_way_to_pay} />
                )}

                <button
                  onClick={handleSave}
                  disabled={saveState === "saving" || saveState === "saved"}
                  className="w-full rounded-full bg-ink text-cream font-semibold py-3 text-sm shadow-card disabled:opacity-70 hover:brightness-110 transition"
                >
                  {saveState === "saving"
                    ? "Saving…"
                    : saveState === "saved"
                    ? "Saved ✓"
                    : saveState === "error"
                    ? "Couldn't save — tap to retry"
                    : "Save this comparison"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="sticky bottom-0 px-4 pb-5 pt-2 bg-gradient-to-t from-surface-dark/90 to-transparent">
        <div className="w-full max-w-lg mx-auto">
          <SearchBar
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleExplicitSearch}
            onListeningChange={handleListeningChange}
            disabled={status === "loading"}
          />
        </div>
      </div>
    </div>
  );
}
