import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import DealCard from "../components/DealCard";
import { BestWayToPayCard } from "../components/BestWayToPayCard";
import { ErrorState } from "../components/EmptyState";
import { DealListSkeleton } from "../components/SkeletonLoader";
import { ApiError, deleteComparison, getComparison } from "../services/api";
import type { SavedComparison } from "../types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SavedComparisonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "not_found">("loading");
  const [item, setItem] = useState<SavedComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load() {
    if (!id) return;
    setStatus("loading");
    getComparison(id)
      .then((res) => {
        setItem(res);
        setStatus("success");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setStatus("not_found");
        } else {
          setError(err instanceof ApiError ? err.message : "Something went wrong.");
          setStatus("error");
        }
      });
  }

  useEffect(load, [id]);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteComparison(id);
      navigate("/saved", { replace: true });
    } catch (err) {
      setDeleting(false);
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete this comparison. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-surface-gradient flex flex-col">
      <Header showBack />
      <main className="flex-1 px-4 pb-8 w-full max-w-lg mx-auto">
        {status === "loading" && (
          <div className="mt-4">
            <DealListSkeleton />
          </div>
        )}

        {status === "error" && <ErrorState message={error || "Something went wrong."} onRetry={load} />}

        {status === "not_found" && (
          <ErrorState message="This comparison doesn't exist or isn't yours to view." />
        )}

        {status === "success" && item && (
          <div className="flex flex-col gap-4 animate-fade-in mt-2">
            <div>
              <h1 className="text-xl font-extrabold text-ink capitalize">{item.query}</h1>
              <p className="text-xs text-ink/50 mt-1">Saved {formatDate(item.created_at)}</p>
            </div>

            <div className="flex flex-col gap-3">
              {item.deals.map((deal, i) => (
                <DealCard
                  key={`${deal.source}-${i}`}
                  deal={deal}
                  isCheapest={item.cheapest_deal.source === deal.source && item.cheapest_deal.price === deal.price}
                />
              ))}
            </div>

            <BestWayToPayCard pay={item.best_way_to_pay} />

            {deleteError && (
              <p role="alert" className="text-xs font-medium text-accent-red bg-accent-red/10 rounded-lg px-3 py-2">
                {deleteError}
              </p>
            )}

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full rounded-full bg-accent-red/10 text-accent-red font-semibold py-3 text-sm disabled:opacity-50 hover:bg-accent-red/15 transition"
            >
              {deleting ? "Deleting…" : "Delete this comparison"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
