import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { updateUserAdminAction } from '@/app/(chat)/admin/actions';
import { getAdminEmails, requireAdminSession } from '@/lib/admin';
import { CREDIT_PLANS } from '@/lib/credits';
import { getUsersForAdmin } from '@/lib/db/queries';

export default async function AdminPage() {
  await connection();

  const adminSession = await requireAdminSession();

  if (!adminSession) {
    redirect('/');
  }

  const adminEmail = adminSession.user?.email ?? 'unknown admin';
  const users = await getUsersForAdmin();
  const adminEmails = getAdminEmails();
  const totalCredits = users.reduce((total, user) => total + user.credits, 0);
  const premiumUsers = users.filter((user) => user.plan === 'premium').length;
  const ultraUsers = users.filter((user) => user.plan === 'ultra').length;

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
        <section className="flex flex-col gap-3 border-b pb-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Admin Console
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                User Management
              </h1>
            </div>
            <div className="text-sm text-muted-foreground">
              Signed in as {adminEmail}
            </div>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Manage account plans and credit balances for every user. Access is
            limited to the admin email whitelist.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <div className="border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Users
            </div>
            <div className="mt-2 text-2xl font-semibold">{users.length}</div>
          </div>
          <div className="border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Total Credits
            </div>
            <div className="mt-2 text-2xl font-semibold">{totalCredits}</div>
          </div>
          <div className="border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Premium
            </div>
            <div className="mt-2 text-2xl font-semibold">{premiumUsers}</div>
          </div>
          <div className="border bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Ultra
            </div>
            <div className="mt-2 text-2xl font-semibold">{ultraUsers}</div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Admin Whitelist
          </h2>
          <div className="flex flex-wrap gap-2">
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

        <section className="overflow-hidden border">
          <div className="border-b bg-muted/30 px-4 py-3">
            <h2 className="font-medium">All Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/20 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Chats</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Credits</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <td className="px-4 py-4 align-middle">
                      <div className="font-medium">
                        {user.email ?? 'No email'}
                      </div>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">
                        {user.id}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">{user.chatCount}</td>
                    <td className="px-4 py-4 align-middle">
                      <form
                        id={`update-user-${user.id}`}
                        action={updateUserAdminAction}
                        className="contents"
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="plan"
                          defaultValue={user.plan}
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {CREDIT_PLANS.map((plan) => (
                            <option key={plan} value={plan}>
                              {plan.charAt(0).toUpperCase() + plan.slice(1)}
                            </option>
                          ))}
                        </select>
                      </form>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <input
                        form={`update-user-${user.id}`}
                        name="credits"
                        type="number"
                        min={0}
                        max={1_000_000}
                        step={1}
                        defaultValue={user.credits}
                        className="h-9 w-28 rounded-md border border-input bg-background px-3 text-sm"
                      />
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <button
                        form={`update-user-${user.id}`}
                        type="submit"
                        className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
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
      </div>
    </main>
  );
}
