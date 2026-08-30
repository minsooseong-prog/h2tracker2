"use client";

import type { ReactNode } from "react";

/**
 * Loading / Error / Empty 상태를 한 파일에 모아 톤을 일관되게 유지한다.
 * 문구 규칙: 무엇이 일어났는지 먼저 말하고, 다음에 할 수 있는 일을 알려준다.
 * 기술적인 오류 내용은 사용자에게 보여주지 않는다.
 */

export function LoadingState({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="py-8">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-accent"
        />
        <p className="text-sm font-medium text-ink">{message}</p>
      </div>

      <ul className="mt-6 space-y-3" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <li key={index} className="rounded-[14px] border border-line p-4 sm:p-5">
            <div className="flex gap-3">
              <div className="size-7 shrink-0 animate-pulse rounded-full bg-surface-strong" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 w-2/5 animate-pulse rounded bg-surface-strong" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-surface" />
                <div className="h-6 w-1/3 animate-pulse rounded-full bg-surface" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ErrorMessageProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function ErrorMessage({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="rounded-[14px] border border-line bg-surface px-5 py-6 sm:px-6 sm:py-7"
    >
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
        >
          {actionLabel}
        </button>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-dashed border-line-strong px-5 py-10 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
