'use client';

import Loading from '@/components/loading';
import { useAppState } from '@/hooks/app-state';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { data: appState } = useAppState(100);

  useEffect(() => {
    console.log('AuthLayout appState:', appState?.is_logged_in);
    // Redirect to main page if already logged in
    if (appState?.is_logged_in === true) {
      // use Next.js router to perform client-side navigation
      try {
        window.location.href = '/main';
      } catch (e) {
        // fallback
        console.log('Router replace failed, falling back to window.location.href', e);
        window.location.href = '/main';
      }
    }
  }, [appState?.is_logged_in]);

  // Show loading state while checking backend status
  if (appState?.is_logged_in === false) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-full max-w-md mx-auto p-6">
          <div className="flex flex-col items-center mb-6">
            <Image src="/logo.svg" alt="Logo" width={48} height={48} />
            <h1 className="mt-4 text-2xl font-bold">Power Interview</h1>
          </div>

          {children}

          <div className="text-center mt-4 text-xs text-muted-foreground">
            By signing in you agree to the{' '}
            <Link href="/terms" className="underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline">
              Privacy
            </Link>
            .
          </div>
        </div>
      </div>
    );
  } else {
    return <Loading disclaimer="Initializing context for your device…" />;
  }
}
