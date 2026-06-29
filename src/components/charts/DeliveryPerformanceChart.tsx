"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: { period: string; delivered: number; delayed: number }[];
};

export default function DeliveryPerformanceChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={30} />
        <Tooltip />
        <Legend />
        <Bar dataKey="delivered" stackId="a" fill="#22c55e" name="Delivered" />
        <Bar dataKey="delayed" stackId="a" fill="#ef4444" name="Delayed" />
      </BarChart>
    </ResponsiveContainer>
  );
}
