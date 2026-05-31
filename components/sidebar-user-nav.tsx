'use client';
import { useState } from 'react';
import { ChevronUp, ReceiptText } from 'lucide-react';
import Image from 'next/image';
import type { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import useSWR from 'swr';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { fetcher } from '@/lib/utils';

type CreditBalance = {
  credits: number;
  plan: string;
};

type AdminStatus = {
  isAdmin: boolean;
};

type CreditTransaction = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string | null;
  createdAt: string;
};

type CreditTransactionsResponse = {
  transactions: Array<CreditTransaction>;
};

function formatTransactionDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatSignedCredits(amount: number) {
  return amount > 0 ? `+${amount}` : amount.toString();
}

function getAmountClassName(amount: number) {
  if (amount > 0) {
    return 'text-emerald-600 dark:text-emerald-400';
  }

  if (amount < 0) {
    return 'text-foreground';
  }

  return 'text-muted-foreground';
}

export function SidebarUserNav({ user }: { user: User }) {
  const [isCreditHistoryOpen, setCreditHistoryOpen] = useState(false);
  const { setTheme, theme } = useTheme();
  const { data: creditBalance } = useSWR<CreditBalance>(
    user?.id ? '/api/credits' : null,
    fetcher,
  );
  const { data: creditTransactions, isLoading: isCreditTransactionsLoading } =
    useSWR<CreditTransactionsResponse>(
      isCreditHistoryOpen && user?.id ? '/api/credits/transactions' : null,
      fetcher,
    );
  const { data: adminStatus } = useSWR<AdminStatus>(
    user?.id ? '/api/admin/status' : null,
    fetcher,
  );
  const isAdmin = adminStatus?.isAdmin ?? false;
  const planLabel = creditBalance?.plan
    ? creditBalance.plan.charAt(0).toUpperCase() + creditBalance.plan.slice(1)
    : 'Premium';

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10">
                <Image
                  src={`https://avatar.vercel.sh/${user.email}`}
                  alt={user.email ?? 'User Avatar'}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="truncate">{user?.email}</span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              className="w-[--radix-popper-anchor-width]"
            >
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {`Toggle ${theme === 'light' ? 'dark' : 'light'} mode`}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/accounts" className="w-full cursor-pointer">
                  Accounts
                </a>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <a href="/admin" className="w-full cursor-pointer">
                    Admin
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer items-start gap-3 px-2 py-2"
                onSelect={() => setCreditHistoryOpen(true)}
              >
                <ReceiptText className="mt-0.5 size-4 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{planLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    {creditBalance ? creditBalance.credits : '...'} credits
                    remaining
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <button
                  type="button"
                  className="w-full cursor-pointer"
                  onClick={() => {
                    signOut({
                      redirectTo: '/',
                    });
                  }}
                >
                  Sign out
                </button>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="text-xs text-muted-foreground px-2 py-1">
                User ID: {user.id}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={isCreditHistoryOpen} onOpenChange={setCreditHistoryOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-2xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>Credit transactions</DialogTitle>
            <DialogDescription>
              Recent balance changes for your account.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-3 text-sm">
            <div>
              <div className="font-medium">{planLabel}</div>
              <div className="text-xs text-muted-foreground">Current plan</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-semibold">
                {creditBalance ? creditBalance.credits : '...'}
              </div>
              <div className="text-xs text-muted-foreground">credits left</div>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isCreditTransactionsLoading && (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Loading transactions...
              </div>
            )}

            {!isCreditTransactionsLoading &&
              creditTransactions?.transactions.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No credit transactions yet.
                </div>
              )}

            {!isCreditTransactionsLoading &&
              creditTransactions?.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="grid grid-cols-[1fr_auto] gap-4 border-b px-5 py-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {transaction.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTransactionDate(transaction.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">
                      {transaction.reason ?? 'Credit balance update'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono text-sm font-semibold ${getAmountClassName(
                        transaction.amount,
                      )}`}
                    >
                      {formatSignedCredits(transaction.amount)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {transaction.balanceAfter} balance
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
