// All chat models are served through OpenRouter. The list is built at runtime
// from OpenRouter's catalog (see lib/ai/openrouter-models.ts) and limited to
// models whose output price is under MAX_OUTPUT_PRICE_PER_MILLION.
export const MAX_OUTPUT_PRICE_PER_MILLION = 1;

export const DEFAULT_CHAT_MODEL: string = 'google/gemini-2.5-flash-lite';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

// Used before the live list loads, or if OpenRouter's catalog is unreachable.
export const chatModels: Array<ChatModel> = [
  {
    id: DEFAULT_CHAT_MODEL,
    name: 'Google: Gemini 2.5 Flash Lite',
    description: '$0.10 in · $0.40 out per 1M tokens',
    inputPricePerMillion: 0.1,
    outputPricePerMillion: 0.4,
  },
];
