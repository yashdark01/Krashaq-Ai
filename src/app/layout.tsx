import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { FieldModeProvider } from '@/contexts/FieldModeContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ChatSessionsProvider } from '@/contexts/ChatSessionsContext';
import ErrorBoundary from '@/components/ErrorBoundary';

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#10b981',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  title: 'Krashaq — Smart Farming Assistant',
  description:
    'AI-powered weather, irrigation advice, and multilingual farming chat for Indian farmers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${notoDevanagari.variable} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <FieldModeProvider>
              <SidebarProvider>
                <AuthProvider>
                  <ChatSessionsProvider>
                    <ToastProvider>{children}</ToastProvider>
                  </ChatSessionsProvider>
                </AuthProvider>
              </SidebarProvider>
            </FieldModeProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
