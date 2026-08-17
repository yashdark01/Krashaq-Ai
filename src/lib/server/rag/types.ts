export interface KbChunkRecord {
  id: string;
  doc_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  chunk_index: number;
}

export interface KbCitation {
  id: string;
  doc_id: string;
  title: string;
  snippet: string;
  score: number;
  source: 'kb';
}

export interface SemanticSearchResult {
  chunks: KbChunkRecord[];
  citations: KbCitation[];
  hasRelevant: boolean;
  topScore: number;
}

export interface FaissIdMapEntry {
  faiss_id: number;
  chunk_id: string;
}

export interface FaissIndexMeta {
  version: number;
  provider?: string;
  model: string;
  dimension: number;
  chunk_count: number;
  built_at: string;
}
