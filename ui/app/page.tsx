'use client';

import Loading from '@/components/loading';
import { useAppState } from '@/hooks/app-state';
import { useEffect } from 'react';

export default function LogoutPage() {
  const { data: appState } = useAppState(100);

  useEffect(() => {
    // Redirect to main page if backend is live and logged in
    if (appState?.is_logged_in === null) {
      return;
    } else if (appState?.is_logged_in) {
      window.location.href = '/main';
    } else {
      window.location.href = '/auth/login';
    }
  }, [appState?.is_backend_live, appState?.is_logged_in]);

  // Optionally, render a loading state while checking
  return <Loading disclaimer="Initializing context for your device…" />;
}
