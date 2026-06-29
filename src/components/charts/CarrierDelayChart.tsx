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
 *   ≥ 80 % → green  (hue 95–120)
 *   25–80 % → amber / yellow  (hue 35–95)
 *   < 25 % → red  (hue 0–35)
 */
function rateToColor(rate: number): string {
  let hue: number;
  if (rate >= 80) {
    hue = 95 + ((rate - 80) / 20) * 25; // 95 → 120
  } else if (rate >= 25) {
    hue = 35 + ((rate - 25) / 55) * 60; // 35 → 95
  } else {
    hue = (rate / 25) * 35; // 0 → 35
  }
  return `hsl(${Math.round(hue)}, 68%, 40%)`;
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
