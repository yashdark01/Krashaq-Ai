'use client';

import Link from 'next/link';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ChatPreviewProps {
  location: string;
}

const QUICK_ASKS = [
  { label: 'Weather', q: 'What is the weather today?' },
  { label: 'Irrigate', q: 'When should I irrigate?' },
  { label: 'Crop tips', q: 'Tips for my crop this season' },
];

export function ChatPreview({ location }: ChatPreviewProps) {
  return (
    <Card variant="insight" className="border-l-primary">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
          Ask Krashaq
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" asChild>
          <Link href="/chat">
            Open chat
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Get AI advice on weather, irrigation, and crops for{' '}
          <span className="font-medium text-foreground">{location}</span>.
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ASKS.map(({ label, q }) => (
            <Button key={label} variant="outline" size="sm" className="h-8 rounded-full text-xs" asChild>
              <Link href={`/chat?q=${encodeURIComponent(q)}`}>{label}</Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
