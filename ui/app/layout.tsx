import Providers from '@/components/providers';
import Titlebar from '@/components/titlebar';
import WindowResizer from '@/components/window-resizer';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Power Interview',
  description: 'Power Interview is a powerful live interview assistant powered by AI.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <div
            className="flex flex-col h-screen"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'calc(var(--radius))',
              boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            <Titlebar />
            <div className="flex-1 flex flex-col overflow-auto">
              {children}
            </div>
          </div>
          <WindowResizer />
        </Providers>
      </body>
    </html>
  );
}
