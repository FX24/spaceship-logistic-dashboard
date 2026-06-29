"use client";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: { carrier: string; on_time_rate: number; total: number }[];
};

/**
 * Piecewise colour mapping:
 *   ≥ 90 % → green              (hue 95–120)
 *   80–90 % → yellow → green    (hue 50–95)   ← 80% is clearly yellow
 *   50–80 % → amber → yellow    (hue 30–50)
 *   < 50 % → red → amber        (hue 0–30)
 */
function rateToColor(rate: number): string {
  let hue: number;
  if (rate >= 90) {
    hue = 95 + ((rate - 90) / 10) * 25; // 95 → 120
  } else if (rate >= 80) {
    hue = 50 + ((rate - 80) / 10) * 45; // 50 → 95  (80% = yellow)
  } else if (rate >= 50) {
    hue = 30 + ((rate - 50) / 30) * 20; // 30 → 50
  } else {
    hue = (rate / 50) * 30;              // 0 → 30
  }
  return `hsl(${Math.round(hue)}, 75%, 40%)`;
}

export default function CarrierDelayChart({ data }: Props) {
  // 33px per carrier gives enough room for 11px labels with no auto-hiding
  const height = Math.max(240, data.length * 33);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 55, bottom: 5, left: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          unit="%"
          tick={{ fontSize: 11 }}
          domain={[0, 100]}
        />
        <YAxis
          type="category"
          dataKey="carrier"
          tick={{ fontSize: 11 }}
          width={82}
        />
        <Tooltip
          formatter={(value) => [
            `${typeof value === "number" ? value.toFixed(1) : value}%`,
            "On-Time Rate",
          ]}
        />
        <Bar dataKey="on_time_rate" name="On-Time Rate" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={rateToColor(entry.on_time_rate)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
