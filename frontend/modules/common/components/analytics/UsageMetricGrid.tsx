'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export interface UsageMetric {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
}

export function UsageMetricGrid({ metrics }: { metrics: UsageMetric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m) => (
        <Card key={m.label}>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              {m.icon && <m.icon className="h-3.5 w-3.5" />}
              {m.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold tabular-nums">{m.value}</p>
            {m.hint && <p className="text-xs text-muted-foreground mt-1">{m.hint}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
