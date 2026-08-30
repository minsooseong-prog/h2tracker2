"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-page flex-col justify-center px-6">
      <h1 className="text-2xl font-bold tracking-tightest text-ink">문제가 발생했습니다</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
        화면을 표시하는 중 오류가 발생했습니다. 다시 시도해도 같은 문제가 계속되면 잠시 후 접속해 주세요.
      </p>
      <div className="mt-8">
        <button type="button" onClick={reset} className="btn-primary">
          다시 시도
        </button>
      </div>
    </div>
  );
}
