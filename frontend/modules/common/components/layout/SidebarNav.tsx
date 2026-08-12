'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Plus,
  MessageSquare,
  Settings,
  User,
  Home,
  Users,
  Shield,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useChatSessions } from '@/contexts/ChatSessionsContext';

interface SidebarNavProps {
  expanded: boolean;
  onNavigate?: () => void;
}

const mainLinks = [
  { href: '/', label: 'Dashboard', icon: Home, exact: true },
  { href: '/chat', label: 'Chat', icon: MessageSquare, exact: false },
  { href: '/farmers', label: 'Farmers', icon: Users, exact: false },
  { href: '/profile', label: 'Profile', icon: User, exact: false },
  { href: '/profile/settings', label: 'Settings', icon: Settings, exact: false },
];

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
  const { isAdmin } = useAuth();
  const { sessions, startNewChat, openSession, deleteSessionById, refreshSessions } =
    useChatSessions();

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
          <div className="space-y-1 p-2">
            <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent chats
            </p>
            {sessions.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">No conversations yet</p>
            ) : (
              sessions.map((conv) => (
                <div key={conv.session_id} className="group flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      openSession(conv.session_id);
                      onNavigate?.();
                    }}
                    className={cn(
                      'flex flex-1 min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors',
                      pathname === `/chat/${conv.session_id}`
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{conv.title}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="h-7 w-7 shrink-0 rounded opacity-0 group-hover:opacity-100 hover:bg-accent flex items-center justify-center"
                        aria-label="Chat options"
                      >
                        <span className="text-xs">⋯</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteSessionById(conv.session_id)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
