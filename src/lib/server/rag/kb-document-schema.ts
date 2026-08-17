import { z } from 'zod';
import { KB_CATEGORIES } from '@/lib/server/services/kb-admin-service';

export const kbDocumentBodySchema = z.object({
  title: z.string().trim().min(3).max(200),
  category: z.enum(KB_CATEGORIES).default('general'),
  tags: z.array(z.string().trim().min(1)).max(20).default([]),
  search_aliases: z.string().max(2000).default(''),
  content: z.string().trim().min(20).max(50000),
  status: z.enum(['draft', 'published']).default('published'),
});

export const kbDocumentUpdateSchema = kbDocumentBodySchema.partial();

export function parseTagsInput(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}
