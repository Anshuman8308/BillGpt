import type { Deal } from "../types";

function formatPrice(price: number, currency: string) {
  const symbol = currency === "INR" ? "₹" : currency + " ";
  return `${symbol}${price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function DealCard({ deal, isCheapest }: { deal: Deal; isCheapest: boolean }) {
  return (
    <div
      className={`relative rounded-2xl p-4 shadow-card transition ${
        isCheapest ? "bg-cream ring-2 ring-accent-green" : "bg-cream/95"
      } ${!deal.in_stock ? "opacity-60" : ""}`}
    >
      {isCheapest && (
        <span className="absolute -top-2.5 right-4 bg-accent-green text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-pill">
          CHEAPEST
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide">{deal.source}</p>
          <p className="text-sm font-medium text-ink truncate mt-0.5">{deal.item_name}</p>
          {!deal.in_stock && (
            <span className="inline-block mt-1 text-[11px] font-semibold text-accent-red">
              Out of stock
            </span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-extrabold ${isCheapest ? "text-accent-green" : "text-ink"}`}>
            {formatPrice(deal.price, deal.currency)}
          </p>
          {deal.original_price && deal.original_price > deal.price && (
            <p className="text-xs text-ink/40 line-through">
              {formatPrice(deal.original_price, deal.currency)}
            </p>
          )}
          {deal.discount_percent ? (
            <p className="text-[11px] font-semibold text-accent-green">
              {Math.round(deal.discount_percent)}% off
            </p>
          ) : null}
        </div>
      </div>
      {deal.url && (
        <a
          href={deal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs font-semibold text-ink/60 underline underline-offset-2 hover:text-ink"
        >
          View on {deal.source}
        </a>
      )}
    </div>
  );
}
