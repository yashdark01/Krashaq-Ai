'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getBottomNavForRole } from '@/lib/navigation/main-nav';

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const navItems = getBottomNavForRole(user?.role);

  if (!isAuthenticated) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/75 backdrop-blur-xl md:hidden safe-bottom"
      aria-label="Main navigation"
    >
      <ul className="flex h-bottom-nav items-stretch justify-around px-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                className={cn(
                  'krashaq-touch-target flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
