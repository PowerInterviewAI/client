import { InputPassword } from '@/components/input-password';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useConfigStore } from '@/hooks/use-config-store';
import useAuth from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  const { login, loading, error, setError } = useAuth();
  const { config, loadConfig } = useConfigStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Load saved credentials from Electron store
  useEffect(() => {
    const loadSavedCredentials = async () => {
      if (window.electronAPI?.auth) {
        try {
          const conf = await window.electronAPI.config.get();
          if (conf) {
            setEmail(conf.email || '');
            setPassword(conf.password || '');
          }
        } catch (error) {
          console.error('Failed to load saved credentials:', error);
        }
      }
    };
    void loadSavedCredentials();
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    await login(email.trim(), password);
  };

  useEffect(() => {
    // Pre-fill email from config (fallback if Electron API not available)
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
