import Loading from '@/components/loading';
import { useAppStateStore } from '@/hooks/use-app-state-store';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function IndexPage() {
  const appState = useAppStateStore((state) => state.appState);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to main page if backend is live and logged in
    if (appState?.is_logged_in === null) {
      return;
    } else if (appState?.is_logged_in) {
      navigate('/main', { replace: true });
    } else {
      navigate('/auth/login', { replace: true });
    }
  }, [appState?.is_backend_live, appState?.is_logged_in, navigate]);

  // Optionally, render a loading state while checking
  return <Loading disclaimer="Initializing context for your device…" />;
}
