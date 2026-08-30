"use client";

const HIGHLIGHTS = [
  { label: "대기 차량", note: "실시간" },
  { label: "운영 상태", note: "실시간" },
  { label: "직선 거리", note: "가까운 순 5곳" },
];

export default function Hero({
  onStart,
  busy,
}: {
  onStart: () => void;
  busy: boolean;
}) {
  return (
    <section className="mx-auto max-w-page px-6 pb-20 pt-20 sm:pt-28 lg:pb-28">
      <p className="text-sm font-medium tracking-[0.18em] text-brand">수소충전소 찾기</p>

      <h1 className="mt-6 max-w-3xl text-[clamp(2rem,5.5vw,3.5rem)] font-bold leading-[1.15] tracking-tightest text-ink">
        내 주변 가장 가까운
        <br />
        수소충전소를 빠르게 찾아보세요.
      </h1>

      <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
        현재 위치에서 가까운 충전소 5곳을 거리순으로 보여줍니다. 대기 차량과 운영 상태는
        한국석유관리원 공공데이터를 그대로 사용합니다.
      </p>

      <div className="mt-10">
        <button type="button" onClick={onStart} disabled={busy} className="btn-primary w-full sm:w-auto">
          {busy ? "위치를 확인하는 중…" : "서비스 시작"}
        </button>
        <p className="mt-3 text-sm text-ink-faint" role="status" aria-live="polite">
          {busy
            ? "현재 위치를 확인하는 중입니다. 브라우저에서 위치 권한을 허용해 주세요."
            : "시작하면 브라우저가 위치 권한을 요청합니다. 위치는 저장하지 않습니다."}
        </p>
      </div>

      <dl className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <div key={item.label} className="bg-white px-6 py-6">
            <dt className="text-[15px] font-semibold text-ink">{item.label}</dt>
            <dd className="mt-1 text-sm text-ink-faint">{item.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
