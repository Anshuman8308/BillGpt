export function DealChipSkeleton() {
  return (
    <div className="flex-shrink-0 w-40 h-16 rounded-2xl bg-cream/70 overflow-hidden relative">
      <div className="skeleton absolute inset-0" />
    </div>
  );
}

export function DealCardSkeleton() {
  return (
    <div className="bg-cream rounded-2xl p-4 shadow-card">
      <div className="h-3 w-24 rounded skeleton mb-3" />
      <div className="h-4 w-40 rounded skeleton mb-2" />
      <div className="h-5 w-20 rounded skeleton" />
    </div>
  );
}

export function DealListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <DealCardSkeleton key={i} />
      ))}
    </div>
  );
}
