"use client";
import { useState } from "react";
import type { QueryResult } from "@/lib/schemas/analytics";
import type { ForecastResult } from "@/lib/schemas/forecast";

type Props = {
  toolName?: string;
  toolArgs?: unknown;
  toolResult?: unknown;
};

export default function Explainability({ toolName, toolResult }: Props) {
  const [open, setOpen] = useState(false);

  if (!toolName || !toolResult) return null;

  return (
    <div className="border-t border-gray-100 pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        How this was computed
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs">
          {toolName === "query_analytics" && (
            <AnalyticsExplainability result={toolResult as QueryResult} />
          )}
          {toolName === "forecast_demand" && (
            <ForecastExplainability result={toolResult as ForecastResult} />
          )}
        </div>
      )}
    </div>
  );
}

function AnalyticsExplainability({ result }: { result: QueryResult }) {
  const { queryPlan, rows } = result;
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <>
      {/* Query interpretation */}
      <section>
        <h4 className="font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Query interpretation
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
          <span className="text-gray-400">Metric</span>
          <span className="font-mono">{queryPlan.metric}</span>

          <span className="text-gray-400">Dimensions</span>
          <span className="font-mono">
            {queryPlan.dimensions.length ? queryPlan.dimensions.join(", ") : "(none)"}
          </span>

          {queryPlan.granularity && (
            <>
              <span className="text-gray-400">Granularity</span>
              <span className="font-mono">{queryPlan.granularity}</span>
            </>
          )}

          <span className="text-gray-400">Time range</span>
          <span className="font-mono">
            {queryPlan.resolvedTimeRange
              ? `${queryPlan.resolvedTimeRange.from} → ${queryPlan.resolvedTimeRange.to}`
              : "all data"}
          </span>

          {queryPlan.filters.length > 0 && (
            <>
              <span className="text-gray-400">Filters</span>
              <span className="font-mono">
                {queryPlan.filters
                  .map((f) => `${f.field} ${f.op} ${JSON.stringify(f.value)}`)
                  .join(", ")}
              </span>
            </>
          )}
        </div>
      </section>

      {/* SQL */}
      <section>
        <h4 className="font-semibold text-gray-600 mb-2 uppercase tracking-wide">SQL</h4>
        <pre className="bg-white rounded border border-gray-200 p-3 overflow-x-auto text-gray-700 leading-relaxed">
          {queryPlan.sql}
        </pre>
        {queryPlan.params.length > 0 && (
          <p className="mt-1 text-gray-400">
            Params: {JSON.stringify(queryPlan.params)}
          </p>
        )}
      </section>

      {/* Data table */}
      {rows.length > 0 && (
        <section>
          <h4 className="font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Data ({rows.length} {rows.length === 1 ? "row" : "rows"})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-gray-700">
              <thead>
                <tr className="bg-gray-100">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="border border-gray-200 px-3 py-1 text-left font-medium text-gray-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    {columns.map((col) => (
                      <td key={col} className="border border-gray-200 px-3 py-1 font-mono">
                        {String(row[col] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length > 20 && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="border border-gray-200 px-3 py-1 text-center text-gray-400"
                    >
                      … {rows.length - 20} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function ForecastExplainability({ result }: { result: ForecastResult }) {
  const { queryPlan, methodology, inventory, forecast } = result;

  return (
    <>
      {/* Forecast config */}
      <section>
        <h4 className="font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Forecast configuration
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
          <span className="text-gray-400">Target</span>
          <span className="font-mono">{queryPlan.target}</span>

          <span className="text-gray-400">Method requested</span>
          <span className="font-mono">{queryPlan.methodRequested}</span>

          <span className="text-gray-400">Method used</span>
          <span className="font-mono">{queryPlan.methodUsed}</span>

          <span className="text-gray-400">Horizon</span>
          <span className="font-mono">{queryPlan.horizon} months</span>

          <span className="text-gray-400">Historical data</span>
          <span className="font-mono">{queryPlan.historicalPeriods} months</span>
        </div>
      </section>

      {/* Methodology */}
      <section>
        <h4 className="font-semibold text-gray-600 mb-2 uppercase tracking-wide">Methodology</h4>
        <p className="text-gray-600 leading-relaxed">{methodology}</p>
      </section>

      {/* Inventory rationale */}
      <section>
        <h4 className="font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Inventory recommendation rationale
        </h4>
        <p className="text-gray-600 leading-relaxed">{inventory.rationale}</p>
      </section>

      {/* Historical SQL */}
      <section>
        <h4 className="font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Historical data SQL
        </h4>
        <pre className="bg-white rounded border border-gray-200 p-3 overflow-x-auto text-gray-700 leading-relaxed">
          {queryPlan.historicalSql}
        </pre>
      </section>

      {/* Forecast values */}
      <section>
        <h4 className="font-semibold text-gray-600 mb-2 uppercase tracking-wide">
          Forecast values ({forecast.length} months)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-gray-700">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-3 py-1 text-left font-medium text-gray-500">
                  Period
                </th>
                <th className="border border-gray-200 px-3 py-1 text-left font-medium text-gray-500">
                  Forecast (units)
                </th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((p, i) => (
                <tr key={p.period} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-200 px-3 py-1 font-mono">{p.period}</td>
                  <td className="border border-gray-200 px-3 py-1 font-mono">{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
