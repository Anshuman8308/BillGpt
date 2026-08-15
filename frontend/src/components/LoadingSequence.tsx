import { useEffect, useState } from "react";

const STAGES = [
  "Analyzing deals",
  "Finding the best ones",
  "Comparing and saving you the most money",
];

export default function LoadingSequence() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setActiveIndex(1), 550),
      setTimeout(() => setActiveIndex(2), 1150),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      role="status"
      aria-label="Searching for deals"
      className="bg-cream rounded-3xl rounded-tl-md shadow-card px-5 py-4 max-w-xs animate-fade-in"
    >
      <ul className="space-y-2.5">
        {STAGES.map((stage, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <li key={stage} className="flex items-center gap-2.5 text-sm">
              <span
                className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                  state === "done"
                    ? "bg-accent-green text-white"
                    : state === "active"
                    ? "border-2 border-ink/40 border-t-ink animate-spin"
                    : "border-2 border-ink/15"
                }`}
              >
                {state === "done" && (
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
                    <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={state === "pending" ? "text-ink/35" : "text-ink"}>{stage}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
