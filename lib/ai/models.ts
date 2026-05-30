export const DEFAULT_CHAT_MODEL: string = 'claude-haiku-4-5';

interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'High performance, low cost model',
    provider: 'openrouter',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Small model for fast, lightweight tasks',
    provider: 'openrouter',
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Flagship model for complex tasks',
    provider: 'openrouter',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    description: 'Fastest model with near-frontier intelligence',
    provider: 'openrouter',
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    description: 'Smartest model for complex agents and coding',
    provider: 'openrouter',
  },
];

export function getAvailableModels(): Array<ChatModel> {
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY?.trim();

  return chatModels.filter((m) => {
    if (m.provider === 'openrouter') return hasOpenRouter;
    return true;
  });
}
