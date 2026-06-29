"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CombinedPoint } from "@/lib/schemas/forecast";

type Props = {
  data: CombinedPoint[];
};

export default function ForecastChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  // Find the last historical index so we can "bridge" the two lines at that point.
  let lastHistIdx = -1;
  for (let i = 0; i < data.length; i++) {
    if (!data[i].isForecast) lastHistIdx = i;
  }

  const chartData = data.map((p, i) => {
    const isBridge = i === lastHistIdx;
    return {
      period: p.period,
      // Historical line: all non-forecast points + the bridge point
      historical: !p.isForecast || isBridge ? p.value : null,
      // Forecast line: all forecast points + the bridge point (creates visual connection)
      forecast: p.isForecast || isBridge ? p.value : null,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={40} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="historical"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="Historical"
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="#f97316"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ r: 3, fill: "#f97316" }}
          name="Forecast"
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
