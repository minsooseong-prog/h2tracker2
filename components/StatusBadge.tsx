import { CONGESTION_LABEL, OPERATION_STATUS_LABEL } from "@/lib/status";
import type { CongestionLevel, OperationStatus } from "@/types/station";

type Tone = "free" | "normal" | "busy" | "idle" | "accent";

const TONE_CLASS: Record<Tone, string> = {
  free: "bg-accent-soft text-state-free",
  normal: "bg-[#fdf3e3] text-state-normal",
  busy: "bg-[#fdeceb] text-state-busy",
  idle: "bg-surface-strong text-state-idle",
  accent: "bg-accent-soft text-accent",
};

const DOT_CLASS: Record<Tone, string> = {
  free: "bg-state-free",
  normal: "bg-state-normal",
  busy: "bg-state-busy",
  idle: "bg-state-idle",
  accent: "bg-accent",
};

interface BadgeProps {
  tone: Tone;
  label: string;
  /** 점 표시로 상태임을 나타낸다. 정보성 칩에는 쓰지 않는다. */
  withDot?: boolean;
  title?: string;
}

function Badge({ tone, label, withDot = false, title }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] leading-none font-medium ${TONE_CLASS[tone]}`}
      title={title}
    >
      {withDot ? (
        <span aria-hidden="true" className={`size-1.5 rounded-full ${DOT_CLASS[tone]}`} />
      ) : null}
      {label}
    </span>
  );
}

const OPERATION_TONE: Record<OperationStatus, Tone> = {
  OPERATING: "free",
  CLOSED: "idle",
  MAINTENANCE: "busy",
  PREPARING: "normal",
  UNKNOWN: "idle",
};

export function OperationBadge({
  status,
  rawLabel,
}: {
  status: OperationStatus;
  rawLabel: string | null;
}) {
  // 해석에 실패했더라도 API 원문이 있으면 그 문구를 그대로 보여준다.
  const label = status === "UNKNOWN" && rawLabel ? rawLabel : OPERATION_STATUS_LABEL[status];
  return <Badge tone={OPERATION_TONE[status]} label={label} withDot />;
}

const CONGESTION_TONE: Record<CongestionLevel, Tone> = {
  FREE: "free",
  NORMAL: "normal",
  BUSY: "busy",
  UNKNOWN: "idle",
};

export function CongestionBadge({
  level,
  rawLabel,
  derivedFromWaiting,
}: {
  level: CongestionLevel;
  rawLabel: string | null;
  derivedFromWaiting: boolean;
}) {
  if (level === "UNKNOWN") return null;
  const label = rawLabel ?? CONGESTION_LABEL[level];
  return (
    <Badge
      tone={CONGESTION_TONE[level]}
      label={label}
      title={derivedFromWaiting ? "대기 차량 대수를 기준으로 표시한 혼잡도입니다." : undefined}
    />
  );
}

export function InfoChip({ label }: { label: string }) {
  return <Badge tone="idle" label={label} />;
}
