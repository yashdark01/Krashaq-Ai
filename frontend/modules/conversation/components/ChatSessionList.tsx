'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, Pencil, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useChatSessions } from '@/contexts/ChatSessionsContext';
import { filterSessionsByQuery, groupSessionsByDate } from '@/lib/chat/session-groups';
import type { ChatSessionSummary } from '@/modules/conversation/types/message';

interface ChatSessionListProps {
  onNavigate?: () => void;
}

function SessionRow({
  conv,
  active,
  onOpen,
  onRename,
  onDelete,
}: {
  conv: ChatSessionSummary;
  active: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-0.5">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex flex-1 min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors',
          active
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
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ChatSessionList({ onNavigate }: ChatSessionListProps) {
  const pathname = usePathname();
  const {
    sessions,
    sessionsLoading,
    openSession,
    deleteSessionById,
    renameSessionById,
  } = useChatSessions();
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => filterSessionsByQuery(sessions, search),
    [sessions, search]
  );
  const grouped = useMemo(() => groupSessionsByDate(filtered), [filtered]);

  const handleRename = async (conv: ChatSessionSummary) => {
    const next = window.prompt('Rename conversation', conv.title);
    if (next?.trim()) {
      await renameSessionById(conv.session_id, next.trim());
    }
  };

  const handleDelete = async (conv: ChatSessionSummary) => {
    if (window.confirm(`Delete "${conv.title}"? This cannot be undone.`)) {
      await deleteSessionById(conv.session_id);
    }
  };

  return (
    <div className="space-y-2 p-2">
      <div className="relative px-1">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats…"
          className="h-8 pl-8 text-xs bg-secondary/50"
        />
      </div>

      {sessionsLoading ? (
        <p className="px-2 py-2 text-xs text-muted-foreground">Loading chats…</p>
      ) : filtered.length === 0 ? (
        <p className="px-2 py-2 text-xs text-muted-foreground">
          {search ? 'No chats match your search' : 'No conversations yet'}
        </p>
      ) : (
        grouped.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            {group.sessions.map((conv) => (
              <SessionRow
                key={conv.session_id}
                conv={conv}
                active={pathname === `/chat/${conv.session_id}`}
                onOpen={() => {
                  openSession(conv.session_id);
                  onNavigate?.();
                }}
                onRename={() => handleRename(conv)}
                onDelete={() => handleDelete(conv)}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
