import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-8 text-center">
      <h2 className="text-base font-semibold tracking-tightest text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
