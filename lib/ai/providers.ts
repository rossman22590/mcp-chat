import { openai } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { customProvider } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const myProvider = customProvider({
  languageModels: {
    'gemini-2.5-flash': openrouter('google/gemini-2.5-flash'),
    'gpt-4o-mini': openrouter('openai/gpt-4o-mini'),
    'gpt-4.1': openrouter('openai/gpt-4.1'),
    'claude-haiku-4-5': openrouter('anthropic/claude-haiku-4.5'),
    'claude-sonnet-4-5': openrouter('anthropic/claude-sonnet-4.5'),
    'title-model': openrouter('openai/gpt-4o-mini'),
    'artifact-model': openrouter('openai/gpt-4o-mini'),
  },
  imageModels: {
    'small-model': openai.image('dall-e-2'),
    'large-model': openai.image('dall-e-3'),
  },
});
