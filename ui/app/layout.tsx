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
          <div className="min-h-screen flex flex-col">
            <Titlebar />
            <div className="flex-1 relative pt-8">
              {children}
            </div>
          </div>
          <WindowResizer />
        </Providers>
      </body>
    </html>
  );
}
