'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { WeatherCard } from '@/components/dashboard/WeatherCard';
import { IrrigationPanel } from '@/components/dashboard/IrrigationPanel';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

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

  useEffect(() => {
    // Auto-load user's location from hierarchy with fallbacks
    if (user) {
      const userLocation =
        user?.locality || user?.tehsil || user?.district || user?.state || 'Delhi';
      setLocation(userLocation);

      // Build full location string with commas
      const locationParts = [];
      if (user?.locality) locationParts.push(user.locality);
      if (user?.tehsil) locationParts.push(`${user.tehsil} Tehsil`);
      if (user?.district) locationParts.push(`${user.district} District`);
      if (user?.state) locationParts.push(user.state);

      setFullLocation(locationParts.length > 0 ? locationParts.join(', ') : 'Delhi');
    }
  }, [user]);

  const fetchWeather = async () => {
    try {
      const params = new URLSearchParams();
      params.append('city', location);

      // Add location hierarchy parameters for better accuracy
      if (user?.locality) params.append('locality', user.locality);
      if (user?.tehsil) params.append('tehsil', user.tehsil);
      if (user?.district) params.append('district', user.district);
      if (user?.state) params.append('state', user.state);

      const res = await fetch(`/api/weather?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    }
  };

  // Fetch weather on mount and location change
  useEffect(() => {
    fetchWeather();
  }, [location]);

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="h-full flex flex-col p-6 gap-6">
          {/* Dashboard Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
            <WeatherCard
              weather={weather}
              onLocationChange={setLocation}
              location={location}
              fullLocation={fullLocation}
            />
            <IrrigationPanel />
          </div>

          {/* Chat Section */}
          <div className="flex-1 min-h-0">
            <ChatInterface
              location={location}
              onLocationChange={setLocation}
              fullLocation={fullLocation}
            />
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
