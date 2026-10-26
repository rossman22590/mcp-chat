import 'server-only';

import {
  type ChatModel,
  DEFAULT_CHAT_MODEL,
  MAX_OUTPUT_PRICE_PER_MILLION,
  chatModels,
} from './models';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  supported_parameters?: string[];
}

function formatPrice(pricePerMillion: number) {
  return `$${pricePerMillion.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })}`;
}

function toChatModel(model: OpenRouterModel): ChatModel | null {
  const inputPricePerMillion = Number(model.pricing.prompt) * 1_000_000;
  const outputPricePerMillion = Number(model.pricing.completion) * 1_000_000;

  if (
    !Number.isFinite(inputPricePerMillion) ||
    !Number.isFinite(outputPricePerMillion) ||
    // Routers like openrouter/auto report -1 because the price is variable
    inputPricePerMillion < 0 ||
    outputPricePerMillion < 0 ||
    outputPricePerMillion >= MAX_OUTPUT_PRICE_PER_MILLION
  ) {
    return null;
  }

  // Batch variants aren't usable for live chat, and "~" ids are aliases
  // that duplicate another entry in the list
  if (model.id.endsWith(':batch') || model.id.startsWith('~')) {
    return null;
  }

  // The chat relies on MCP tool calls, so models without tool support can't work
  if (!model.supported_parameters?.includes('tools')) {
    return null;
  }

  const { input_modalities = [], output_modalities = [] } =
    model.architecture ?? {};
  if (!input_modalities.includes('text') || !output_modalities.includes('text')) {
    return null;
  }

  const isFree = inputPricePerMillion === 0 && outputPricePerMillion === 0;

  return {
    id: model.id,
    name: model.name,
    description: isFree
      ? 'Free'
      : `${formatPrice(inputPricePerMillion)} in · ${formatPrice(outputPricePerMillion)} out per 1M tokens`,
    inputPricePerMillion,
    outputPricePerMillion,
  };
}

export async function getAvailableModels(): Promise<Array<ChatModel>> {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return [];
  }

  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter models request failed: ${response.status}`);
    }

    const { data }: { data: Array<OpenRouterModel> } = await response.json();
    const models = data
      .map(toChatModel)
      .filter((model): model is ChatModel => model !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    return models.length > 0 ? models : chatModels;
  } catch (error) {
    console.error('Failed to load OpenRouter models:', error);
    return chatModels;
  }
}

// Maps a requested model id onto an allowed model, so a stale cookie or a
// hand-crafted request can't select a model outside the price limit.
export async function resolveChatModel(modelId: string): Promise<ChatModel> {
  const models = await getAvailableModels();

  return (
    models.find((model) => model.id === modelId) ??
    models.find((model) => model.id === DEFAULT_CHAT_MODEL) ??
    models[0] ??
    chatModels[0]
  );
}
