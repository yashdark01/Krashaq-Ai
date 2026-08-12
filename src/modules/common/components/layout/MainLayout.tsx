'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TooltipProvider } from '@/components/ui/tooltip';

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  fullHeight?: boolean;
}

export function MainLayout({ children, showSidebar = true, fullHeight = false }: MainLayoutProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-[100dvh] flex-col bg-background">
        <Header />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {showSidebar && <Sidebar />}
          <main
            className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-bottom-nav md:pb-0 ${
              fullHeight ? 'flex flex-col' : ''
            }`}
          >
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </TooltipProvider>
  );
}
