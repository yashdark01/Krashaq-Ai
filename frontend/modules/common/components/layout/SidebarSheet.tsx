'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { SidebarNav } from './SidebarNav';
import { cn } from '@/lib/utils';

interface SidebarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SidebarSheet({ open, onOpenChange }: SidebarSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 md:hidden" />
        <Dialog.Content
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-[min(85vw,280px)] border-r bg-background shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
            'md:hidden flex flex-col'
          )}
        >
          <div className="flex items-center justify-between border-b px-4 h-header">
            <Dialog.Title className="font-display font-semibold text-sm">Krashaq</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="krashaq-touch-target rounded-lg p-2 hover:bg-accent"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <SidebarNav expanded onNavigate={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
