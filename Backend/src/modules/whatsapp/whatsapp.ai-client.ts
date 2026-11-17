import OpenAI from 'openai';
import type { ResponseInputItem } from 'openai/resources/responses/responses.js';
import { AppConfigService } from '../../config/config.service.js';

/** The loop knows text and function calls, never the provider's SDK types. */
export type AiMessage =
  | { kind: 'text'; role: 'user' | 'assistant'; text: string }
  | { kind: 'tool_call'; id: string; name: string; argumentsJson: string }
  | { kind: 'tool_result'; id: string; resultJson: string };

export interface AiToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AiToolCall {
  id: string;
  name: string;
  argumentsJson: string;
}

export type AiTurn = { kind: 'text'; text: string } | { kind: 'tools'; calls: AiToolCall[] };

export interface AiClient {
  respond(input: { instructions: string; messages: AiMessage[]; tools: AiToolSpec[] }): Promise<AiTurn>;
}

export const WHATSAPP_AI_CLIENT = Symbol('WHATSAPP_AI_CLIENT');

/**
 * The only provider adapter. Every request is stateless at OpenAI; only the
 * current question's tool results travel back during its bounded loop.
 */
export class OpenAiClient implements AiClient {
  private readonly client: OpenAI;

  constructor(apiKey: string, private readonly model: string) {
    this.client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });
  }

  async respond(input: { instructions: string; messages: AiMessage[]; tools: AiToolSpec[] }): Promise<AiTurn> {
    const messages: ResponseInputItem[] = input.messages.map((message) => {
      switch (message.kind) {
        case 'text':
          return { role: message.role, content: message.text };
        case 'tool_call':
          return { type: 'function_call', call_id: message.id, name: message.name, arguments: message.argumentsJson };
        case 'tool_result':
          return { type: 'function_call_output', call_id: message.id, output: message.resultJson };
      }
    });
    const response = await this.client.responses.create({
      model: this.model,
      store: false,
      instructions: input.instructions,
      input: messages,
      tools: input.tools.map((tool) => ({
        type: 'function', name: tool.name, description: tool.description,
        parameters: tool.parameters,
        // Optional arguments and defaults belong to Zod at dispatch time.
        strict: false,
      })),
    });
    const calls = response.output.flatMap((item): AiToolCall[] => item.type === 'function_call'
      ? [{ id: item.call_id, name: item.name, argumentsJson: item.arguments }]
      : []);
    if (calls.length) return { kind: 'tools', calls };
    if (response.status !== 'completed' || !response.output_text.trim()) {
      throw new Error('AI returned no complete text reply');
    }
    return { kind: 'text', text: response.output_text };
  }
}

/** No key or model means no SDK instance, even when the webhook is enabled. */
export const whatsappAiClientProvider = {
  provide: WHATSAPP_AI_CLIENT,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService): AiClient | null => {
    const key = config.ai.openaiApiKey?.trim();
    const model = config.ai.openaiModel?.trim();
    return key && model ? new OpenAiClient(key, model) : null;
  },
};
