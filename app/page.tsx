import { StationFinder } from "@/components/StationFinder";

export default function HomePage() {
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5">
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            H<sub className="text-[11px]">2</sub> 근처
          </span>
        </div>
      </header>

      <main id="main">
        <StationFinder />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-8 text-[12px] leading-relaxed text-ink-faint">
          <p>
            충전소 정보 출처: 공공데이터포털 · 한국석유관리원 수소충전소 실시간정보 / 운영정보.
            지도: 카카오맵.
          </p>
          <p className="mt-1.5">
            표시된 정보는 API 제공 시점 기준이며 실제 현장 상황과 다를 수 있습니다. 방문 전 충전소에
            확인하시기 바랍니다.
          </p>
        </div>
      </footer>
    </>
  );
}
