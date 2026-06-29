"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: { carrier: string; delay_rate: number; total: number }[];
};

export default function CarrierDelayChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 50, bottom: 5, left: 65 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          unit="%"
          tick={{ fontSize: 11 }}
          domain={[0, "auto"]}
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
            "Delay Rate",
          ]}
        />
        <Bar dataKey="delay_rate" fill="#f97316" name="Delay Rate" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
