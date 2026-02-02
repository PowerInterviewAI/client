import Loading from '@/components/loading';
import { useAppState } from '@/hooks/use-app-state';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function IndexPage() {
  const { appState } = useAppState();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to main page if backend is live and logged in
    if (appState?.isLoggedIn === null) {
      return;
    } else if (appState?.isLoggedIn) {
      navigate('/main', { replace: true });
    } else {
      navigate('/auth/login', { replace: true });
    }
  }, [appState?.isBackendLive, appState?.isLoggedIn, navigate]);

  // Optionally, render a loading state while checking
  return <Loading disclaimer="Initializing context for your device…" />;
}
