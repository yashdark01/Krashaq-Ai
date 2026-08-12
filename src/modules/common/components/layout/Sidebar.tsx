'use client';

import { PanelLeftClose, PanelLeftOpen, Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { SidebarNav } from './SidebarNav';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { isExpanded, isCollapsed, toggle, isMobile } = useSidebar();

  if (isMobile) return null;

  return (
    <aside
      className={cn(
        'hidden md:flex h-full shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out',
        isExpanded ? 'w-64' : 'w-14',
        className
      )}
      aria-label="Sidebar navigation"
    >
      <div
        className={cn(
          'flex items-center border-b h-header shrink-0',
          isExpanded ? 'justify-between px-3' : 'justify-center px-1'
        )}
      >
        {isExpanded ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sprout className="h-4 w-4" />
            </div>
            <span className="font-display text-sm font-bold truncate">Krashaq</span>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sprout className="h-4 w-4" />
          </div>
        )}
        {isExpanded && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={toggle}
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Collapse sidebar (⌘B)</TooltipContent>
          </Tooltip>
        )}
      </div>

      {!isExpanded && (
        <div className="flex justify-center py-2 border-b">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggle}
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar (⌘B)</TooltipContent>
          </Tooltip>
        </div>
      )}

      <SidebarNav expanded={isExpanded} />
    </aside>
  );
}
