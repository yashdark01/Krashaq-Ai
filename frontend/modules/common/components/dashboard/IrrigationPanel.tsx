'use client';

import { Droplets, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface IrrigationPanelProps {
  lastIrrigation?: string;
  nextIrrigation?: string;
  urgency?: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export function IrrigationPanel({
  lastIrrigation = '2 days ago',
  nextIrrigation = 'Tomorrow, 6–8 AM',
  urgency = 'medium',
  recommendation = 'Moderate humidity — light irrigation recommended in the morning.',
}: IrrigationPanelProps) {
  const urgencyBadge = {
    low: { variant: 'success' as const, label: 'Low priority', icon: CheckCircle2 },
    medium: { variant: 'warning' as const, label: 'Irrigate soon', icon: Clock },
    high: { variant: 'warning' as const, label: 'Irrigate today', icon: AlertTriangle },
  };

  const { variant, label, icon: Icon } = urgencyBadge[urgency];

  return (
    <Card variant="insight" className="h-full border-l-brand-sky">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Droplets className="h-5 w-5 text-brand-sky" aria-hidden="true" />
          Irrigation advice
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 animate-fade-in">
          <p className="text-sm leading-relaxed text-foreground">{recommendation}</p>

          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Last irrigation</span>
              <span className="font-medium">{lastIrrigation}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Next suggested</span>
              <span className="font-medium text-primary">{nextIrrigation}</span>
            </div>
          </div>

          <Badge variant={variant} className="gap-1">
            <Icon className="h-3 w-3" aria-hidden="true" />
            {label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
