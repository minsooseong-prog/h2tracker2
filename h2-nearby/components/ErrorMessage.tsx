import type { ReactNode } from "react";

export default function ErrorMessage({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8"
    >
      <h2 className="text-lg font-semibold tracking-tightest text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="btn-ghost mt-5">
          {actionLabel}
        </button>
      ) : null}
      {children}
    </div>
  );
}
