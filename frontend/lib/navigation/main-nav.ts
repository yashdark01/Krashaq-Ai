import type { LucideIcon } from 'lucide-react';
import { Home, MessageSquare, Users, User, Settings, Building2, Bell, LayoutDashboard, KeyRound, BarChart3, CreditCard } from 'lucide-react';
import { hasRole, type Role } from '@/lib/auth/roles';

export interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  roles: Role[];
}

export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  { href: '/', label: 'Dashboard', icon: Home, exact: true, roles: ['admin', 'farmer'] },
  { href: '/supplier', label: 'Dashboard', icon: LayoutDashboard, exact: true, roles: ['supplier'] },
  { href: '/chat', label: 'Chat', icon: MessageSquare, exact: false, roles: ['admin', 'supplier', 'farmer'] },
  { href: '/admin/suppliers', label: 'Suppliers', icon: Building2, exact: false, roles: ['admin'] },
  { href: '/farmers', label: 'Farmers', icon: Users, exact: false, roles: ['supplier'] },
  { href: '/supplier/subscriptions', label: 'Subscriptions', icon: CreditCard, exact: false, roles: ['supplier'] },
  { href: '/supplier/analytics', label: 'Analytics', icon: BarChart3, exact: false, roles: ['supplier'] },
  { href: '/supplier/alerts', label: 'Alerts', icon: Bell, exact: false, roles: ['supplier'] },
  { href: '/farmer/subscription', label: 'Subscription', icon: KeyRound, exact: false, roles: ['farmer'] },
  { href: '/profile', label: 'Profile', icon: User, exact: false, roles: ['admin', 'supplier', 'farmer'] },
  {
    href: '/profile/settings',
    label: 'Settings',
    icon: Settings,
    exact: false,
    roles: ['admin', 'supplier', 'farmer'],
  },
];

export function getMainNavForRole(role: string | undefined | null): NavItemConfig[] {
  return MAIN_NAV_ITEMS.filter((item) => hasRole(role, item.roles));
}

export const BOTTOM_NAV_ITEMS: NavItemConfig[] = [
  { href: '/', label: 'Home', icon: Home, exact: true, roles: ['admin', 'farmer'] },
  { href: '/supplier', label: 'Home', icon: LayoutDashboard, exact: true, roles: ['supplier'] },
  { href: '/chat', label: 'Chat', icon: MessageSquare, exact: false, roles: ['admin', 'supplier', 'farmer'] },
  { href: '/farmers', label: 'Farmers', icon: Users, exact: false, roles: ['supplier'] },
  { href: '/supplier/subscriptions', label: 'Subs', icon: CreditCard, exact: false, roles: ['supplier'] },
  { href: '/supplier/analytics', label: 'Stats', icon: BarChart3, exact: false, roles: ['supplier'] },
  { href: '/farmer/subscription', label: 'Plan', icon: KeyRound, exact: false, roles: ['farmer'] },
  { href: '/profile', label: 'Profile', icon: User, exact: false, roles: ['admin', 'supplier', 'farmer'] },
];

export function getBottomNavForRole(role: string | undefined | null): NavItemConfig[] {
  return BOTTOM_NAV_ITEMS.filter((item) => hasRole(role, item.roles));
}
