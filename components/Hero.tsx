"use client";

interface HeroProps {
  onStart: () => void;
  onSkipToSearch: () => void;
}

export function Hero({ onStart, onSkipToSearch }: HeroProps) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-5 pt-16 pb-14 text-center sm:pt-24 sm:pb-20">
      <p className="text-[13px] font-medium tracking-[0.14em] text-ink-faint uppercase">
        전국 수소충전소 · 실시간 운영 정보
      </p>

      <h1 className="mt-5 text-[30px] leading-[1.28] font-semibold tracking-[-0.02em] text-ink sm:text-[42px] sm:leading-[1.22]">
        내 주변 가장 가까운
        <br />
        수소충전소를 빠르게 찾아보세요.
      </h1>

      <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-muted sm:text-base">
        위치를 확인하면 가장 가까운 충전소 5곳을 거리순으로 보여드립니다. 지금 운영 중인지, 얼마나
        붐비는지도 함께 확인하세요.
      </p>

      <button
        type="button"
        onClick={onStart}
        className="mt-9 w-full max-w-xs rounded-full bg-accent px-8 py-4 text-base font-semibold text-paper transition-colors hover:bg-accent-hover sm:w-auto"
      >
        서비스 시작
      </button>

      <p className="mt-3.5 text-[13px] text-ink-faint">
        위치 정보는 충전소를 찾는 데만 쓰이며 저장하지 않습니다.
      </p>

      <button
        type="button"
        onClick={onSkipToSearch}
        className="mt-6 text-sm font-medium text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
      >
        위치 없이 지역으로 찾기
      </button>

      {/* 데이터 출처를 헤드라인만큼 조용하게, 그러나 분명하게 밝힌다. */}
      <dl className="mt-14 grid w-full grid-cols-3 gap-px overflow-hidden rounded-[14px] border border-line bg-line text-left">
        {[
          { term: "데이터", desc: "한국석유관리원 공공데이터" },
          { term: "표시 기준", desc: "현재 위치 직선거리" },
          { term: "갱신", desc: "조회 시점 실시간" },
        ].map((item) => (
          <div key={item.term} className="bg-paper px-3 py-4 sm:px-5">
            <dt className="text-[12px] text-ink-faint">{item.term}</dt>
            <dd className="mt-1 text-[13px] leading-snug font-medium text-ink">{item.desc}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
