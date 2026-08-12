'use client';

import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MainLayout } from '@/components/layout/MainLayout';
import { SupplierUsagePanel } from '@/modules/supplier/components/SupplierUsagePanel';
import { Button } from '@/components/ui/button';

export default function SupplierAnalyticsPage() {
  return (
    <RoleGuard roles={['supplier']} message="Supplier access required">
      <MainLayout>
        <div className="krashaq-page-padding max-w-5xl mx-auto py-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display">Farmer analytics</h1>
              <p className="text-sm text-muted-foreground">
                Track how your farmers use Krashaq — chat activity, engagement, and license usage
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/supplier">← Supplier hub</Link>
            </Button>
          </div>

          <SupplierUsagePanel showFarmerLinks />
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
