import { InputPassword } from '@/components/input-password';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useConfigQuery } from '@/hooks/config';
import useAuth from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const { login, loading, error, setError } = useAuth();
  const { data: config } = useConfigQuery();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    await login(email.trim(), password);
  };

  useEffect(() => {
    // Pre-fill email if available from config
    if (config?.email) {
      setEmail(config.email);
    }
    if (config?.password) {
      setPassword(config.password);
    }
  }, [config?.email, config?.password]);

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your account to access Power Interview</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm block mb-1">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="text-sm block mb-1">Password</label>
            <InputPassword
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          <div className="text-center">
            <Link to="/auth/signup" className="text-sm underline">
              Don&apos;t have account? Create a new one.
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
