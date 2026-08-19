import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { InputPassword } from '@/components/custom/input-password';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import useAuth from '@/hooks/use-auth';

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordPage() {
  const { forgotPassword, verifyPasswordResetCode, resetPassword, loading, error, setError } =
    useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  // The reset succeeded and the redirect is pending. The form stays on screen through that
  // gap with `loading` already back to false, so without this the button is live again and a
  // second click resends a code the backend has just spent - a guaranteed 401, toasting a
  // failure on top of the success the user is still reading.
  const [succeeded, setSucceeded] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    []
  );

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (await forgotPassword(email.trim())) {
      // Advances on success alone, and the copy on the next step is conditional ("if an
      // account exists"). The backend answers the same for a registered and an unregistered
      // address on purpose, so telling the user which one they typed here would hand back
      // exactly the account-enumeration oracle that design removes.
      setStep('code');
    } else {
      toast.error('Could not send a reset code. Please try again.');
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (await verifyPasswordResetCode(email.trim(), code.trim())) {
      setStep('password');
    } else {
      toast.error('Invalid or expired reset code.');
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (succeeded) return;
    setError(null);
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (await resetPassword(email.trim(), code.trim(), password)) {
      setSucceeded(true);
      toast.success('Password reset. Please sign in with your new password.');
      redirectTimer.current = setTimeout(() => {
        navigate('/auth/login');
      }, 2000);
    } else {
      toast.error('Password reset failed. Please try again.');
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Set a new password for your Power Interview AI account</CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'email' && (
          <form onSubmit={submitEmail} className="space-y-4">
            <div>
              <label className="text-sm block mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                required
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending…' : 'Send reset code'}
            </Button>

            <div className="text-center">
              <Link to="/auth/login" className="text-sm underline">
                Back to sign in
              </Link>
            </div>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode} className="space-y-4">
            <div>
              <label className="text-sm block mb-1">Reset code</label>
              <p className="text-sm text-muted-foreground mb-2">
                If an account exists for {email}, we sent a reset code to it. Paste the code below.
                It can only be used once, and the email says when it expires.
              </p>
              <Textarea value={code} onChange={(e) => setCode(e.target.value)} rows={4} required />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Verifying…' : 'Verify'}
            </Button>

            <div className="flex justify-between text-sm">
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setError(null);
                  setCode('');
                  setStep('email');
                }}
              >
                Change email
              </button>
              <button
                type="button"
                className="underline"
                disabled={loading}
                onClick={async () => {
                  setError(null);
                  if (await forgotPassword(email.trim())) {
                    toast.success('Reset code resent.');
                  } else {
                    toast.error('Could not resend the reset code.');
                  }
                }}
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={submitPassword} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Setting a new password signs you out on every device.
            </p>

            <div>
              <label className="text-sm block mb-1">New password</label>
              <InputPassword
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={128}
                required
              />
            </div>

            <div>
              <label className="text-sm block mb-1">Confirm new password</label>
              <InputPassword
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                maxLength={128}
                required
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <Button type="submit" disabled={loading || succeeded} className="w-full">
              {loading ? 'Saving…' : succeeded ? 'Password reset' : 'Set new password'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
