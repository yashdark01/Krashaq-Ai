'use client';

import { CloudSun, Droplets, Wind, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CloudSun className="h-5 w-5 text-primary" />
            Weather
          </CardTitle>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Input
              value={fullLocation || location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="h-7 w-48 text-sm"
              placeholder="Location"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {weather ? (
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{Math.round(weather.temp)}°</span>
              <span className="text-sm text-muted-foreground mb-1">
                Feels like {Math.round(weather.feels_like)}°
              </span>
              <Badge variant="secondary" className="ml-auto">
                {weather.condition}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="flex flex-col items-center gap-1">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">{weather.humidity}%</span>
                <span className="text-xs text-muted-foreground">Humidity</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Wind className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{weather.wind_speed.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">km/h</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <CloudSun className="h-4 w-4 text-cyan-500" />
                <span className="text-sm font-medium">{weather.rain}mm</span>
                <span className="text-xs text-muted-foreground">Rain</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">Loading weather data...</div>
        )}
      </CardContent>
    </Card>
  );
}
