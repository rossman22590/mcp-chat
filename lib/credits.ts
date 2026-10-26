export const CREDIT_USD_VALUE = 0.0001;
export const MINIMUM_CHAT_CREDIT_COST = 1;
export const OPENROUTER_PRICE_MARKUP_MULTIPLIER = 1.5;

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
};

export type ModelPricing = {
  inputPricePerMillion: number;
  outputPricePerMillion: number;
};

export type TokenCreditCharge = {
  credits: number;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
};

export const CREDIT_PLANS = ['premium', 'ultra'] as const;

export type CreditPlan = (typeof CREDIT_PLANS)[number];

export const DEFAULT_CREDIT_PLAN: CreditPlan = 'premium';

export const PLAN_MONTHLY_CREDITS: Record<CreditPlan, number> = {
  premium: 10_000,
  ultra: 20_000,
};

export const INITIAL_USER_CREDITS = PLAN_MONTHLY_CREDITS[DEFAULT_CREDIT_PLAN];

export function getPlanMonthlyCredits(plan: CreditPlan) {
  return PLAN_MONTHLY_CREDITS[plan];
}

export function calculateTokenCreditCharge({
  modelId,
  pricing,
  usage,
}: {
  modelId: string;
  pricing: ModelPricing;
  usage: TokenUsage;
}): TokenCreditCharge {
  const inputTokens = Math.max(0, usage.promptTokens);
  const outputTokens = Math.max(0, usage.completionTokens);
  const inputUsd =
    (inputTokens / 1_000_000) *
    pricing.inputPricePerMillion *
    OPENROUTER_PRICE_MARKUP_MULTIPLIER;
  const outputUsd =
    (outputTokens / 1_000_000) *
    pricing.outputPricePerMillion *
    OPENROUTER_PRICE_MARKUP_MULTIPLIER;
  const totalUsd = inputUsd + outputUsd;
  const credits = Math.max(
    MINIMUM_CHAT_CREDIT_COST,
    Math.ceil(totalUsd / CREDIT_USD_VALUE),
  );

  return {
    credits,
    modelId,
    inputTokens,
    outputTokens,
  };
}

export function getNextMonthlyCreditResetDate(from = new Date()) {
  const nextResetDate = new Date(from);
  nextResetDate.setUTCMonth(nextResetDate.getUTCMonth() + 1);
  return nextResetDate;
}
