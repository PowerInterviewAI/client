"use client";

import { useState } from 'react';
import axiosClient from '@/lib/axiosClient';
import { useRouter } from 'next/navigation';

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
            await axiosClient.post('/auth/logout');
            router.push('/auth/login');
        } catch (err: any) {
            setError(err?.response?.data?.message ?? err?.message ?? 'Logout failed');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        login,
        signup,
        logout,
        loading,
        error,
        setError,
    } as const;
}
