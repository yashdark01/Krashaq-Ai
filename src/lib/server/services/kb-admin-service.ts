import { getCollection } from '@/lib/server/db/mongodb';
import { logAdminAction } from '@/lib/server/services/audit-service';
import {
  getKbIndexStatus,
  rebuildFaissIndex,
  slugifyTitle,
  syncDocumentChunks,
  type KbDocumentRecord,
  type KbIndexStatus,
} from '@/lib/server/rag/kb-ingest-core';

export type { KbDocumentRecord, KbIndexStatus };

export const KB_CATEGORIES = ['scheme', 'crop', 'pest', 'irrigation', 'general'] as const;
export type KbCategory = (typeof KB_CATEGORIES)[number];

export interface CreateKbDocumentInput {
  title: string;
  category: KbCategory;
  tags: string[];
  search_aliases: string;
  content: string;
  status: 'draft' | 'published';
}

export type UpdateKbDocumentInput = Partial<CreateKbDocumentInput>;

function mapDocument(doc: Record<string, unknown>): KbDocumentRecord {
  return {
    id: String(doc._id),
    slug: String(doc.slug ?? ''),
    title: String(doc.title),
    category: String(doc.category ?? 'general'),
    tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
    search_aliases: String(doc.search_aliases ?? ''),
    content: String(doc.content ?? ''),
    status: (doc.status as 'draft' | 'published') ?? 'published',
    chunk_count: Number(doc.chunk_count ?? 0),
    source: (doc.source as 'admin' | 'file') ?? 'admin',
    created_by: doc.created_by ? String(doc.created_by) : null,
    updated_by: doc.updated_by ? String(doc.updated_by) : null,
    created_at: doc.created_at as Date,
    updated_at: doc.updated_at as Date,
  };
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const col = await getCollection('kb_documents');
  let slug = baseSlug || 'document';
  let suffix = 0;

  while (true) {
    const candidate = suffix ? `${slug}-${suffix}` : slug;
    const existing = await col.findOne({ slug: candidate } as Record<string, unknown>);
    if (!existing || String(existing._id) === excludeId) return candidate;
    suffix += 1;
  }
}

async function indexDocumentIfPublished(
  docId: string,
  doc: CreateKbDocumentInput
): Promise<{ chunk_count: number; indexed: boolean }> {
  const chunkCount = await syncDocumentChunks(docId, doc);
  const docsCol = await getCollection('kb_documents');
  const publishedCount = await docsCol.countDocuments({ status: { $ne: 'draft' } });

  if (publishedCount === 0) {
    return { chunk_count: chunkCount, indexed: false };
  }

  await rebuildFaissIndex();
  return { chunk_count: chunkCount, indexed: doc.status !== 'draft' };
}

export async function listKbDocuments(params?: {
  q?: string;
  category?: string;
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<{ items: KbDocumentRecord[]; total: number }> {
  const col = await getCollection('kb_documents');
  const filter: Record<string, unknown> = {};

  if (params?.category && params.category !== 'all') {
    filter.category = params.category;
  }
  if (params?.status && params.status !== 'all') {
    filter.status = params.status;
  }
  if (params?.q?.trim()) {
    const q = params.q.trim();
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { content: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
      { search_aliases: { $regex: q, $options: 'i' } },
    ];
  }

  const skip = params?.skip ?? 0;
  const limit = Math.min(params?.limit ?? 50, 100);

  const [docs, total] = await Promise.all([
    col.find(filter).sort({ updated_at: -1 }).skip(skip).limit(limit).toArray(),
    col.countDocuments(filter),
  ]);

  return { items: docs.map((d) => mapDocument(d as Record<string, unknown>)), total };
}

export async function getKbDocument(id: string): Promise<KbDocumentRecord | null> {
  const col = await getCollection('kb_documents');
  const doc = await col.findOne({ _id: id } as Record<string, unknown>);
  return doc ? mapDocument(doc as Record<string, unknown>) : null;
}

export async function createKbDocument(
  input: CreateKbDocumentInput,
  admin: { id: string; name: string }
): Promise<KbDocumentRecord> {
  const col = await getCollection('kb_documents');
  const slug = await ensureUniqueSlug(slugifyTitle(input.title));
  const docId = `kb-${slug}`;
  const now = new Date();

  const record = {
    _id: docId,
    slug,
    title: input.title.trim(),
    category: input.category,
    tags: input.tags,
    search_aliases: input.search_aliases.trim(),
    content: input.content.trim(),
    status: input.status,
    chunk_count: 0,
    source: 'admin' as const,
    created_by: admin.id,
    updated_by: admin.id,
    created_at: now,
    updated_at: now,
  };

  await col.insertOne(record as never);

  const { chunk_count, indexed } = await indexDocumentIfPublished(docId, input);

  await col.updateOne(
    { _id: docId } as Record<string, unknown>,
    { $set: { chunk_count, updated_at: new Date() } }
  );

  await logAdminAction(admin.id, admin.name, 'kb_document_create', 'kb_document', docId, {
    title: input.title,
    status: input.status,
    indexed,
    chunk_count,
  });

  const created = await getKbDocument(docId);
  if (!created) throw new Error('Failed to load created document');
  return created;
}

export async function updateKbDocument(
  id: string,
  input: UpdateKbDocumentInput,
  admin: { id: string; name: string }
): Promise<KbDocumentRecord> {
  const col = await getCollection('kb_documents');
  const existing = await getKbDocument(id);
  if (!existing) throw new Error('Document not found');

  const next: CreateKbDocumentInput = {
    title: input.title?.trim() ?? existing.title,
    category: input.category ?? (existing.category as KbCategory),
    tags: input.tags ?? existing.tags,
    search_aliases: input.search_aliases?.trim() ?? existing.search_aliases,
    content: input.content?.trim() ?? existing.content,
    status: input.status ?? existing.status,
  };

  let slug = existing.slug;
  if (input.title && slugifyTitle(input.title) !== slugifyTitle(existing.title)) {
    slug = await ensureUniqueSlug(slugifyTitle(next.title), id);
  }

  const now = new Date();
  await col.updateOne(
    { _id: id } as Record<string, unknown>,
    {
      $set: {
        slug,
        title: next.title,
        category: next.category,
        tags: next.tags,
        search_aliases: next.search_aliases,
        content: next.content,
        status: next.status,
        updated_by: admin.id,
        updated_at: now,
      },
    }
  );

  const { chunk_count, indexed } = await indexDocumentIfPublished(id, next);

  await col.updateOne(
    { _id: id } as Record<string, unknown>,
    { $set: { chunk_count, updated_at: new Date() } }
  );

  await logAdminAction(admin.id, admin.name, 'kb_document_update', 'kb_document', id, {
    title: next.title,
    status: next.status,
    indexed,
    chunk_count,
  });

  const updated = await getKbDocument(id);
  if (!updated) throw new Error('Failed to load updated document');
  return updated;
}

export async function deleteKbDocument(
  id: string,
  admin: { id: string; name: string }
): Promise<void> {
  const col = await getCollection('kb_documents');
  const chunksCol = await getCollection('kb_chunks');
  const existing = await getKbDocument(id);
  if (!existing) throw new Error('Document not found');

  await chunksCol.deleteMany({ doc_id: id });
  await col.deleteOne({ _id: id } as Record<string, unknown>);

  const remaining = await col.countDocuments({ status: { $ne: 'draft' } });
  if (remaining > 0) {
    await rebuildFaissIndex();
  }

  await logAdminAction(admin.id, admin.name, 'kb_document_delete', 'kb_document', id, {
    title: existing.title,
  });
}

export async function reindexKbFromMongo(admin: { id: string; name: string }): Promise<KbIndexStatus> {
  const meta = await rebuildFaissIndex();

  await logAdminAction(admin.id, admin.name, 'kb_reindex', 'kb_index', null, {
    chunk_count: meta.chunk_count,
    model: meta.model,
    provider: meta.provider,
  });

  return getKbIndexStatus();
}

export { getKbIndexStatus };
