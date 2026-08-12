'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { WeatherCard } from '@/components/dashboard/WeatherCard';
import { IrrigationPanel } from '@/components/dashboard/IrrigationPanel';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/modules/common/components/states/ErrorState';

interface WeatherData {
  city: string;
  temp: number;
  feels_like: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  rain: number;
}

export default function Home() {
  const { user } = useAuth();
  const [location, setLocation] = useState('Delhi');
  const [fullLocation, setFullLocation] = useState('Delhi');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);

  useEffect(() => {
    if (user) {
      const userLocation =
        user?.locality || user?.tehsil || user?.district || user?.state || 'Delhi';
      setLocation(userLocation);

      const locationParts = [];
      if (user?.locality) locationParts.push(user.locality);
      if (user?.tehsil) locationParts.push(`${user.tehsil} Tehsil`);
      if (user?.district) locationParts.push(`${user.district} District`);
      if (user?.state) locationParts.push(user.state);

      setFullLocation(locationParts.length > 0 ? locationParts.join(', ') : 'Delhi');
    }
  }, [user]);

  const fetchWeather = async () => {
    setWeatherLoading(true);
    setWeatherError(false);
    try {
      const params = new URLSearchParams();
      params.append('city', location);

      if (user?.locality) params.append('locality', user.locality);
      if (user?.tehsil) params.append('tehsil', user.tehsil);
      if (user?.district) params.append('district', user.district);
      if (user?.state) params.append('state', user.state);

      const res = await fetch(`/api/weather?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      } else {
        setWeatherError(true);
      }
    } catch {
      setWeatherError(true);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [location]);

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="krashaq-page-padding flex h-full flex-col gap-4 md:gap-6 max-w-7xl mx-auto">
          {/* Bento dashboard — mobile stacks, desktop 2-col */}
          <section aria-label="Farm insights" className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
            {weatherLoading ? (
              <>
                <Skeleton className="h-44 rounded-xl" />
                <Skeleton className="h-44 rounded-xl" />
              </>
            ) : weatherError ? (
              <div className="md:col-span-2">
                <ErrorState
                  title="Weather unavailable"
                  message="Could not load weather for your location."
                  onRetry={fetchWeather}
                />
              </div>
            ) : (
              <>
                <WeatherCard
                  weather={weather}
                  onLocationChange={setLocation}
                  location={location}
                  fullLocation={fullLocation}
                />
                <IrrigationPanel />
              </>
            )}
          </section>

          <section id="krashaq-chat" aria-label="AI chat" className="flex-1 min-h-[420px] md:min-h-0">
            <ChatInterface
              location={location}
              onLocationChange={setLocation}
              fullLocation={fullLocation}
            />
          </section>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
