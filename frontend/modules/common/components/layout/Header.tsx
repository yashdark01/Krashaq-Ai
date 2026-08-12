'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Sprout,
  Settings,
  LogOut,
  User,
  Shield,
  Clock,
  MapPin,
  SunMedium,
  PanelLeft,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useSidebar } from '@/contexts/SidebarContext';
import { SidebarSheet } from './SidebarSheet';
import Link from 'next/link';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/chat': 'Chat',
  '/farmers': 'Farmers',
  '/profile': 'Profile',
  '/profile/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const { fieldMode, toggleFieldMode } = useFieldMode();
  const { toggle, mobileOpen, setMobileOpen, isMobile } = useSidebar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const locationLabel = user?.locality || user?.district || user?.state || null;

  const pageTitle =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith('/chat/') ? 'Chat' : pathname.startsWith('/admin') ? 'Admin' : '');

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-header items-center justify-between gap-2 px-3 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 md:hidden"
              onClick={() => (isMobile ? setMobileOpen(true) : toggle())}
              aria-label="Open navigation"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 hidden md:inline-flex"
              onClick={toggle}
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex items-center gap-2">
              <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sprout className="h-4 w-4" aria-hidden />
              </div>
              {pageTitle && (
                <span className="font-display text-sm font-semibold truncate">{pageTitle}</span>
              )}
            </div>
          </div>

          {locationLabel && (
            <Badge variant="outline" className="hidden sm:inline-flex max-w-[160px] truncate gap-1">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{locationLabel}</span>
            </Badge>
          )}

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={toggleFieldMode}
              className="krashaq-touch-target hidden sm:inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-pressed={fieldMode}
              aria-label={fieldMode ? 'Disable field mode' : 'Enable field mode'}
              title="Field mode"
            >
              <SunMedium className="h-4 w-4" />
            </button>
            <ThemeToggle />

            {user && (
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="krashaq-touch-target rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ml-1"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-8 w-8">
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
                    {fieldMode ? 'Disable field mode' : 'Field mode'}
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
      <SidebarSheet open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
}
