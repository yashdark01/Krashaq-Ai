import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tools_used?: string[];
  llm_provider?: string;
  llm_model?: string;
  detected_crop?: string | null;
  language?: string;
  feedback?: 'up' | 'down' | null;
}

export interface SessionSummary {
  session_id: string;
  title: string;
  updated_at: Date;
  message_count: number;
}

function deriveTitle(messages: StoredMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser?.content) return 'New conversation';
  const trimmed = firstUser.content.trim();
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

export async function getOrCreateSession(
  phone?: string | null,
  sessionId?: string | null
): Promise<string> {
  if (sessionId) return sessionId;
  if (phone) return `phone_${phone}`;
  return `session_${randomUUID()}`;
}

export async function loadConversationHistory(sessionId: string, limit = 20) {
  const collection = await getCollection('chat_sessions');
  const doc = await collection.findOne({ session_id: sessionId });
  const messages = (doc?.messages as StoredMessage[]) ?? [];
  return messages.slice(-limit);
}

export async function getSessionMessages(
  sessionId: string,
  skip = 0,
  limit = 100
): Promise<{ items: StoredMessage[]; total: number }> {
  const collection = await getCollection('chat_sessions');
  const doc = await collection.findOne({ session_id: sessionId });
  const messages = (doc?.messages as StoredMessage[]) ?? [];
  const total = messages.length;
  const items = messages.slice(skip, skip + limit);
  return { items, total };
}

export async function listSessions(limit = 30): Promise<SessionSummary[]> {
  const collection = await getCollection('chat_sessions');
  const docs = await collection
    .find({ 'messages.0': { $exists: true } })
    .sort({ updated_at: -1 })
    .limit(limit)
    .toArray();

  return docs.map((doc) => {
    const messages = (doc.messages as StoredMessage[]) ?? [];
    return {
      session_id: doc.session_id as string,
      title: (doc.title as string) || deriveTitle(messages),
      updated_at: (doc.updated_at as Date) ?? new Date(),
      message_count: messages.length,
    };
  });
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const collection = await getCollection('chat_sessions');
  const result = await collection.deleteOne({ session_id: sessionId });
  return result.deletedCount > 0;
}

export async function setSessionTitle(sessionId: string, title: string): Promise<void> {
  const collection = await getCollection('chat_sessions');
  await collection.updateOne(
    { session_id: sessionId },
    { $set: { title: title.trim(), updated_at: new Date() } }
  );
}

export async function appendConversation(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  meta?: Partial<
    Pick<StoredMessage, 'tools_used' | 'llm_provider' | 'llm_model' | 'detected_crop' | 'language'>
  >
): Promise<string> {
  const messageId = randomUUID();
  const collection = await getCollection('chat_sessions');
  const message: StoredMessage = {
    id: messageId,
    role,
    content,
    timestamp: new Date(),
    ...meta,
  };

  const doc = await collection.findOne({ session_id: sessionId });
  const isFirstUser = role === 'user' && !(doc?.messages as StoredMessage[] | undefined)?.length;

  await collection.updateOne(
    { session_id: sessionId },
    {
      $push: { messages: message },
      $set: {
        updated_at: new Date(),
        ...(isFirstUser ? { title: deriveTitle([message]) } : {}),
      },
      $setOnInsert: { created_at: new Date() },
    } as never,
    { upsert: true }
  );

  return messageId;
}

export async function setMessageFeedback(
  sessionId: string,
  messageId: string,
  feedback: 'up' | 'down' | null
): Promise<boolean> {
  const collection = await getCollection('chat_sessions');
  const doc = await collection.findOne({ session_id: sessionId });
  if (!doc) return false;

  const messages = (doc.messages as StoredMessage[]) ?? [];
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx === -1) return false;

  messages[idx] = { ...messages[idx], feedback };
  await collection.updateOne(
    { session_id: sessionId },
    { $set: { messages, updated_at: new Date() } }
  );
  return true;
}
