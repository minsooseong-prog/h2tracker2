export default function RankMarker({
  rank,
  active = false,
}: {
  rank: number;
  active?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`tnum inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
        active ? "bg-brand text-white" : "bg-surface-sunken text-ink"
      }`}
    >
      {rank}
    </span>
  );
}
