import type { BestWayToPay, PriceDrop } from "../types";

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function BestWayToPayCard({ pay }: { pay: BestWayToPay }) {
  return (
    <div className="bg-ink rounded-2xl p-4 text-cream shadow-card animate-fade-in">
      <p className="text-[11px] font-bold uppercase tracking-wide text-cream/60">Best way to pay</p>
      <div className="flex items-baseline justify-between mt-1.5">
        <div>
          <p className="text-sm font-semibold">
            {pay.source}
            {pay.card_name ? (
              <>
                {" "}
                + <span className="text-yellow-300">{pay.card_name}</span>
              </>
            ) : (
              " · no card needed"
            )}
          </p>
        </div>
        <p className="text-xl font-extrabold">{formatPrice(pay.effective_price)}</p>
      </div>
      <p className="text-xs text-cream/70 mt-2 leading-relaxed">{pay.reason}</p>
    </div>
  );
}

export function PriceDropBadge({ drop }: { drop: PriceDrop }) {
  if (drop.status === "no_history") return null;

  const styles: Record<string, string> = {
    cheaper: "bg-accent-green/15 text-accent-green",
    increased: "bg-accent-red/15 text-accent-red",
    same: "bg-ink/10 text-ink/60",
  };

  const icon = drop.status === "cheaper" ? "↓" : drop.status === "increased" ? "↑" : "•";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${styles[drop.status]}`}
    >
      <span>{icon}</span>
      <span>{drop.message}</span>
    </div>
  );
}
