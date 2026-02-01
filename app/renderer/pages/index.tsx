import Loading from '@/components/loading';
import { useAppState } from '@/hooks/app-state';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function IndexPage() {
  const { data: appState } = useAppState(100);
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
