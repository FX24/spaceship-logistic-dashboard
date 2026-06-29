/**
 * AI orchestration: two-round Claude tool-use loop.
 *
 * Flow:
 *   Round 1  →  Claude picks a tool + fills structured args
 *   Validate →  Zod (inside each tool function)
 *   Execute  →  deterministic query / forecast (never raw AI SQL)
 *   Round 2  →  Claude reads the result and writes the final answer
 *
 * The model is the router only. It never produces numbers from memory.
 */
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS } from "./tools";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { queryAnalytics } from "@/lib/tools/queryAnalytics";
import { forecastDemand } from "@/lib/tools/forecastDemand";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS_ROUND1 = 1024; // tool selection only — no need for long output
const MAX_TOKENS_ROUND2 = 2048; // final prose answer

export type ChatResponse = {
  answer: string;
  toolName?: string;
  toolArgs?: unknown;
  toolResult?: unknown;
  error?: string;
};

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function chat(question: string): Promise<ChatResponse> {
  const client = getClient();

  // -------------------------------------------------------------------------
  // Round 1: let Claude choose a tool and fill its args
  // -------------------------------------------------------------------------
  const round1 = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS_ROUND1,
    system: SYSTEM_PROMPT,
    tools: TOOL_DEFINITIONS,
    messages: [{ role: "user", content: question }],
  });

  // Claude answered without calling a tool — return the text directly
  if (round1.stop_reason !== "tool_use") {
    const textBlock = round1.content.find((b) => b.type === "text");
    return { answer: textBlock?.text ?? "(no response)" };
  }

  const toolUseBlock = round1.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    return {
      answer: "I couldn't determine the right tool for your question.",
      error: "No tool_use block in round 1 response despite stop_reason=tool_use.",
    };
  }

  const toolName = toolUseBlock.name;
  const rawArgs = toolUseBlock.input;

  // -------------------------------------------------------------------------
  // Execute: deterministic computation — Zod validation is inside each tool
  // -------------------------------------------------------------------------
  let toolResult: unknown;
  try {
    if (toolName === "query_analytics") {
      toolResult = queryAnalytics(rawArgs);
    } else if (toolName === "forecast_demand") {
      toolResult = forecastDemand(rawArgs);
    } else {
      return {
        answer: `I tried to use an unsupported tool: "${toolName}". Please rephrase your question.`,
        toolName,
        toolArgs: rawArgs,
        error: `Unknown tool name: ${toolName}`,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      answer: `I ran into an issue computing your answer: ${message}`,
      toolName,
      toolArgs: rawArgs,
      error: message,
    };
  }

  // -------------------------------------------------------------------------
  // Round 2: give Claude the tool result; get the final prose answer
  // -------------------------------------------------------------------------
  const round2 = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS_ROUND2,
    system: SYSTEM_PROMPT,
    tools: TOOL_DEFINITIONS,
    messages: [
      { role: "user", content: question },
      { role: "assistant", content: round1.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUseBlock.id,
            content: JSON.stringify(toolResult),
          },
        ],
      },
    ],
  });

  const finalText = round2.content.find((b) => b.type === "text");

  return {
    answer: finalText?.text ?? "(no response)",
    toolName,
    toolArgs: rawArgs,
    toolResult,
  };
}
