import { cacheGet, cacheSet } from '@/lib/server/cache/redis';
import { getConfig } from '@/lib/server/config';

export interface WeatherData {
  city: string;
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  condition: string;
  wind_speed: number;
  rain: number;
  clouds: number;
  success: boolean;
  error?: string;
}

export async function getWeather(city: string, useCache = true): Promise<WeatherData> {
  const cacheKey = `weather:${city.toLowerCase()}`;

  if (useCache) {
    const cached = await cacheGet<WeatherData>(cacheKey);
    if (cached) return cached;
  }

  const { weatherApiKey } = getConfig();

  if (!weatherApiKey) {
    return {
      city,
      temp: 32,
      feels_like: 32,
      humidity: 60,
      pressure: 1010,
      condition: 'unknown',
      wind_speed: 0,
      rain: 0,
      clouds: 0,
      success: false,
      error: 'WEATHER_API_KEY not configured',
    };
  }

  try {
    const url = new URL('https://api.weatherapi.com/v1/current.json');
    url.searchParams.set('key', weatherApiKey);
    url.searchParams.set('q', city);
    url.searchParams.set('aqi', 'no');

    const response = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!response.ok) throw new Error(`WeatherAPI ${response.status}`);

    const data = await response.json();
    const weather: WeatherData = {
      city,
      temp: Math.round(data.current.temp_c),
      feels_like: Math.round(data.current.feelslike_c),
      humidity: data.current.humidity,
      pressure: data.current.pressure_mb,
      condition: data.current.condition.text,
      wind_speed: data.current.wind_kph / 3.6,
      rain: data.current.precip_mm,
      clouds: data.current.cloud,
      success: true,
    };

    if (useCache) await cacheSet(cacheKey, weather, 1200);
    return weather;
  } catch (error) {
    return {
      city,
      temp: 32,
      feels_like: 32,
      humidity: 60,
      pressure: 1010,
      condition: 'unknown',
      wind_speed: 0,
      rain: 0,
      clouds: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Weather fetch failed',
    };
  }
}

export function formatWeatherForFarmer(weather: WeatherData): string {
  if (!weather.success) {
    return '⚠️ Weather data unavailable. Using default recommendations.';
  }

  let emoji = weather.temp > 30 ? '☀️' : weather.temp > 20 ? '⛅' : '🌤️';
  if (weather.condition.toLowerCase().includes('rain')) emoji = '🌧️';
  if (weather.condition.toLowerCase().includes('cloud')) emoji = '☁️';

  const rainInfo = weather.rain > 0 ? `Rain (last hour): ${weather.rain}mm` : 'No recent rain';

  return `${emoji} Weather in ${weather.city}:\nTemperature: ${weather.temp}°C (feels like ${weather.feels_like}°C)\nCondition: ${weather.condition}\nHumidity: ${weather.humidity}%\n${rainInfo}`;
}
