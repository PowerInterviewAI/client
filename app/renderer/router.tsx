import { createBrowserRouter } from 'react-router-dom';
import IndexPage from './pages/index';
import MainPage from './pages/main/index';
import AuthLayout from './pages/auth/layout';
import LoginPage from './pages/auth/login';
import SignupPage from './pages/auth/signup';
import SettingsPage from './pages/settings/index';
import TermsPage from './pages/terms/index';
import PrivacyPage from './pages/privacy/index';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <IndexPage />,
  },
  {
    path: '/main',
    element: <MainPage />,
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
    ],
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
  {
    path: '/terms',
    element: <TermsPage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPage />,
  },
]);
