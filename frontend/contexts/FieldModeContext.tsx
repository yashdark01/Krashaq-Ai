'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface FieldModeContextType {
  fieldMode: boolean;
  toggleFieldMode: () => void;
  setFieldMode: (enabled: boolean) => void;
}

const FieldModeContext = createContext<FieldModeContextType | undefined>(undefined);

const STORAGE_KEY = 'krashaq_field_mode';

export function FieldModeProvider({ children }: { children: ReactNode }) {
  const [fieldMode, setFieldModeState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setFieldModeState(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle('field-mode', fieldMode);
    localStorage.setItem(STORAGE_KEY, String(fieldMode));
  }, [fieldMode, mounted]);

  const setFieldMode = (enabled: boolean) => setFieldModeState(enabled);
  const toggleFieldMode = () => setFieldModeState((prev) => !prev);

  return (
    <FieldModeContext.Provider value={{ fieldMode, toggleFieldMode, setFieldMode }}>
      {children}
    </FieldModeContext.Provider>
  );
}

export function useFieldMode() {
  const context = useContext(FieldModeContext);
  if (!context) {
    throw new Error('useFieldMode must be used within FieldModeProvider');
  }
  return context;
}
