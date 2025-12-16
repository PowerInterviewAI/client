"use client";

import { useState } from 'react';
import useAuth from '@/hooks/use-auth';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SignupPage() {
    const { signup, loading, error, setError } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== passwordConfirm) {
            setError('Passwords do not match');
            return;
        }

        await signup(email.trim(), password);
    };

    return (
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Create account</CardTitle>
                <CardDescription>Register a new account for Power Interview</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="text-sm block mb-1">Email</label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div>
                        <label className="text-sm block mb-1">Password</label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>

                    <div>
                        <label className="text-sm block mb-1">Confirm Password</label>
                        <Input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required />
                    </div>

                    {error && <div className="text-sm text-red-600">{error}</div>}

                    <div className="flex items-center justify-between">
                        <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</Button>
                        <Link href="/auth/login" className="text-sm underline">Back to sign in</Link>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
