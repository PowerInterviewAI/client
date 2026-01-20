import MainFrame from '@/components/main-frame';
import Providers from '@/components/providers';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

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
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        style={{ backgroundColor: 'transparent' }}
      >
        <Providers>
          <MainFrame>{children}</MainFrame>
        </Providers>
      </body>
    </html>
  );
}
