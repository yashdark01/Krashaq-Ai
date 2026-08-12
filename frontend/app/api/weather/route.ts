import { NextRequest, NextResponse } from 'next/server';
import { getWeather } from '@/lib/server/services/weather';

export async function GET(request: NextRequest) {
  try {
    const city = request.nextUrl.searchParams.get('city');
    if (!city) {
      return NextResponse.json({ error: 'City parameter required' }, { status: 400 });
    }

    const data = await getWeather(city);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}
