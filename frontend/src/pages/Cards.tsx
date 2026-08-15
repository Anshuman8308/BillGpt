import { useEffect, useState } from "react";
import Header from "../components/Header";
import { ErrorState } from "../components/EmptyState";
import { ApiError, listCards } from "../services/api";
import type { Card } from "../types";

export default function Cards() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setStatus("loading");
    listCards()
      .then((res) => {
        setCards(res);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load your cards.");
        setStatus("error");
      });
  }

  useEffect(load, []);

  return (
    <div className="min-h-screen bg-surface-gradient flex flex-col">
      <Header showBack />
      <main className="flex-1 px-4 pb-8 w-full max-w-lg mx-auto">
        <h1 className="text-xl font-extrabold text-ink mt-2 mb-1">Your cards</h1>
        <p className="text-sm text-ink/60 mb-4">
          These reward rates power the "best way to pay" recommendation on every search.
        </p>

        {status === "loading" && (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-cream/60 skeleton" />
            ))}
          </div>
        )}

        {status === "error" && <ErrorState message={error || "Something went wrong."} onRetry={load} />}

        {status === "success" && (
          <ul className="space-y-3">
            {cards.map((card) => (
              <li
                key={card.id}
                className="bg-cream rounded-2xl shadow-card p-4 flex items-center justify-between animate-fade-in"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{card.name}</p>
                  <p className="text-xs text-ink/50">{card.issuer}</p>
                </div>
                <span className="text-base font-extrabold text-accent-green">
                  {Math.round(card.reward_rate * 100)}% back
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
