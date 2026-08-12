'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar className="hidden md:flex" />}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-bottom-nav md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
