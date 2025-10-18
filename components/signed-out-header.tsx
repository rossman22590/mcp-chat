'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ManageAccountButton } from '@/components/manage-account-button';
import { SignInModal } from './sign-in-modal';
import { useAuthContext } from './session-provider';

export function SignedOutHeader() {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const { isAuthDisabled } = useAuthContext();

  const handleGetStarted = () => {
    setIsSignInModalOpen(true);
  };

  return (
    <header className="flex items-center w-full px-4 py-3 bg-background gap-4 sticky top-0 z-10 border-b">
      <Link href="/" className="flex items-center">
        <Image
          src="/images/pipedream-icon.png"
          alt="Pipedream"
          width={43}
          height={10}
          priority
          className="dark:invert"
        />
      </Link>
      
      <div className="flex items-center gap-3 ml-auto">
        <ManageAccountButton className="hidden md:flex" style="secondary" />
        <Button onClick={handleGetStarted} variant="pink">
          Get started
        </Button>
      </div>

      <SignInModal 
        isOpen={isSignInModalOpen} 
        onClose={() => setIsSignInModalOpen(false)} 
      />
    </header>
  );
}