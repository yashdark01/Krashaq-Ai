import { getCollection } from '@/lib/server/db/mongodb';

export async function getOrCreateSession(
  phone?: string | null,
  sessionId?: string | null
) {
  if (sessionId) return sessionId;
  if (phone) return `phone_${phone}`;
  return `session_${Date.now()}`;
}

export async function loadConversationHistory(sessionId: string, limit = 10) {
  const collection = await getCollection('chat_sessions');
  const doc = await collection.findOne({ session_id: sessionId });
  const messages = (doc?.messages as Array<{ role: string; content: string }>) ?? [];
  return messages.slice(-limit);
}

export async function appendConversation(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
) {
  const collection = await getCollection('chat_sessions');
  await collection.updateOne(
    { session_id: sessionId },
    {
      $push: {
        messages: { role, content, timestamp: new Date() },
      },
      $set: { updated_at: new Date() },
      $setOnInsert: { created_at: new Date() },
    } as never,
    { upsert: true }
  );
}
