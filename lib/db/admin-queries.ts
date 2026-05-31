import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';

import {
  getNextMonthlyCreditResetDate,
  getPlanMonthlyCredits,
  type CreditPlan,
} from '@/lib/credits';
import { db } from './queries';
import { adminAuditLog, chat, creditTransaction, user } from './schema';

export const ADMIN_USER_SORTS = [
  'email-asc',
  'email-desc',
  'credits-desc',
  'credits-asc',
  'activity-desc',
  'chats-desc',
] as const;

export type AdminUserSort = (typeof ADMIN_USER_SORTS)[number];
export type AdminStatusFilter = 'all' | 'active' | 'suspended';
export type AdminRoleFilter = 'all' | 'admin' | 'user';

export type AdminUserFilters = {
  search?: string;
  plan?: CreditPlan | 'all';
  status?: AdminStatusFilter;
  role?: AdminRoleFilter;
  sort?: AdminUserSort;
};

export type AdminCreditChangeType = 'grant' | 'refund';

type AdminActor = {
  userId?: string | null;
  email: string;
};

type UserAuditSnapshot = {
  plan: CreditPlan;
  credits: number;
  creditResetAt: Date;
  isSuspended: boolean;
  isAdmin: boolean;
};

const DEFAULT_SORT: AdminUserSort = 'email-asc';

function buildAdminUserWhere(filters: AdminUserFilters) {
  const conditions: SQL[] = [];
  const search = filters.search?.trim();

  if (search) {
    const searchPattern = `%${search}%`;
    const searchCondition = or(
      ilike(user.email, searchPattern),
      sql`${user.id}::text ILIKE ${searchPattern}`,
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (filters.plan && filters.plan !== 'all') {
    conditions.push(eq(user.plan, filters.plan));
  }

  if (filters.status === 'active') {
    conditions.push(eq(user.isSuspended, false));
  } else if (filters.status === 'suspended') {
    conditions.push(eq(user.isSuspended, true));
  }

  if (filters.role === 'admin') {
    conditions.push(eq(user.isAdmin, true));
  } else if (filters.role === 'user') {
    conditions.push(eq(user.isAdmin, false));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function getAdminUserOrderBy(sort: AdminUserSort = DEFAULT_SORT) {
  const chatCount = sql<number>`count(${chat.id})::int`;

  switch (sort) {
    case 'email-desc':
      return [desc(user.email), asc(user.id)];
    case 'credits-desc':
      return [desc(user.credits), asc(user.email), asc(user.id)];
    case 'credits-asc':
      return [asc(user.credits), asc(user.email), asc(user.id)];
    case 'activity-desc':
      return [
        sql`max(${chat.createdAt}) desc nulls last`,
        asc(user.email),
        asc(user.id),
      ];
    case 'chats-desc':
      return [desc(chatCount), asc(user.email), asc(user.id)];
    case 'email-asc':
    default:
      return [asc(user.email), asc(user.id)];
  }
}

function toAuditSnapshot(row: UserAuditSnapshot) {
  return {
    plan: row.plan,
    credits: row.credits,
    creditResetAt: row.creditResetAt.toISOString(),
    isSuspended: row.isSuspended,
    isAdmin: row.isAdmin,
  };
}

function getAuditAction({
  before,
  after,
  creditChangeType,
}: {
  before: UserAuditSnapshot;
  after: UserAuditSnapshot;
  creditChangeType: AdminCreditChangeType;
}) {
  if (before.plan !== after.plan) {
    return 'plan.update';
  }

  const changedFields = (['credits', 'isSuspended', 'isAdmin'] as const).filter(
    (field) => before[field] !== after[field],
  );

  if (changedFields.length === 1) {
    const [field] = changedFields;

    if (field === 'credits') {
      if (after.credits > before.credits) {
        return `credit.${creditChangeType}`;
      }

      return 'credit.adjustment';
    }

    if (field === 'isSuspended') {
      return after.isSuspended ? 'user.suspend' : 'user.unsuspend';
    }

    if (field === 'isAdmin') {
      return 'admin.role.update';
    }
  }

  return 'user.update';
}

export async function getAdminUsers(filters: AdminUserFilters = {}) {
  try {
    const chatCount = sql<number>`count(${chat.id})::int`;
    const lastChatAt = sql<Date | null>`max(${chat.createdAt})`;

    return await db
      .select({
        id: user.id,
        email: user.email,
        plan: user.plan,
        credits: user.credits,
        creditResetAt: user.creditResetAt,
        isSuspended: user.isSuspended,
        isAdmin: user.isAdmin,
        chatCount,
        lastChatAt,
      })
      .from(user)
      .leftJoin(chat, eq(chat.userId, user.id))
      .where(buildAdminUserWhere(filters))
      .groupBy(
        user.id,
        user.email,
        user.plan,
        user.credits,
        user.creditResetAt,
        user.isSuspended,
        user.isAdmin,
      )
      .orderBy(...getAdminUserOrderBy(filters.sort));
  } catch (error) {
    console.error('Failed to get admin users');
    throw error;
  }
}

export async function getAdminUsageTotals() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [userTotals] = await db
      .select({
        totalUsers: count(user.id),
        totalCredits: sql<number>`coalesce(sum(${user.credits}), 0)::int`,
        suspendedUsers: sql<number>`count(*) filter (where ${user.isSuspended})::int`,
        adminUsers: sql<number>`count(*) filter (where ${user.isAdmin})::int`,
        premiumUsers: sql<number>`count(*) filter (where ${user.plan} = 'premium')::int`,
        ultraUsers: sql<number>`count(*) filter (where ${user.plan} = 'ultra')::int`,
      })
      .from(user);

    const [chatTotals] = await db
      .select({
        totalChats: sql<number>`count(${chat.id})::int`,
        chatsLast24Hours: sql<number>`count(*) filter (where ${chat.createdAt} >= ${since})::int`,
        lastChatAt: sql<Date | null>`max(${chat.createdAt})`,
      })
      .from(chat);

    return {
      totalUsers: userTotals?.totalUsers ?? 0,
      totalCredits: userTotals?.totalCredits ?? 0,
      suspendedUsers: userTotals?.suspendedUsers ?? 0,
      adminUsers: userTotals?.adminUsers ?? 0,
      premiumUsers: userTotals?.premiumUsers ?? 0,
      ultraUsers: userTotals?.ultraUsers ?? 0,
      totalChats: chatTotals?.totalChats ?? 0,
      chatsLast24Hours: chatTotals?.chatsLast24Hours ?? 0,
      lastChatAt: chatTotals?.lastChatAt ?? null,
    };
  } catch (error) {
    console.error('Failed to get admin usage totals');
    throw error;
  }
}

export async function getRecentAdminAuditLogs({ limit = 20 } = {}) {
  try {
    return await db
      .select({
        id: adminAuditLog.id,
        adminEmail: adminAuditLog.adminEmail,
        targetEmail: adminAuditLog.targetEmail,
        targetUserId: adminAuditLog.targetUserId,
        action: adminAuditLog.action,
        before: adminAuditLog.before,
        after: adminAuditLog.after,
        createdAt: adminAuditLog.createdAt,
      })
      .from(adminAuditLog)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get recent admin audit logs');
    throw error;
  }
}

export async function getRecentCreditTransactions({ limit = 20 } = {}) {
  try {
    return await db
      .select({
        id: creditTransaction.id,
        userId: creditTransaction.userId,
        userEmail: user.email,
        adminEmail: creditTransaction.adminEmail,
        type: creditTransaction.type,
        amount: creditTransaction.amount,
        balanceAfter: creditTransaction.balanceAfter,
        reason: creditTransaction.reason,
        createdAt: creditTransaction.createdAt,
      })
      .from(creditTransaction)
      .leftJoin(user, eq(creditTransaction.userId, user.id))
      .orderBy(desc(creditTransaction.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get recent credit transactions');
    throw error;
  }
}

export async function updateUserAdminSettings({
  targetUserId,
  plan,
  credits,
  isSuspended,
  isAdmin,
  creditChangeType,
  reason,
  admin,
}: {
  targetUserId: string;
  plan: CreditPlan;
  credits: number;
  isSuspended: boolean;
  isAdmin: boolean;
  creditChangeType: AdminCreditChangeType;
  reason?: string;
  admin: AdminActor;
}) {
  try {
    return await db.transaction(async (tx) => {
      const [beforeUser] = await tx
        .select({
          id: user.id,
          email: user.email,
          plan: user.plan,
          credits: user.credits,
          creditResetAt: user.creditResetAt,
          isSuspended: user.isSuspended,
          isAdmin: user.isAdmin,
        })
        .from(user)
        .where(eq(user.id, targetUserId));

      if (!beforeUser) {
        throw new Error('User not found');
      }

      const planChanged = beforeUser.plan !== plan;
      const appliedCredits = planChanged
        ? getPlanMonthlyCredits(plan)
        : credits;
      const nextCreditResetAt = planChanged
        ? getNextMonthlyCreditResetDate()
        : beforeUser.creditResetAt;

      const [updatedUser] = await tx
        .update(user)
        .set({
          plan,
          credits: appliedCredits,
          creditResetAt: nextCreditResetAt,
          isSuspended,
          isAdmin,
        })
        .where(eq(user.id, targetUserId))
        .returning({
          id: user.id,
          email: user.email,
          plan: user.plan,
          credits: user.credits,
          creditResetAt: user.creditResetAt,
          isSuspended: user.isSuspended,
          isAdmin: user.isAdmin,
        });

      if (!updatedUser) {
        throw new Error('User update failed');
      }

      const trimmedReason =
        reason?.trim() ||
        (planChanged ? 'Plan monthly credit reset' : 'Admin update');
      const creditDelta = updatedUser.credits - beforeUser.credits;
      let creditTransactionType: 'grant' | 'refund' | 'adjustment' =
        'adjustment';

      if (creditDelta > 0) {
        creditTransactionType = planChanged ? 'grant' : creditChangeType;
      }

      const action = getAuditAction({
        before: beforeUser,
        after: updatedUser,
        creditChangeType,
      });

      await tx.insert(adminAuditLog).values({
        adminUserId: admin.userId ?? null,
        adminEmail: admin.email,
        targetUserId: updatedUser.id,
        targetEmail: updatedUser.email,
        action,
        before: toAuditSnapshot(beforeUser),
        after: toAuditSnapshot(updatedUser),
        createdAt: new Date(),
      });

      if (creditDelta !== 0) {
        await tx.insert(creditTransaction).values({
          userId: updatedUser.id,
          adminUserId: admin.userId ?? null,
          adminEmail: admin.email,
          type: creditTransactionType,
          amount: creditDelta,
          balanceAfter: updatedUser.credits,
          reason: trimmedReason,
          createdAt: new Date(),
        });
      }

      return updatedUser;
    });
  } catch (error) {
    console.error('Failed to update user admin settings');
    throw error;
  }
}
