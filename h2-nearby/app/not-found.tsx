import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-page flex-col justify-center px-6">
      <p className="text-sm font-medium tracking-[0.18em] text-brand">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tightest text-ink">페이지를 찾을 수 없습니다</h1>
      <p className="mt-3 text-sm text-ink-muted">주소를 다시 확인해 주세요.</p>
      <div className="mt-8">
        <Link href="/" className="btn-primary">
          처음으로
        </Link>
      </div>
    </div>
  );
}
