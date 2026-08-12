'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, MessageSquare, Settings, User, Home, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  className?: string;
}

const mainLinks = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/farmers', label: 'Farmers', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/profile/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [conversations] = useState([
    { id: '1', title: 'Weather in Delhi', date: 'Today' },
    { id: '2', title: 'Wheat irrigation advice', date: 'Yesterday' },
  ]);

  return (
    <aside
      className={cn('flex h-full w-64 shrink-0 flex-col border-r bg-muted/30', className)}
      aria-label="Sidebar navigation"
    >
      <div className="p-4">
        <Button className="w-full justify-start gap-2" variant="default" size="default">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Chat
        </Button>
      </div>

      <nav className="px-3 pb-2">
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Menu
        </p>
        <ul className="space-y-0.5">
          {mainLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
          {isAdmin() && (
            <li>
              <Link
                href="/admin"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  pathname.startsWith('/admin')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
                Admin
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-2 p-2">
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent chats
          </p>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-left text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{conv.title}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
