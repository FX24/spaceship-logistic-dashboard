/**
 * JSON Schema tool definitions for Claude tool-use.
 *
 * Written manually (not via zod-to-json-schema) to keep deps minimal.
 * These must stay in sync with the Zod schemas in lib/schemas/.
 */
import type Anthropic from "@anthropic-ai/sdk";

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "query_analytics",
    description:
      "Run an analytics query against the logistics orders dataset. " +
      "Use this for KPI questions, breakdowns, trends, and comparisons. " +
      "Returns rows, a chart spec, and the resolved query plan for explainability. " +
      "Always call this tool when the user asks about orders, deliveries, delays, carriers, " +
      "routes, or any numeric performance metric.",
    input_schema: {
      type: "object",
      required: ["metric", "dimensions", "filters"],
      properties: {
        metric: {
          type: "string",
          enum: [
            "order_count",
            "delayed_count",
            "delivered_count",
            "delay_rate",
            "on_time_rate",
            "avg_delivery_days",
            "order_value_total",
            "quantity_total",
          ],
          description:
            "Primary metric to compute. " +
            "delay_rate and on_time_rate are percentages (0-100). " +
            "avg_delivery_days is a float (days from order to delivery).",
        },
        dimensions: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "carrier",
              "destination_city",
              "product_category",
              "region",
              "status",
              "warehouse",
            ],
          },
          maxItems: 3,
          description:
            "GROUP BY columns. Pass an empty array [] for a grand total. " +
            "Include 'carrier' to compare carriers, 'product_category' for SKU family breakdowns, etc.",
        },
        filters: {
          type: "array",
          items: {
            type: "object",
            required: ["field", "op", "value"],
            properties: {
              field: {
                type: "string",
                enum: [
                  "carrier",
                  "destination_city",
                  "product_category",
                  "region",
                  "status",
                  "warehouse",
                  "order_date",
                  "delivery_date",
                ],
              },
              op: {
                type: "string",
                enum: ["=", "!=", ">=", "<=", "in"],
                description:
                  "Use 'in' with an array value to match multiple values (e.g. filter to several carriers).",
              },
              value: {
                oneOf: [
                  { type: "string" },
                  { type: "number" },
                  { type: "array", items: { type: "string" } },
                ],
                description:
                  "String for categorical fields, ISO date string (YYYY-MM-DD) for date fields, " +
                  "array of strings when op is 'in'.",
              },
            },
          },
          maxItems: 5,
          description:
            "Optional WHERE conditions. Pass [] if no filtering is needed. " +
            "For status: 'delivered' or 'delayed'. " +
            "Dates must be ISO format YYYY-MM-DD.",
        },
        timeRange: {
          description:
            "Optional time window applied to order_date. " +
            "Use a preset for natural-language time references, or explicit from/to dates.",
          oneOf: [
            {
              type: "object",
              required: ["preset"],
              properties: {
                preset: {
                  type: "string",
                  enum: ["last_month", "last_3_months", "last_6_months", "all"],
                  description:
                    "'all' means no date filter. Presets resolve relative to the dataset's latest date.",
                },
              },
            },
            {
              type: "object",
              required: ["from", "to"],
              properties: {
                from: { type: "string", description: "ISO date YYYY-MM-DD inclusive." },
                to: { type: "string", description: "ISO date YYYY-MM-DD inclusive." },
              },
            },
            {
              type: "object",
              required: ["lastMonths"],
              properties: {
                lastMonths: {
                  type: "integer",
                  minimum: 1,
                  maximum: 24,
                  description: "Rolling window: last N calendar months.",
                },
              },
            },
          ],
        },
        granularity: {
          type: "string",
          enum: ["day", "week", "month"],
          description:
            "Time-bucketing granularity. Required when the user asks for a trend or time-series view. " +
            "Do NOT use this for simple totals or categorical breakdowns.",
        },
      },
    },
  },

  {
    name: "forecast_demand",
    description:
      "Forecast future demand and generate an inventory recommendation. " +
      "Use this when the user asks to predict, forecast, or project demand, " +
      "or asks how much inventory to plan for a product category or overall. " +
      "Returns historical series, forecast values, inventory recommendation, and methodology.",
    input_schema: {
      type: "object",
      required: ["horizon"],
      properties: {
        target: {
          type: "string",
          description:
            "What to forecast. " +
            "Use 'overall' for all products combined. " +
            "For a specific product family use its category name: " +
            "BOOK, BRUSH, CRAYON, MARKER, PAINT, PAPER, PENCIL, or STICKER. " +
            "Per-SKU forecasting is NOT supported — the dataset has ~1 order per SKU.",
          default: "overall",
        },
        horizon: {
          type: "integer",
          minimum: 1,
          maximum: 12,
          description: "How many months ahead to forecast (1–12).",
        },
        method: {
          type: "string",
          enum: ["moving_average", "linear_regression", "auto"],
          description:
            "Forecasting method. " +
            "'auto' lets the system choose based on trend signal strength (recommended). " +
            "'moving_average' for stable demand. " +
            "'linear_regression' for trending demand.",
          default: "auto",
        },
      },
    },
  },
];
