import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-5 text-center">
      <h1 className="text-xl font-semibold text-ink">페이지를 찾을 수 없습니다</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        주소가 바뀌었거나 삭제된 페이지입니다.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent-hover"
      >
        처음 화면으로
      </Link>
    </div>
  );
}
