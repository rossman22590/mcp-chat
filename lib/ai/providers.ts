import { anthropic } from "@ai-sdk/anthropic"
import { google } from '@ai-sdk/google';
import { openai } from "@ai-sdk/openai"
import { customProvider } from "ai"

export const myProvider = customProvider({
      languageModels: {
        "gemini-2.5-flash": google("gemini-2.5-flash"),
        "gpt-4o-mini": openai("gpt-4o-mini"),
        "gpt-4.1": openai("gpt-4.1-2025-04-14"),
        "claude-haiku-4-5": anthropic("claude-haiku-4-5-20251001"),
        "claude-sonnet-4-5": anthropic("claude-sonnet-4-5-20250929"),
        // 'chat-model-reasoning': wrapLanguageModel({
        //   model: fireworks('accounts/fireworks/models/deepseek-r1'),
        //   middleware: extractReasoningMiddleware({ tagName: 'think' }),
        // }),
        "title-model": openai("gpt-4-turbo"),
        "artifact-model": openai("gpt-4o-mini"),
      },
      imageModels: {
        "small-model": openai.image("dall-e-2"),
        "large-model": openai.image("dall-e-3"),
      },
    })
