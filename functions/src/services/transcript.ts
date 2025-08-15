import { db } from '../admin';

export async function getTranscript(chatId: string, limit = 12) {
  const snap = await db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  const messages = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .reverse();
  return messages.map((m) => ({
    id: m.id,
    userId: m.user?._id ?? m.userId ?? '',
    userName: m.user?.name ?? m.userName ?? '',
    text: m.text ?? '',
    createdAt: m.createdAt?.toDate?.() ?? m.createdAt ?? null,
  }));
}
