'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { AuthLoading } from '@/modules/common/components/states/PageLoading';
import { hasRole, type Role } from '@/lib/auth/roles';

interface RoleGuardProps {
  roles: Role[];
  children: React.ReactNode;
  redirectTo?: string;
  message?: string;
}

export function RoleGuard({
  roles,
  children,
  redirectTo = '/',
  message = 'You do not have access to this page',
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const allowed = user ? hasRole(user.role, roles) : false;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!allowed) {
      addToast('error', message);
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, allowed, router, redirectTo, message, addToast]);

  if (isLoading) return <AuthLoading />;
  if (!isAuthenticated || !allowed) return null;

  return <>{children}</>;
}
