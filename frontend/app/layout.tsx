import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { FieldModeProvider } from '@/contexts/FieldModeContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ChatSessionsProvider } from '@/contexts/ChatSessionsContext';
import ErrorBoundary from '@/components/ErrorBoundary';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const plusJakartaDisplay = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700'],
  display: 'swap',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Krashaq — Smart Farming Assistant',
  description: 'AI-powered weather, irrigation advice, and multilingual farming chat for Indian farmers.',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F5F0' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1410' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${plusJakartaDisplay.variable} ${notoDevanagari.variable} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <FieldModeProvider>
              <SidebarProvider>
                <ChatSessionsProvider>
                  <AuthProvider>
                    <ToastProvider>{children}</ToastProvider>
                  </AuthProvider>
                </ChatSessionsProvider>
              </SidebarProvider>
            </FieldModeProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
