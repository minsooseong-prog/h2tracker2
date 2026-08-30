interface ChargerGaugeProps {
  total: number;
  available: number | null;
  inUse: number | null;
}

/**
 * 충전기 대수를 칸으로 나눠 보여주는 게이지.
 * 충전소 계기판에서 따온 표현으로, 숫자를 읽지 않아도 여유가 한눈에 들어온다.
 * total 이 없으면 렌더링하지 않는다. (없는 칸을 만들어내지 않는다)
 */
export function ChargerGauge({ total, available, inUse }: ChargerGaugeProps) {
  if (total <= 0 || total > 24) return null;

  // 사용 가능 대수를 우선하고, 없으면 사용 중 대수로부터 역산한다.
  const availableCount =
    available !== null ? Math.min(available, total) : inUse !== null ? Math.max(total - inUse, 0) : null;

  if (availableCount === null) return null;

  const description = `충전기 ${total}대 중 ${availableCount}대 사용 가능`;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex gap-[3px]" role="img" aria-label={description}>
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={`h-3.5 w-2 rounded-[2px] ${
              index < availableCount ? "bg-accent" : "bg-line-strong"
            }`}
          />
        ))}
      </div>
      <span className="tnum text-[13px] text-ink-muted">
        <span className="font-semibold text-ink">{availableCount}</span>
        <span className="text-ink-faint"> / {total}대 사용 가능</span>
      </span>
    </div>
  );
}
