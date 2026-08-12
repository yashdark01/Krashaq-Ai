'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type SidebarMode = 'expanded' | 'collapsed';

interface SidebarContextType {
  mode: SidebarMode;
  isMobile: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
  setMobileOpen: (open: boolean) => void;
  isExpanded: boolean;
  isCollapsed: boolean;
}

const STORAGE_KEY = 'krashaq_sidebar_mode';

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SidebarMode>('expanded');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'collapsed' || stored === 'expanded') {
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, mounted]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        if (isMobile) {
          setMobileOpen((prev) => !prev);
        } else {
          setMode((prev) => (prev === 'expanded' ? 'collapsed' : 'expanded'));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobile]);

  const toggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setMode((prev) => (prev === 'expanded' ? 'collapsed' : 'expanded'));
    }
  }, [isMobile]);

  const collapse = useCallback(() => setMode('collapsed'), []);
  const expand = useCallback(() => setMode('expanded'), []);

  return (
    <SidebarContext.Provider
      value={{
        mode,
        isMobile,
        mobileOpen,
        toggle,
        collapse,
        expand,
        setMobileOpen,
        isExpanded: mode === 'expanded',
        isCollapsed: mode === 'collapsed',
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
