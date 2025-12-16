import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-auto p-6">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo.svg" alt="Logo" width={48} height={48} />
          <h1 className="mt-4 text-2xl font-bold">Power Interview</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to continue to the app</p>
        </div>

        {children}

        <div className="text-center mt-4 text-xs text-muted-foreground">
          By signing in you agree to the{' '}
          <Link href="/terms" className="underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
