import { useState } from 'react';

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await window.electronAPI?.auth.login(email, password);

      if (!result?.success) {
        const errMsg = result?.error || 'Login failed';
        setError(errMsg);
        throw new Error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await window.electronAPI?.auth.signup(email, password);
      if (!result?.success) {
        const errMsg = result?.error || 'Signup failed';
        setError(errMsg);
        throw new Error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await window.electronAPI?.auth.logout();
      if (!result?.success) {
        const errMsg = result?.error || 'Logout failed';
        setError(errMsg);
        throw new Error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await window.electronAPI?.auth.changePassword(currentPassword, newPassword);
      if (!result?.success) {
        const errMsg = result?.error || 'Change password failed';
        setError(errMsg);
        throw new Error(errMsg);
      }
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
