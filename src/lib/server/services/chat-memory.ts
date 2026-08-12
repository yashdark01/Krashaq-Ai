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
  starred?: boolean;
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

export async function getOrCreateSessionForUser(
  userId: string,
  sessionId?: string | null
): Promise<string> {
  if (sessionId) {
    const owned = await getSessionForUser(userId, sessionId);
    if (!owned) throw new Error('SESSION_NOT_FOUND');
    return sessionId;
  }
  return `sess_${randomUUID()}`;
}

export async function getSessionForUser(userId: string, sessionId: string) {
  const collection = await getCollection('chat_sessions');
  return collection.findOne({ session_id: sessionId, user_id: userId });
}

export async function loadConversationHistory(userId: string, sessionId: string, limit = 20) {
  const doc = await getSessionForUser(userId, sessionId);
  if (!doc) return [];
  const messages = (doc.messages as StoredMessage[]) ?? [];
  return messages.slice(-limit);
}

export async function getSessionMessages(
  userId: string,
  sessionId: string,
  skip = 0,
  limit = 100
): Promise<{ items: StoredMessage[]; total: number } | null> {
  const doc = await getSessionForUser(userId, sessionId);
  if (!doc) return null;
  const messages = (doc.messages as StoredMessage[]) ?? [];
  return { items: messages.slice(skip, skip + limit), total: messages.length };
}

export async function listSessionsForUser(
  userId: string,
  limit = 30,
  query?: string
): Promise<SessionSummary[]> {
  const collection = await getCollection('chat_sessions');
  const filter: Record<string, unknown> = {
    user_id: userId,
    'messages.0': { $exists: true },
  };

  if (query?.trim()) {
    filter.title = { $regex: query.trim(), $options: 'i' };
  }

  const docs = await collection.find(filter).sort({ updated_at: -1 }).limit(limit).toArray();

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

export async function deleteSessionForUser(userId: string, sessionId: string): Promise<boolean> {
  const collection = await getCollection('chat_sessions');
  const result = await collection.deleteOne({ session_id: sessionId, user_id: userId });
  return result.deletedCount > 0;
}

export async function renameSessionForUser(
  userId: string,
  sessionId: string,
  title: string
): Promise<boolean> {
  const collection = await getCollection('chat_sessions');
  const result = await collection.updateOne(
    { session_id: sessionId, user_id: userId },
    { $set: { title: title.trim(), updated_at: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function appendConversation(
  userId: string,
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

  const doc = await collection.findOne({ session_id: sessionId, user_id: userId });
  const isFirstUser = role === 'user' && !(doc?.messages as StoredMessage[] | undefined)?.length;

  await collection.updateOne(
    { session_id: sessionId, user_id: userId },
    {
      $push: { messages: message },
      $set: {
        updated_at: new Date(),
        ...(isFirstUser ? { title: deriveTitle([message]) } : {}),
      },
      $setOnInsert: { created_at: new Date(), user_id: userId },
    } as never,
    { upsert: true }
  );

  return messageId;
}

export async function setMessageFeedback(
  userId: string,
  sessionId: string,
  messageId: string,
  feedback: 'up' | 'down' | null
): Promise<boolean> {
  const collection = await getCollection('chat_sessions');
  const doc = await getSessionForUser(userId, sessionId);
  if (!doc) return false;

  const messages = (doc.messages as StoredMessage[]) ?? [];
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx === -1) return false;

  messages[idx] = { ...messages[idx], feedback };
  await collection.updateOne(
    { session_id: sessionId, user_id: userId },
    { $set: { messages, updated_at: new Date() } }
  );
  return true;
}

export async function toggleMessageStar(
  userId: string,
  sessionId: string,
  messageId: string
): Promise<boolean | null> {
  const collection = await getCollection('chat_sessions');
  const doc = await getSessionForUser(userId, sessionId);
  if (!doc) return null;

  const messages = (doc.messages as StoredMessage[]) ?? [];
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx === -1) return null;

  const starred = !messages[idx].starred;
  messages[idx] = { ...messages[idx], starred };
  await collection.updateOne(
    { session_id: sessionId, user_id: userId },
    { $set: { messages, updated_at: new Date() } }
  );
  return starred;
}

export async function searchMessagesForUser(userId: string, query: string, limit = 20) {
  const collection = await getCollection('chat_sessions');
  const docs = await collection.find({ user_id: userId }).toArray();
  const q = query.toLowerCase();
  const results: Array<{
    session_id: string;
    session_title: string;
    message_id: string;
    role: string;
    content: string;
    timestamp: Date;
  }> = [];

  for (const doc of docs) {
    const messages = (doc.messages as StoredMessage[]) ?? [];
    const title = (doc.title as string) || deriveTitle(messages);
    for (const m of messages) {
      if (m.content.toLowerCase().includes(q)) {
        results.push({
          session_id: doc.session_id as string,
          session_title: title,
          message_id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        });
        if (results.length >= limit) return results;
      }
    }
  }

  return results;
}

export async function getStarredMessagesForUser(userId: string) {
  const collection = await getCollection('chat_sessions');
  const docs = await collection.find({ user_id: userId }).toArray();
  const results: Array<{
    session_id: string;
    session_title: string;
    message: StoredMessage;
  }> = [];

  for (const doc of docs) {
    const messages = (doc.messages as StoredMessage[]) ?? [];
    const title = (doc.title as string) || deriveTitle(messages);
    for (const m of messages) {
      if (m.starred) {
        results.push({ session_id: doc.session_id as string, session_title: title, message: m });
      }
    }
  }

  return results;
}

export async function exportSessionForUser(
  userId: string,
  sessionId: string,
  format: 'md' | 'json'
) {
  const doc = await getSessionForUser(userId, sessionId);
  if (!doc) return null;

  const messages = (doc.messages as StoredMessage[]) ?? [];
  const title = (doc.title as string) || deriveTitle(messages);

  if (format === 'json') {
    return JSON.stringify({ title, session_id: sessionId, messages }, null, 2);
  }

  const lines = [`# ${title}`, '', `Session: ${sessionId}`, ''];
  for (const m of messages) {
    lines.push(`## ${m.role === 'user' ? 'You' : 'Krashaq'}`, '', m.content, '');
  }
  return lines.join('\n');
}

export async function findMessageForUser(userId: string, messageId: string) {
  const collection = await getCollection('chat_sessions');
  const docs = await collection.find({ user_id: userId }).toArray();
  for (const doc of docs) {
    const messages = (doc.messages as StoredMessage[]) ?? [];
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx >= 0) {
      return {
        session_id: doc.session_id as string,
        message: messages[idx],
        messages,
        index: idx,
      };
    }
  }
  return null;
}

export async function deleteMessageForUser(userId: string, messageId: string) {
  const found = await findMessageForUser(userId, messageId);
  if (!found) return false;

  const collection = await getCollection('chat_sessions');
  const messages = found.messages.filter((m) => m.id !== messageId);
  await collection.updateOne(
    { session_id: found.session_id, user_id: userId },
    { $set: { messages, updated_at: new Date() } }
  );
  return true;
}

export async function updateMessageContent(userId: string, messageId: string, content: string) {
  const found = await findMessageForUser(userId, messageId);
  if (!found) return false;

  const collection = await getCollection('chat_sessions');
  const messages = [...found.messages];
  messages[found.index] = { ...messages[found.index], content };
  await collection.updateOne(
    { session_id: found.session_id, user_id: userId },
    { $set: { messages, updated_at: new Date() } }
  );
  return true;
}

export async function getMessageThreadForUser(userId: string, messageId: string) {
  const found = await findMessageForUser(userId, messageId);
  if (!found) return null;

  const thread = found.messages.slice(0, found.index + 1);
  return { session_id: found.session_id, messages: thread };
}

export async function getLlmSessionStats() {
  const collection = await getCollection('chat_sessions');
  const [totalSessions, docs] = await Promise.all([
    collection.countDocuments({}),
    collection.find({}).project({ messages: 1, updated_at: 1 }).toArray(),
  ]);

  let totalMessages = 0;
  for (const doc of docs) {
    totalMessages += ((doc.messages as StoredMessage[]) ?? []).length;
  }

  return {
    total_sessions: totalSessions,
    total_messages: totalMessages,
    avg_messages_per_session: totalSessions ? totalMessages / totalSessions : 0,
  };
}
