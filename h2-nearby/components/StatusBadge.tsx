import type { CongestionState } from "@/types/station";

const STYLES: Record<CongestionState["level"], string> = {
  free: "bg-[#E7F4EE] text-status-free",
  normal: "bg-[#FBF1E0] text-status-normal",
  busy: "bg-[#FBEAE7] text-status-busy",
  open: "bg-surface-sunken text-status-neutral",
  maintenance: "bg-surface-sunken text-status-neutral",
  closed: "bg-surface-sunken text-ink-faint",
  unknown: "bg-surface-sunken text-ink-faint",
};

const DOT: Record<CongestionState["level"], string> = {
  free: "bg-status-free",
  normal: "bg-status-normal",
  busy: "bg-status-busy",
  open: "bg-status-neutral",
  maintenance: "bg-status-neutral",
  closed: "bg-ink-faint",
  unknown: "bg-ink-faint",
};

export default function StatusBadge({
  congestion,
  size = "md",
}: {
  congestion: CongestionState;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${STYLES[congestion.level]} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DOT[congestion.level]}`} />
      {congestion.label}
    </span>
  );
}
