'use client';

import axiosClient from '@/lib/axiosClient';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await axiosClient.post('/auth/login', { email, password });
      router.push('/main');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await axiosClient.post('/auth/signup', { email, password });
      // After signup, go to login page
      router.push('/auth/login');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Signup failed');
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
      router.push('/auth/login');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Logout failed');
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
        currentPassword,
        newPassword,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Password change failed');
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
