/** Shared money formatters + a dark-themed Recharts tooltip. */

export const inr = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;

/** Compact currency: ₹1.25L / ₹54K / ₹920. */
export const short = (v: number) =>
  v >= 100000 ? `₹${(v / 100000).toFixed(2)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}K` : `₹${Math.round(v)}`;

interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number;
  color?: string;
}

/** Drop-in `content` for Recharts <Tooltip>, styled to the dark surface tokens. */
export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line2 bg-surface2 px-3 py-2 text-xs shadow-xl">
      {label != null && <p className="mb-1 font-medium text-ink">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="flex items-center gap-2 text-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="text-ink">{inr(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

/** Legend dots row used above charts. */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-[11.5px] text-muted">
      {items.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/** Palette for category/series charts (matches the prototype). */
export const CHART_COLORS = ['#3fcf8e', '#5aa9f0', '#e8b04b', '#c8f04b', '#9b8bf0', '#f0746e', '#7fd4c0', '#d88a5a'];
