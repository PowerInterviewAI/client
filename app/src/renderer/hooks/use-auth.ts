import axiosClient from '@/lib/axios-client';
import axios from 'axios';
import { useState } from 'react';

function parseErrorMessage(err: unknown, defaultMessage: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.detail?.message || err.response?.data?.message || err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return defaultMessage;
}

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      const token = response.data?.token;
      console.log('Login successful, redirecting to main page');

      // Save credentials to electron store
      if (window.electronAPI?.auth) {
        await window.electronAPI.auth.saveCredentials(email, password, token);
      }

      // Update app state to mark user as logged in
      if (window.electronAPI?.appState) {
        await window.electronAPI.appState.update({ isLoggedIn: true });
      }

      window.location.href = '/main';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setLoading(false);
      setError(parseErrorMessage(err, 'Login failed'));
      throw err;
    }
  };

  const signup = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await axiosClient.post('/auth/signup', { email, password });

      // Save credentials to electron store for future login
      if (window.electronAPI?.auth) {
        await window.electronAPI.auth.saveCredentials(email, password);
      }

      // After signup, go to login page
      window.location.href = '/auth/login';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(parseErrorMessage(err, 'Signup failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await axiosClient.get('/auth/logout');

      // Clear credentials from electron store
      if (window.electronAPI?.auth) {
        await window.electronAPI.auth.clearCredentials();
      }

      // Update app state to mark user as logged out
      if (window.electronAPI?.appState) {
        await window.electronAPI.appState.update({ isLoggedIn: false });
      }

      window.location.href = '/auth/login';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(parseErrorMessage(err, 'Logout failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      await axiosClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(parseErrorMessage(err, 'Password change failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    signup,
    logout,
    changePassword,
    loading,
    error,
    setError,
  } as const;
}
