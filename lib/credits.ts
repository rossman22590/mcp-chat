export const CREDIT_COST_PER_CHAT_MESSAGE = 1;

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

export function getNextMonthlyCreditResetDate(from = new Date()) {
  const nextResetDate = new Date(from);
  nextResetDate.setUTCMonth(nextResetDate.getUTCMonth() + 1);
  return nextResetDate;
}
