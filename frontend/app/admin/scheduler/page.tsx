'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SchedulerConfigPanel from '@/components/admin/SchedulerConfigPanel';

export default function AdminSchedulerPage() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    } else if (!isLoading && isAuthenticated && !isAdmin()) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  if (!isAuthenticated || !isAdmin()) {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <SchedulerConfigPanel />
    </div>
  );
}
