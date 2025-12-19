'use client';

import Loading from '@/components/loading';
import { useAppState } from '@/hooks/app-state';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LogoutPage() {
  const router = useRouter();
  const { data: appState } = useAppState(100);

  useEffect(() => {
    // Skip if AppState is not loaded yet
    if (!appState) {
      return;
    }

    // Check backend is live
    if (!appState.is_backend_live) {
      return;
    }

    // Redirect to main page if backend is live and logged in
    if (appState.is_logged_in) {
      router.push('/main');
    } else {
      router.push('/auth/login');
    }
  }, [appState, appState?.is_backend_live, appState?.is_logged_in, router]);

  // Optionally, render a loading state while checking
  return <Loading disclaimer="Initializing context for your device…" />;
}
