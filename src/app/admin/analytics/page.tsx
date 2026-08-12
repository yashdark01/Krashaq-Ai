'use client';

import { RoleGuard } from '@/components/auth/RoleGuard';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';

export default function AdminAnalyticsPage() {
  return (
    <RoleGuard roles={['admin']} message="Admin access required">
      <div className="container mx-auto py-8">
        <AnalyticsDashboard />
      </div>
    </RoleGuard>
  );
}
