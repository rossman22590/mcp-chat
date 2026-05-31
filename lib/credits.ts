export const CREDIT_USD_VALUE = 0.01;
export const MINIMUM_CHAT_CREDIT_COST = 1;
export const OPENROUTER_PRICE_MARKUP_MULTIPLIER = 1.5;

export const OPENROUTER_MODEL_PRICES_PER_MILLION = {
  'gemini-2.5-flash': {
    input: 0.3,
    output: 2.5,
    openRouterModelId: 'google/gemini-2.5-flash',
  },
  'gpt-4o-mini': {
    input: 0.15,
    output: 0.6,
    openRouterModelId: 'openai/gpt-4o-mini',
  },
  'gpt-4.1': {
    input: 2,
    output: 8,
    openRouterModelId: 'openai/gpt-4.1',
  },
  'claude-haiku-4-5': {
    input: 1,
    output: 5,
    openRouterModelId: 'anthropic/claude-haiku-4.5',
  },
  'claude-sonnet-4-5': {
    input: 3,
    output: 15,
    openRouterModelId: 'anthropic/claude-sonnet-4.5',
  },
} as const;

export type BillableChatModelId =
  keyof typeof OPENROUTER_MODEL_PRICES_PER_MILLION;

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
};

export type TokenCreditCharge = {
  credits: number;
  modelId: BillableChatModelId;
  inputTokens: number;
  outputTokens: number;
};

export const CREDIT_PLANS = ['premium', 'ultra'] as const;

export type CreditPlan = (typeof CREDIT_PLANS)[number];

export const DEFAULT_CREDIT_PLAN: CreditPlan = 'premium';

export const PLAN_MONTHLY_CREDITS: Record<CreditPlan, number> = {
  premium: 500,
  ultra: 1500,
};

export const INITIAL_USER_CREDITS = PLAN_MONTHLY_CREDITS[DEFAULT_CREDIT_PLAN];

export function getPlanMonthlyCredits(plan: CreditPlan) {
  return PLAN_MONTHLY_CREDITS[plan];
}

function isBillableChatModelId(
  modelId: string,
): modelId is BillableChatModelId {
  return modelId in OPENROUTER_MODEL_PRICES_PER_MILLION;
}

export function getBillableChatModelId(modelId: string): BillableChatModelId {
  if (isBillableChatModelId(modelId)) {
    return modelId;
  }

  return 'claude-sonnet-4-5';
}

export function calculateTokenCreditCharge({
  modelId,
  usage,
}: {
  modelId: string;
  usage: TokenUsage;
}): TokenCreditCharge {
  const billableModelId = getBillableChatModelId(modelId);
  const pricing = OPENROUTER_MODEL_PRICES_PER_MILLION[billableModelId];
  const inputTokens = Math.max(0, usage.promptTokens);
  const outputTokens = Math.max(0, usage.completionTokens);
  const inputUsd =
    (inputTokens / 1_000_000) *
    pricing.input *
    OPENROUTER_PRICE_MARKUP_MULTIPLIER;
  const outputUsd =
    (outputTokens / 1_000_000) *
    pricing.output *
    OPENROUTER_PRICE_MARKUP_MULTIPLIER;
  const totalUsd = inputUsd + outputUsd;
  const credits = Math.max(
    MINIMUM_CHAT_CREDIT_COST,
    Math.ceil(totalUsd / CREDIT_USD_VALUE),
  );

  return {
    credits,
    modelId: billableModelId,
    inputTokens,
    outputTokens,
  };
}

export function getNextMonthlyCreditResetDate(from = new Date()) {
  const nextResetDate = new Date(from);
  nextResetDate.setUTCMonth(nextResetDate.getUTCMonth() + 1);
  return nextResetDate;
}
