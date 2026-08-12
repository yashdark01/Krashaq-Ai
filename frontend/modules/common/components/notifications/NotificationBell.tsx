'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { fetchWithAuth, user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [countRes, listRes] = await Promise.all([
        fetchWithAuth('/api/farmer/notifications/unread'),
        fetchWithAuth('/api/farmer/notifications?limit=15'),
      ]);
      if (countRes.ok) {
        const d = await countRes.json();
        setUnread(d.unread ?? 0);
      }
      if (listRes.ok) {
        const d = await listRes.json();
        setItems(d.items ?? []);
      }
    } catch {
      /* ignore */
    }
  }, [fetchWithAuth, user]);

  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  const markRead = async (id: string) => {
    await fetchWithAuth(`/api/farmer/notifications/${id}`, { method: 'PATCH' });
    void refresh();
  };

  const markAllRead = async () => {
    await fetchWithAuth('/api/farmer/notifications', { method: 'PATCH' });
    void refresh();
  };

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="krashaq-touch-target relative inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">No notifications yet</p>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-1 py-3 cursor-pointer"
              onClick={() => !n.read && void markRead(n.id)}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{n.title}</span>
                {!n.read && <Badge variant="default" className="shrink-0 text-[10px]">New</Badge>}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
              <span className="text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/farmer/notifications" className="w-full text-center text-primary text-sm">
            View all
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
