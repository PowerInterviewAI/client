import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppState } from '@/hooks/use-app-state';
import { useConfigStore } from '@/hooks/use-config-store';
import HomePage from '@/pages/home';

export default function IndexPage() {
  const { appState } = useAppState();
  const { config } = useConfigStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (appState?.isLoggedIn === false) {
      navigate('/auth/login', { replace: true });
      return;
    }

    // Both conditions, not just the flag: `config` is undefined until the first `config:get`
    // resolves, and treating that as "not onboarded" would flash the wizard at every signed-in
    // user for the frames before their real config arrives.
    if (appState?.isLoggedIn === true && config && !config.onboardingCompleted) {
      navigate('/onboarding', { replace: true });
    }
  }, [appState?.isLoggedIn, config, navigate]);

  // Logged-out users and first-run users are redirected above. Everyone else - including the
  // brief window before appState has loaded - sees the home dashboard directly; HomePage owns its
  // own loading state for that window instead of this route showing a separate spinner first.
  return <HomePage />;
}
