import { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

import logoSvg from '/logo.svg';
import Loading from '@/components/custom/loading';
import { useAppState } from '@/hooks/use-app-state';

export default function AuthLayout() {
  const { appState } = useAppState();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to main page if already logged in
    if (appState?.isLoggedIn === true) {
      navigate('/main', { replace: true });
    }
  }, [appState?.isLoggedIn, navigate]);

  // Show loading state while checking backend status
  if (appState?.isLoggedIn === false) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="w-full max-w-md mx-auto p-6">
          <div className="flex flex-col items-center mb-6">
            <img src={logoSvg} alt="Logo" width={48} height={48} />
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
    return <Loading disclaimer="Loading…" />;
  }
}
