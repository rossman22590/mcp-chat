import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { updateUserAdminAction } from '@/app/(chat)/admin/actions';
import { getAdminEmails, requireAdminSession } from '@/lib/admin';
import { CREDIT_PLANS, PLAN_MONTHLY_CREDITS } from '@/lib/credits';
import {
  ADMIN_USER_SORTS,
  getAdminUsageTotals,
  getAdminUsers,
  getRecentAdminAuditLogs,
  getRecentCreditTransactions,
  type AdminRoleFilter,
  type AdminStatusFilter,
  type AdminUserFilters,
  type AdminUserSort,
} from '@/lib/db/admin-queries';

type AdminPageSearchParams = Record<string, string | string[] | undefined>;

type AdminPageProps = {
  searchParams?: Promise<AdminPageSearchParams>;
};

const STATUS_FILTERS: AdminStatusFilter[] = ['all', 'active', 'suspended'];
const ROLE_FILTERS: AdminRoleFilter[] = ['all', 'admin', 'user'];

const SORT_LABELS: Record<AdminUserSort, string> = {
  'email-asc': 'Email A-Z',
  'email-desc': 'Email Z-A',
  'credits-desc': 'Credits high-low',
  'credits-asc': 'Credits low-high',
  'activity-desc': 'Recent activity',
  'chats-desc': 'Most chats',
};

function getFirstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseAdminFilters(
  searchParams: AdminPageSearchParams,
): AdminUserFilters {
  const search = getFirstSearchParam(searchParams.q)?.trim();
  const plan = getFirstSearchParam(searchParams.plan);
  const status = getFirstSearchParam(searchParams.status);
  const role = getFirstSearchParam(searchParams.role);
  const sort = getFirstSearchParam(searchParams.sort);

  return {
    search: search || undefined,
    plan: CREDIT_PLANS.includes(plan as (typeof CREDIT_PLANS)[number])
      ? (plan as (typeof CREDIT_PLANS)[number])
      : 'all',
    status: STATUS_FILTERS.includes(status as AdminStatusFilter)
      ? (status as AdminStatusFilter)
      : 'all',
    role: ROLE_FILTERS.includes(role as AdminRoleFilter)
      ? (role as AdminRoleFilter)
      : 'all',
    sort: ADMIN_USER_SORTS.includes(sort as AdminUserSort)
      ? (sort as AdminUserSort)
      : 'email-asc',
  };
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatAction(action: string) {
  return action
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSignedAmount(amount: number) {
  return amount > 0 ? `+${amount}` : amount.toString();
}

function formatAuditSnapshot(value: unknown) {
  if (!value || typeof value !== 'object') {
    return 'n/a';
  }

  const snapshot = value as {
    plan?: string;
    credits?: number;
    creditResetAt?: string;
    isSuspended?: boolean;
    isAdmin?: boolean;
  };

  return [
    snapshot.plan ?? 'no plan',
    `${snapshot.credits ?? 0} credits`,
    `reset ${formatDate(snapshot.creditResetAt)}`,
    snapshot.isSuspended ? 'suspended' : 'active',
    snapshot.isAdmin ? 'admin' : 'user',
  ].join(' / ');
}

function isWhitelistedAdmin(email: string | null, adminEmails: Array<string>) {
  return adminEmails.includes(email?.trim().toLowerCase() ?? '');
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await connection();

  const adminSession = await requireAdminSession();

  if (!adminSession) {
    redirect('/');
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = parseAdminFilters(resolvedSearchParams);
  const adminEmail = adminSession.user?.email ?? 'unknown admin';
  const adminEmails = getAdminEmails();
  const [users, totals, auditLogs, creditTransactions] = await Promise.all([
    getAdminUsers(filters),
    getAdminUsageTotals(),
    getRecentAdminAuditLogs({ limit: 12 }),
    getRecentCreditTransactions({ limit: 12 }),
  ]);

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
        <section className="flex flex-col gap-3 border-b pb-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Admin Console
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Oversight
              </h1>
            </div>
            <div className="text-sm text-muted-foreground">
              Signed in as {adminEmail}
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Users
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {totals.totalUsers}
            </div>
          </div>
          <div className="border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Total Credits
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {totals.totalCredits}
            </div>
          </div>
          <div className="border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Chats
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {totals.totalChats}
            </div>
          </div>
          <div className="border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Last 24h
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {totals.chatsLast24Hours}
            </div>
          </div>
          <div className="border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Suspended
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {totals.suspendedUsers}
            </div>
          </div>
          <div className="border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Admin Roles
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {totals.adminUsers}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <form
            action="/admin"
            className="grid gap-3 border bg-muted/20 p-4 md:grid-cols-2 xl:grid-cols-6"
          >
            <label className="flex flex-col gap-1 text-sm xl:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Search
              </span>
              <input
                name="q"
                defaultValue={filters.search ?? ''}
                placeholder="Email or user id"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Plan
              </span>
              <select
                name="plan"
                defaultValue={filters.plan}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All plans</option>
                {CREDIT_PLANS.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan.charAt(0).toUpperCase() + plan.slice(1)} (
                    {PLAN_MONTHLY_CREDITS[plan]}/mo)
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Status
              </span>
              <select
                name="status"
                defaultValue={filters.status}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All users</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Role
              </span>
              <select
                name="role"
                defaultValue={filters.role}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Sort
              </span>
              <select
                name="sort"
                defaultValue={filters.sort}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {ADMIN_USER_SORTS.map((sort) => (
                  <option key={sort} value={sort}>
                    {SORT_LABELS[sort]}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2 md:col-span-2 xl:col-span-6">
              <button
                type="submit"
                className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Apply
              </button>
              <a
                href="/admin"
                className="inline-flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
              >
                Reset
              </a>
            </div>
          </form>

          <section className="border bg-muted/20 p-4">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Admin Whitelist
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {adminEmails.map((email) => (
                <span
                  key={email}
                  className="border bg-background px-3 py-1 text-sm"
                >
                  {email}
                </span>
              ))}
            </div>
          </section>
        </section>

        <section className="overflow-hidden border">
          <div className="flex flex-col gap-1 border-b bg-muted/30 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-medium">Users</h2>
            <div className="text-sm text-muted-foreground">
              Showing {users.length} of {totals.totalUsers}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="border-b bg-muted/20 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Access</th>
                  <th className="px-4 py-3 font-medium">Activity</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Credits</th>
                  <th className="px-4 py-3 font-medium">Ledger Type</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const formId = `update-user-${user.id}`;
                  const isWhitelistAdmin = isWhitelistedAdmin(
                    user.email,
                    adminEmails,
                  );

                  return (
                    <tr key={user.id} className="border-b last:border-b-0">
                      <td className="px-4 py-4 align-top">
                        <div className="font-medium">
                          {user.email ?? 'No email'}
                        </div>
                        <div className="mt-1 font-mono text-xs text-muted-foreground">
                          {user.id}
                        </div>
                        {isWhitelistAdmin && (
                          <div className="mt-2 inline-flex border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                            Whitelist admin
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <form
                          id={formId}
                          action={updateUserAdminAction}
                          className="contents"
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="isSuspended"
                                defaultChecked={user.isSuspended}
                                className="size-4"
                              />
                              <span>Suspended</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="isAdmin"
                                defaultChecked={user.isAdmin}
                                className="size-4"
                              />
                              <span>Admin</span>
                            </label>
                          </div>
                        </form>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div>{user.chatCount} chats</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Last: {formatDate(user.lastChatAt)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Reset: {formatDate(user.creditResetAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <select
                          form={formId}
                          name="plan"
                          defaultValue={user.plan}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {CREDIT_PLANS.map((plan) => (
                            <option key={plan} value={plan}>
                              {plan.charAt(0).toUpperCase() + plan.slice(1)} (
                              {PLAN_MONTHLY_CREDITS[plan]}/mo)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <input
                          form={formId}
                          name="credits"
                          type="number"
                          min={0}
                          max={1_000_000}
                          step={1}
                          defaultValue={user.credits}
                          className="h-9 w-28 rounded-md border border-input bg-background px-3 text-sm"
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <select
                          form={formId}
                          name="creditChangeType"
                          defaultValue="grant"
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="grant">Grant</option>
                          <option value="refund">Refund</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <input
                          form={formId}
                          name="reason"
                          placeholder="Optional note"
                          className="h-9 w-44 rounded-md border border-input bg-background px-3 text-sm"
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <button
                          form={formId}
                          type="submit"
                          className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <section className="overflow-hidden border">
            <div className="border-b bg-muted/30 px-4 py-3">
              <h2 className="font-medium">Credit Transaction Ledger</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/20 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Balance</th>
                    <th className="px-4 py-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {creditTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-3 align-top">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div>{transaction.userEmail ?? 'No email'}</div>
                        <div className="mt-1 font-mono text-xs text-muted-foreground">
                          {transaction.userId}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top capitalize">
                        {transaction.type}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {formatSignedAmount(transaction.amount)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {transaction.balanceAfter}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div>{transaction.reason ?? 'n/a'}</div>
                        {transaction.adminEmail && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            by {transaction.adminEmail}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {creditTransactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No credit transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden border">
            <div className="border-b bg-muted/30 px-4 py-3">
              <h2 className="font-medium">Admin Audit Log</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b bg-muted/20 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Admin</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium">Before / After</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 align-top">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top">{log.adminEmail}</td>
                      <td className="px-4 py-3 align-top">
                        {formatAction(log.action)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div>{log.targetEmail ?? 'No email'}</div>
                        {log.targetUserId && (
                          <div className="mt-1 font-mono text-xs text-muted-foreground">
                            {log.targetUserId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="text-xs text-muted-foreground">
                          Before
                        </div>
                        <div>{formatAuditSnapshot(log.before)}</div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          After
                        </div>
                        <div>{formatAuditSnapshot(log.after)}</div>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No admin audit events yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
