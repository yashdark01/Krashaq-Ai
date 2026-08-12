import type { WeatherData } from '@/lib/server/services/weather';

export function getIrrigationAdvice(weather: WeatherData): string {
  if (!weather.success) {
    return '💧 Irrigation Advice:\n- Check soil moisture manually\n- Water early morning (6-8 AM) or evening (5-7 PM)\n- Avoid watering during peak heat';
  }

  const advice: string[] = [];
  let urgency = 'normal';

  if (weather.rain > 5) {
    advice.push('🌧️ Recent heavy rainfall detected. Skip irrigation today.');
    advice.push('Check soil drainage to prevent waterlogging.');
    urgency = 'low';
  } else if (weather.rain > 0) {
    advice.push('💧 Light rain detected. Reduce irrigation by 50%.');
    urgency = 'low';
  } else if (weather.temp > 38) {
    advice.push('🌡️ Extreme heat! Irrigate early morning (5-7 AM) only.');
    advice.push('Increase water volume by 20% due to high evaporation.');
    urgency = 'high';
  } else if (weather.temp > 35) {
    advice.push('🌡️ High temperature detected. Irrigate early morning (6-8 AM).');
    urgency = 'medium';
  } else if (weather.humidity < 30) {
    advice.push('🌵 Low humidity — soil dries faster. Evening irrigation recommended.');
    urgency = 'medium';
  } else {
    advice.push('💧 Normal irrigation conditions.');
    advice.push('Best time: Early morning (6-8 AM) or evening (5-7 PM).');
  }

  advice.push(`\nPriority: ${urgency.toUpperCase()}`);
  return `💧 Irrigation Advice:\n${advice.map((line) => `- ${line}`).join('\n')}`;
}

export function detectCrop(message: string): string | null {
  const crops = ['wheat', 'rice', 'cotton', 'soybean', 'maize', 'tomato', 'potato', 'onion'];
  const lower = message.toLowerCase();
  return crops.find((crop) => lower.includes(crop)) ?? null;
}

export function detectLanguage(message: string): 'en' | 'hi' | 'hinglish' {
  const hindiPattern = /[\u0900-\u097F]/;
  if (hindiPattern.test(message)) return 'hi';
  const hinglishWords = ['kya', 'kaise', 'hai', 'mera', 'aaj', 'paani', 'fasal'];
  if (hinglishWords.some((w) => message.toLowerCase().includes(w))) return 'hinglish';
  return 'en';
}
