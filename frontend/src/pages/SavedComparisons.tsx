import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { DealCardSkeleton } from "../components/SkeletonLoader";
import { ApiError, deleteComparison, listComparisons } from "../services/api";
import type { SavedComparison } from "../types";

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function SavedComparisons() {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "empty">("loading");
  const [items, setItems] = useState<SavedComparison[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    setStatus("loading");
    listComparisons()
      .then((res) => {
        setItems(res);
        setStatus(res.length === 0 ? "empty" : "success");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load your saved comparisons.");
        setStatus("error");
      });
  }

  useEffect(load, []);

  async function handleDelete(id: string, query: string) {
    setDeletingId(id);
    setDeleteError(null);
  
    const prevItems = items;
    setItems((cur) => cur.filter((c) => c.id !== id));
    try {
      await deleteComparison(id);
      if (prevItems.length === 1) setStatus("empty");
    } catch (err) {
      setItems(prevItems);
      setDeleteError(
        err instanceof ApiError
          ? `Couldn't delete "${query}": ${err.message}`
          : `Couldn't delete "${query}". Please try again.`
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-surface-gradient flex flex-col">
      <Header showBack />
      <main className="flex-1 px-4 pb-8 w-full max-w-lg mx-auto">
        <h1 className="text-xl font-extrabold text-ink mt-2 mb-4">Saved comparisons</h1>

        {deleteError && (
          <p role="alert" className="text-xs font-medium text-accent-red bg-accent-red/10 rounded-lg px-3 py-2 mb-3">
            {deleteError}
          </p>
        )}

        {status === "loading" && (
          <div className="space-y-3" aria-busy="true">
            <DealCardSkeleton />
            <DealCardSkeleton />
            <DealCardSkeleton />
          </div>
        )}

        {status === "error" && <ErrorState message={error || "Something went wrong."} onRetry={load} />}

        {status === "empty" && (
          <EmptyState
            icon="🗂️"
            title="You haven't saved any comparisons yet."
            subtitle="Search for something and tap Save to keep it here."
          />
        )}

        {status === "success" && (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="animate-fade-in">
                <div className="bg-cream rounded-2xl shadow-card p-4">
                  <Link to={`/saved/${item.id}`} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate capitalize">{item.query}</p>
                        <p className="text-xs text-ink/50 mt-0.5">{formatDate(item.created_at)}</p>
                      </div>
                      <p className="text-lg font-extrabold text-accent-green flex-shrink-0">
                        {formatPrice(item.cheapest_deal.price)}
                      </p>
                    </div>
                    <p className="text-xs text-ink/60 mt-2">
                      Cheapest: {item.cheapest_deal.source} · Best pay: {item.best_way_to_pay.source}
                      {item.best_way_to_pay.card_name ? ` + ${item.best_way_to_pay.card_name}` : ""}
                    </p>
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id, item.query)}
                    disabled={deletingId === item.id}
                    aria-label={`Delete comparison for ${item.query}`}
                    className="mt-3 text-xs font-semibold text-accent-red hover:underline disabled:opacity-50"
                  >
                    {deletingId === item.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
