export default function Loading({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-3 rounded-2xl border border-line bg-white px-6 py-10 text-sm text-ink-muted shadow-card"
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand"
      />
      {message}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 animate-pulse rounded-full bg-surface-sunken" />
            <div className="h-4 w-40 animate-pulse rounded bg-surface-sunken" />
            <div className="ml-auto h-4 w-14 animate-pulse rounded bg-surface-sunken" />
          </div>
          <div className="mt-4 h-3 w-3/5 animate-pulse rounded bg-surface-sunken" />
        </div>
      ))}
    </div>
  );
}
