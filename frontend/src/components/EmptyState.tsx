export function EmptyState({ title, subtitle, icon = "🔍" }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 animate-fade-in">
      <span className="text-4xl mb-3" aria-hidden="true">
        {icon}
      </span>
      <p className="text-ink font-semibold">{title}</p>
      {subtitle && <p className="text-ink/60 text-sm mt-1 max-w-xs">{subtitle}</p>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center text-center py-14 px-6 animate-fade-in">
      <span className="text-4xl mb-3" aria-hidden="true">
        ⚠️
      </span>
      <p className="text-ink font-semibold">Something went wrong</p>
      <p className="text-ink/60 text-sm mt-1 max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-5 py-2 rounded-full bg-ink text-cream text-sm font-semibold hover:brightness-110 transition"
        >
          Try again
        </button>
      )}
    </div>
  );
}
