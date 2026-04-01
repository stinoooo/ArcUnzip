type Props = {
  title: string;
  subtitle?: string;
};

export function EmptyState({ title, subtitle }: Props) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-3xl border border-dashed border-white/12 bg-white/[0.025] px-6 py-10 text-center text-[#8d9ab5]">
      <div>
        <div className="text-base text-[#e8ecf5]">{title}</div>
        {subtitle ? <div className="mt-2 text-sm">{subtitle}</div> : null}
      </div>
    </div>
  );
}
