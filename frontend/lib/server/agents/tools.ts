import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatWeatherForFarmer, getWeather } from '@/lib/server/services/weather';
import { getIrrigationAdvice, detectCrop } from '@/lib/server/services/irrigation';
import {
  formatWebSearchForPrompt,
  isTavilyConfigured,
  searchWeb,
} from '@/lib/server/services/tavily-search';
import { shouldUseWebSearch } from '@/lib/server/services/web-search-query';
import { searchKbWithCitations } from '@/lib/server/services/rag-service';
import { getFertilizerRecommendation } from '@/lib/server/services/fertilizer';
import { getCollection } from '@/lib/server/db/mongodb';

export interface ToolContext {
  location: string;
  language: string;
  message: string;
  user_id?: string;
  user_role?: string;
}

export function buildKrashaqTools(ctx: ToolContext) {
  const fetchWeather = tool(
    async ({ location }) => {
      const weather = await getWeather(location);
      if (!weather.success) return `Unable to fetch weather for ${location}`;
      return formatWeatherForFarmer(weather);
    },
    {
      name: 'fetch_weather',
      description: 'Get current weather for a location in India. Use when user asks about mausam, temperature, rain.',
      schema: z.object({
        location: z.string().describe('City, district or locality in India'),
      }),
    }
  );

  const fetchIrrigationAdvice = tool(
    async ({ location, crop }) => {
      const weather = await getWeather(location);
      if (!weather.success) return 'Weather unavailable for irrigation advice.';
      let advice = getIrrigationAdvice(weather);
      if (crop) advice += `\n\nCrop context: ${crop}`;
      return advice;
    },
    {
      name: 'fetch_irrigation_advice',
      description: 'Get irrigation and watering advice based on weather and optional crop.',
      schema: z.object({
        location: z.string(),
        crop: z.string().optional(),
      }),
    }
  );

  const webSearch = tool(
    async ({ query }) => {
      if (!isTavilyConfigured()) return 'Web search not configured.';
      const result = await searchWeb({
        message: query,
        location: ctx.location,
        language: ctx.language,
      });
      return formatWebSearchForPrompt(result);
    },
    {
      name: 'web_search',
      description: 'Search the web for latest schemes, MSP, market prices, pest alerts, and policy updates.',
      schema: z.object({ query: z.string() }),
    }
  );

  const searchKnowledgeBase = tool(
    async ({ query }) => {
      const result = await searchKbWithCitations(query, 5);
      if (!result.hasRelevant) {
        return 'No matching verified documents in knowledge base. Do not guess scheme details.';
      }
      return result.chunks
        .map((d, i) => `[KB${i + 1}] ${d.title}\n${d.content.slice(0, 800)}`)
        .join('\n\n');
    },
    {
      name: 'search_knowledge_base',
      description: 'Search Krashaq verified agritech knowledge base for crops, pests, and farming practices.',
      schema: z.object({ query: z.string() }),
    }
  );

  const fetchFertilizerAdvice = tool(
    async ({ crop, soil_type, growth_stage }) => {
      return getFertilizerRecommendation(crop, soil_type, growth_stage);
    },
    {
      name: 'fetch_fertilizer_advice',
      description:
        'Get fertilizer and nutrient recommendations for a crop. Use for khad, urea, DAP, NPK questions.',
      schema: z.object({
        crop: z.string().describe('Crop name e.g. wheat, rice, soybean'),
        soil_type: z.string().optional().describe('clay, sandy, loamy, black, red, saline'),
        growth_stage: z
          .string()
          .optional()
          .describe('sowing, vegetative, flowering, fruiting, ripening'),
      }),
    }
  );

  const analyzeCropNeeds = tool(
    async ({ crop, location }) => {
      const weather = await getWeather(location);
      const cropName = crop || detectCrop(ctx.message) || 'general crop';
      const parts = [`🌱 Crop analysis for ${cropName} in ${location}:`];

      if (weather.success) {
        parts.push(formatWeatherForFarmer(weather));
        parts.push(getIrrigationAdvice(weather));
      }

      parts.push(getFertilizerRecommendation(cropName));
      const kb = await searchKbWithCitations(`${cropName} cultivation`, 2);
      if (kb.chunks.length) {
        parts.push(
          'Knowledge base:\n' +
            kb.chunks.map((d) => `- ${d.title}: ${d.content.slice(0, 300)}`).join('\n')
        );
      }

      return parts.join('\n\n');
    },
    {
      name: 'analyze_crop_needs',
      description:
        'Holistic crop guidance combining weather, irrigation, and fertilizer for a crop at a location.',
      schema: z.object({
        crop: z.string(),
        location: z.string(),
      }),
    }
  );

  const getFarmerContext = tool(
    async () => {
      if (!ctx.user_id) return 'Farmer profile not available.';
      const users = await getCollection('users');
      const user = await users.findOne({ _id: ctx.user_id } as never);
      if (!user) return 'Farmer profile not found.';

      const lines = [
        `Name: ${user.name}`,
        `Role: ${user.role ?? 'farmer'}`,
        `Location: ${user.default_location ?? user.district ?? user.state ?? 'not set'}`,
      ];
      if (user.state) lines.push(`State: ${user.state}`);
      if (user.district) lines.push(`District: ${user.district}`);
      if (user.supplier_id) lines.push(`Linked supplier: ${user.supplier_id}`);
      return lines.join('\n');
    },
    {
      name: 'get_farmer_context',
      description: 'Load the logged-in farmer profile — location, role, linked supplier.',
      schema: z.object({}),
    }
  );

  return [
    fetchWeather,
    fetchIrrigationAdvice,
    fetchFertilizerAdvice,
    analyzeCropNeeds,
    webSearch,
    searchKnowledgeBase,
    getFarmerContext,
  ];
}

export function suggestToolsForMessage(message: string, location: string) {
  const crop = detectCrop(message);
  const hints: string[] = [];
  if (/weather|mausam|temperature|rain|barish/i.test(message)) {
    hints.push(`fetch_weather(location="${location}")`);
  }
  if (/irrigation|paani|sinchai|water/i.test(message)) {
    hints.push(`fetch_irrigation_advice(location="${location}", crop="${crop ?? ''}")`);
  }
  if (shouldUseWebSearch(message)) hints.push('web_search');
  if (/pest|disease|fertilizer|crop|fasal|wheat|soybean|rice/i.test(message)) {
    hints.push('search_knowledge_base');
  }
  return hints;
}
