export const INITIAL_USER_CREDITS = 10;
export const CREDIT_COST_PER_CHAT_MESSAGE = 1;

export const CREDIT_PLANS = ['premium', 'ultra'] as const;

export type CreditPlan = (typeof CREDIT_PLANS)[number];

export const DEFAULT_CREDIT_PLAN: CreditPlan = 'premium';
