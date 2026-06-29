type Props = {
  title: string;
  value: string;
  sub?: string;
  variant?: "default" | "warn" | "good";
};

const VARIANT_STYLES: Record<NonNullable<Props["variant"]>, string> = {
  default: "border-gray-200 bg-white",
  warn: "border-orange-200 bg-orange-50",
  good: "border-green-200 bg-green-50",
};

const VALUE_STYLES: Record<NonNullable<Props["variant"]>, string> = {
  default: "text-gray-900",
  warn: "text-orange-700",
  good: "text-green-700",
};

export default function KpiCard({ title, value, sub, variant = "default" }: Props) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${VARIANT_STYLES[variant]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${VALUE_STYLES[variant]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}
