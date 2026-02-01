import Loading from '@/components/loading';
import { useAppStateStore } from '@/hooks/use-app-state-store';
import { useEffect } from 'react';
import { useNavigate, Outlet, Link } from 'react-router-dom';

export default function AuthLayout() {
  const appState = useAppStateStore((state) => state.appState);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AuthLayout appState:', appState?.is_logged_in);
    // Redirect to main page if already logged in
    if (appState?.is_logged_in === true) {
      navigate('/main', { replace: true });
    }
  }, [appState?.is_logged_in, navigate]);

  // Show loading state while checking backend status
  if (appState?.is_logged_in === false) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-full max-w-md mx-auto p-6">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.svg" alt="Logo" width={48} height={48} />
            <h1 className="mt-4 text-2xl font-bold">Power Interview</h1>
          </div>

          <Outlet />

          <div className="text-center mt-4 text-xs text-muted-foreground">
            By signing in you agree to the{' '}
            <Link to="/terms" className="underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline">
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
