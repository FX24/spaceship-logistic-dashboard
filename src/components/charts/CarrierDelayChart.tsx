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

/** Maps an on-time rate (0–100) to a colour: green at 100%, red at 0%. */
function rateToColor(rate: number): string {
  const hue = Math.round((rate / 100) * 120); // 0 = red, 120 = green
  return `hsl(${hue}, 65%, 42%)`;
}

export default function CarrierDelayChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 60, bottom: 5, left: 65 }}
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
          width={60}
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
