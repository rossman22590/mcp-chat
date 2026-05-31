'use client';
import { ChevronUp } from 'lucide-react';
import Image from 'next/image';
import type { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import useSWR from 'swr';

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

export function SidebarUserNav({ user }: { user: User }) {
  const { setTheme, theme } = useTheme();
  const { data: creditBalance } = useSWR<CreditBalance>(
    user?.id ? '/api/credits' : null,
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
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">{planLabel}</div>
              <div>
                {creditBalance ? creditBalance.credits : '...'} credits
                remaining
              </div>
            </div>
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
  );
}
