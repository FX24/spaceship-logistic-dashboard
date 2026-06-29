"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";
import DynamicChart from "@/components/DynamicChart";
import ForecastChart from "@/components/ForecastChart";
import Explainability from "@/components/Explainability";
import type { QueryResult } from "@/lib/schemas/analytics";
import type { ForecastResult } from "@/lib/schemas/forecast";

type ApiResponse = {
  answer: string;
  toolName?: string;
  toolArgs?: unknown;
  toolResult?: unknown;
  error?: string;
};

type Message = {
  id: number;
  question: string;
  response: ApiResponse;
};

const SAMPLE_QUESTIONS = [
  "Which carrier has the highest delay rate?",
  "Show delayed orders by week for the last 3 months",
  "How many orders were delivered late last month?",
  "Forecast overall demand for the next 3 months",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setInput("");

    let response: ApiResponse;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      response = (await res.json()) as ApiResponse;
    } catch {
      response = {
        answer: "A network error occurred. Please check your connection and try again.",
        error: "Network error",
      };
    }

    setMessages((m) => [...m, { id: Date.now(), question: q, response }]);
    setLoading(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Messages                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
          {/* Welcome / sample questions */}
          {messages.length === 0 && !loading && (
            <div className="py-12 text-center">
              <h2 className="mb-2 text-xl font-semibold text-gray-700">
                Ask about your logistics data
              </h2>
              <p className="mb-8 text-sm text-gray-400">
                The AI interprets your question, runs a deterministic query, and shows
                exactly how the answer was computed.
              </p>
              <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => void ask(q)}
                    className="rounded-lg border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400 [animation-delay:150ms]" />
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400 [animation-delay:300ms]" />
              <span className="ml-1">Analyzing your question…</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Input bar                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about orders, delays, carriers, or forecast demand…"
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            {loading ? "…" : "Ask"}
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-gray-400">
          Powered by Claude claude-sonnet-4-6 · All numbers come from deterministic
          queries on the dataset — the AI never invents figures
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message card — renders one Q→A turn
// ---------------------------------------------------------------------------

function MessageItem({ message }: { message: Message }) {
  const { question, response } = message;
  const isAnalytics = response.toolName === "query_analytics";
  const isForecast = response.toolName === "forecast_demand";
  const analyticsResult = isAnalytics ? (response.toolResult as QueryResult) : null;
  const forecastResult = isForecast ? (response.toolResult as ForecastResult) : null;

  return (
    <div className="space-y-3">
      {/* Question bubble (right-aligned) */}
      <div className="flex justify-end">
        <div className="max-w-lg rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white">
          {question}
        </div>
      </div>

      {/* Answer card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        {/* Answer text */}
        <MarkdownText text={response.answer} />

        {/* Analytics chart */}
        {analyticsResult && analyticsResult.rows.length > 0 && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-medium text-gray-500">
              {analyticsResult.chartSpec.label}
            </p>
            <DynamicChart
              spec={analyticsResult.chartSpec}
              data={analyticsResult.rows}
            />
          </div>
        )}

        {/* No data state */}
        {analyticsResult && analyticsResult.rows.length === 0 && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
            No data matched your query.
          </div>
        )}

        {/* Forecast chart + inventory card */}
        {forecastResult && (
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-medium text-gray-500">
                Demand forecast — {forecastResult.target} (blue = historical, orange dashed = forecast)
              </p>
              <ForecastChart data={forecastResult.combined} />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="mb-2 font-semibold text-amber-800">Inventory Recommendation</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xl font-bold text-amber-700">
                    {forecastResult.inventory.recommendedUnits}
                  </p>
                  <p className="text-xs text-amber-600">units / month</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-amber-700">
                    {forecastResult.inventory.safetyStock}
                  </p>
                  <p className="text-xs text-amber-600">safety stock</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-amber-700">
                    {forecastResult.inventory.forecastTotal}
                  </p>
                  <p className="text-xs text-amber-600">
                    total over {forecastResult.queryPlan.horizon}mo
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error state (when there's an error but no tool result to show) */}
        {response.error && !response.toolResult && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <span className="font-semibold">Error: </span>
            {response.error}
          </div>
        )}

        {/* Explainability panel */}
        {(analyticsResult ?? forecastResult) && (
          <Explainability
            toolName={response.toolName}
            toolArgs={response.toolArgs}
            toolResult={response.toolResult}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown renderer — handles bold, italic, inline code, bullets, numbered lists
// ---------------------------------------------------------------------------

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code key={i} className="rounded bg-gray-100 px-1 font-mono text-xs">
              {part.slice(1, -1)}
            </code>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function MarkdownText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-800">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.length === 0) return null;

        // Bullet list
        if (lines.every((l) => /^[-*] /.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-0.5 pl-5">
              {lines.map((l, j) => (
                <li key={j}>
                  <InlineText text={l.replace(/^[-*] /, "")} />
                </li>
              ))}
            </ul>
          );
        }

        // Numbered list
        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return (
            <ol key={i} className="list-decimal space-y-0.5 pl-5">
              {lines.map((l, j) => (
                <li key={j}>
                  <InlineText text={l.replace(/^\d+\.\s+/, "")} />
                </li>
              ))}
            </ol>
          );
        }

        // Regular paragraph (single newlines become line breaks)
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <InlineText text={l} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
