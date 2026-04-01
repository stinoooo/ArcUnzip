type Props = {
  label: string;
  value: string;
};

export function StatCard({ label, value }: Props) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3">
      <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-[#8d9ab5]">
        {label}
      </div>
      <div className="truncate text-sm font-semibold text-[#e8ecf5]">{value}</div>
    </div>
  );
}
