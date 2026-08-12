'use client';

import { useState } from 'react';
import { Sprout, Settings, LogOut, User, Shield, Clock, MapPin, SunMedium } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useFieldMode } from '@/contexts/FieldModeContext';
import Link from 'next/link';

export function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { fieldMode, toggleFieldMode } = useFieldMode();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const locationLabel =
    user?.locality || user?.district || user?.state || null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-header items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sprout className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="font-display text-sm font-bold leading-tight">Krashaq</span>
            <span className="truncate text-[10px] text-muted-foreground hidden sm:block">
              Smart farming assistant
            </span>
          </div>
        </div>

        {locationLabel && (
          <Badge variant="outline" className="hidden sm:inline-flex max-w-[180px] truncate gap-1">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{locationLabel}</span>
          </Badge>
        )}

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleFieldMode}
            className="krashaq-touch-target hidden sm:inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-pressed={fieldMode}
            aria-label={fieldMode ? 'Disable field mode' : 'Enable field mode (high contrast)'}
            title="Field mode — high contrast for outdoor use"
          >
            <SunMedium className="h-4 w-4" />
          </button>
          <ThemeToggle />

          {user && (
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="krashaq-touch-target rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Account menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin() && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/scheduler">
                        <Clock className="mr-2 h-4 w-4" />
                        Scheduler
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleFieldMode} className="sm:hidden">
                  <SunMedium className="mr-2 h-4 w-4" />
                  {fieldMode ? 'Disable field mode' : 'Field mode (outdoor)'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
