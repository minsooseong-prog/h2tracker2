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
    // 원인은 서버 로그로만 남기고 화면에는 노출하지 않는다.
    console.error("[unhandled]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-5 text-center">
      <h1 className="text-xl font-semibold text-ink">화면을 표시하지 못했습니다</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        일시적인 문제로 보입니다. 아래 버튼을 눌러 다시 시도해 주세요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent-hover"
      >
        다시 시도
      </button>
    </div>
  );
}
