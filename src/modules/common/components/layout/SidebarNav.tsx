'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useChatSessions } from '@/contexts/ChatSessionsContext';
import { getMainNavForRole } from '@/lib/navigation/main-nav';
import { ChatSessionList } from '@/modules/conversation/components/ChatSessionList';

interface SidebarNavProps {
  expanded: boolean;
  onNavigate?: () => void;
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  expanded,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  expanded: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center rounded-lg text-sm font-medium transition-colors',
        expanded ? 'gap-2 px-3 py-2.5' : 'justify-center p-2.5 mx-auto w-10',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
      aria-current={active ? 'page' : undefined}
      title={!expanded ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {expanded && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!expanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function SidebarNav({ expanded, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();
  const mainLinks = getMainNavForRole(user?.role);
  const { startNewChat, refreshSessions } = useChatSessions();

  useEffect(() => {
    refreshSessions();
  }, [pathname, refreshSessions]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col">
      <div className={cn('p-2', expanded ? 'px-3 pt-3' : 'pt-3')}>
        {expanded ? (
          <Button
            className="w-full justify-start gap-2"
            variant="default"
            size="default"
            onClick={() => {
              startNewChat();
              onNavigate?.();
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New chat
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="default"
                className="mx-auto h-9 w-9"
                onClick={() => {
                  startNewChat();
                  onNavigate?.();
                }}
                aria-label="New chat"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New chat</TooltipContent>
          </Tooltip>
        )}
      </div>

      <nav className={cn('px-2 pb-2', expanded && 'px-3')}>
        {expanded && (
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Menu
          </p>
        )}
        <ul className="space-y-0.5">
          {mainLinks.map(({ href, label, icon, exact }) => (
            <li key={href}>
              <NavItem
                href={href}
                label={label}
                icon={icon}
                active={isActive(href, exact)}
                expanded={expanded}
                onNavigate={onNavigate}
              />
            </li>
          ))}
          {isAdmin() && (
            <li>
              <NavItem
                href="/admin"
                label="Admin"
                icon={Shield}
                active={pathname.startsWith('/admin')}
                expanded={expanded}
                onNavigate={onNavigate}
              />
            </li>
          )}
        </ul>
      </nav>

      {expanded && (
        <ScrollArea className="flex-1 px-2 min-h-0">
          <ChatSessionList onNavigate={onNavigate} />
        </ScrollArea>
      )}
    </div>
  );
}
