import { request } from "@/lib/axios";

/**
 * Command Center Assistant (#34 / #27) HTTP wrappers.
 */
export const assistantService = {
  /** GET /assistant/suggestions?context=... */
  suggestions: (context) =>
    request({
      url: "/assistant/suggestions",
      method: "GET",
      params: context ? { context } : undefined,
    }),

  /** POST /assistant/ask */
  ask: ({ question, context }) =>
    request({
      url: "/assistant/ask",
      method: "POST",
      data: { question, ...(context ? { context } : {}) },
    }),
};
