import { z } from 'zod';

// Unified Chat schema (covers both direct and group chats)
export const ChatSchema = z.object({
  id: z.string(), // Firestore doc id
  name: z.string().min(1),
  participants: z.array(z.string()).min(2), // array of user UIDs
  type: z.enum(['direct', 'group']).default('direct'),
  createdBy: z.string(),
  createdAt: z.any().optional(), // Firestore Timestamp
  updatedAt: z.any().optional(), // Firestore Timestamp
  lastMessage: z.string().optional(),
  lastMessageTime: z.any().optional(), // Firestore Timestamp
  lastMessageUserId: z.string().optional(),
  lastMessageUserName: z.string().optional(),
  avatar: z.string().url().optional(),
});

export type Chat = z.infer<typeof ChatSchema>;

// Firestore converter for Chat
export const chatConverter = {
  toFirestore(chat: Partial<Chat>) {
    const { id, ...rest } = chat as any;
    return rest;
  },
  fromFirestore(snapshot: any, options: any): Chat {
    const d = snapshot.data(options) || {};
    const tsToDate = (t: any) => (t && typeof t.toDate === 'function' ? t.toDate() : t);
    return {
      id: String(snapshot.id),
      name: String(d.name ?? ''),
      participants: Array.isArray(d.participants) ? d.participants.map(String) : [],
      type: (d.type as Chat['type']) ?? 'direct',
      createdBy: String(d.createdBy ?? ''),
      createdAt: tsToDate(d.createdAt),
      updatedAt: tsToDate(d.updatedAt),
      lastMessage: d.lastMessage,
      lastMessageTime: tsToDate(d.lastMessageTime),
      lastMessageUserId: d.lastMessageUserId,
      lastMessageUserName: d.lastMessageUserName,
      avatar: d.avatar,
    } as Chat;
  },
} as const;
