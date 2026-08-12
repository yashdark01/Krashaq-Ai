'use client';

import { CloudSun, Droplets, Wind, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface WeatherData {
  city: string;
  temp: number;
  feels_like: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  rain: number;
}

interface WeatherCardProps {
  weather: WeatherData | null;
  onLocationChange: (location: string) => void;
  location: string;
  fullLocation?: string;
}

export function WeatherCard({
  weather,
  onLocationChange,
  location,
  fullLocation,
}: WeatherCardProps) {
  return (
    <Card variant="insight" className="h-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <CloudSun className="h-5 w-5 text-brand-sky" aria-hidden="true" />
            Weather
          </CardTitle>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Input
              value={fullLocation || location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="h-10 w-full sm:w-44 text-sm"
              placeholder="Your location"
              aria-label="Location"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {weather ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-wrap items-end gap-2">
              <span className="text-5xl font-bold tabular-nums tracking-tight">
                {Math.round(weather.temp)}°
              </span>
              <span className="pb-1 text-sm text-muted-foreground">
                Feels {Math.round(weather.feels_like)}°
              </span>
              <Badge variant="weather" className="ml-auto">
                <CloudSun className="h-3 w-3" aria-hidden="true" />
                {weather.condition}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t pt-4">
              <div className="flex flex-col items-center gap-1 text-center">
                <Droplets className="h-4 w-4 text-brand-sky" aria-hidden="true" />
                <span className="text-sm font-semibold tabular-nums">{weather.humidity}%</span>
                <span className="text-xs text-muted-foreground">Humidity</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Wind className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-semibold tabular-nums">
                  {weather.wind_speed.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">km/h wind</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Droplets className="h-4 w-4 text-brand-sky" aria-hidden="true" />
                <span className="text-sm font-semibold tabular-nums">{weather.rain}mm</span>
                <span className="text-xs text-muted-foreground">Rain</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
