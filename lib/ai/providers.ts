import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { customProvider } from 'ai';

import { DEFAULT_CHAT_MODEL } from './models';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export function getChatLanguageModel(modelId: string) {
  return openrouter(modelId);
}

export const myProvider = customProvider({
  languageModels: {
    'title-model': openrouter(DEFAULT_CHAT_MODEL),
    'artifact-model': openrouter(DEFAULT_CHAT_MODEL),
  },
});
