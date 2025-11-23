"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Geist, Geist_Mono } from 'next/font/google';
import { useState } from 'react';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <div suppressHydrationWarning>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark')
            }
          `,
        }}
      />
      {children}
    </div>
  )
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} ${geistMono.className} antialiased`}>
        {/* </body><body className={`font-sans antialiased`}> */}
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
          <Toaster richColors={true} position="top-center" theme='dark' />
        </ThemeProvider>
      </body>
    </html>
  )
}
