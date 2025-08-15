import { db } from '../admin';
import { FieldValue } from 'firebase-admin/firestore';
import { chatJSON } from '../tools/openai';
import { GroupMemory } from '@shared/schemas/memory';
import * as logger from 'firebase-functions/logger';

// Consolidate group memory by summarizing recent chat memory entries
export async function consolidateGroupMemory(chatId: string) {
  const memSnap = await db
    .collection('chats')
    .doc(chatId)
    .collection('memory')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const memories = memSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  if (!memories.length) return;

  const data = await chatJSON({
    system:
      'You synthesize a concise group memory for a chat. Return valid JSON with keys: purpose (string), goals (string[]), alignment (string), summary (string), risks (string[]), sourceCount (number), sources (string[]). Keep it brief and actionable.',
    user: `Given the following memory notes (newest first): ${JSON.stringify(
      memories.map((m) => ({ id: m.id, text: m.text }))
    )}.\nProduce the JSON object. If a field is unknown, omit it.`,
    temperature: 0,
  });

  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) return;

  let parsed: Partial<GroupMemory> = {};
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    logger.warn('Failed to parse group memory JSON', { e, content });
    return;
  }

  const docRef = db.collection('chats').doc(chatId).collection('__meta').doc('groupMemory');
  await docRef.set(
    {
      ...parsed,
      sourceCount: memories.length,
      sources: memories.map((m) => m.id),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
