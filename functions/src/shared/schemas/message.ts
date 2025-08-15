import { z } from 'zod';
import { GiftedChatUserSchema } from './user';
import { ensureDate } from '../timestamps';

// GiftedChat message compatibility:
// {_id, text, createdAt, user, image?, video?, audio?, system?, sent?, received?}
export const GiftedChatMessageSchema = z.object({
  _id: z.string(),
  text: z.string().default(''),
  createdAt: z.union([z.date(), z.any()]), // Firestore Timestamp or Date
  user: GiftedChatUserSchema,
  image: z.string().url().optional(),
  video: z.string().url().optional(),
  audio: z.string().url().optional(),
  system: z.boolean().optional(),
  sent: z.boolean().optional(),
  received: z.boolean().optional(),
});

export type GiftedChatMessage = z.infer<typeof GiftedChatMessageSchema>;

// Our Firestore message shape for chats/{chatId}/messages/{messageId}
export const MessageSchema = z.object({
  id: z.string(), // Firestore doc id
  chatId: z.string(),
  text: z.string().default(''),
  createdAt: z.any(), // Firestore Timestamp
  userId: z.string(),
  userName: z.string().optional(),
  userAvatar: z.string().url().optional(),
  image: z.string().url().optional(),
  video: z.string().url().optional(),
  audio: z.string().url().optional(),
  // Some clients (GiftedChat) persist an embedded user object
  user: GiftedChatUserSchema.optional(),
  // Moderation info written by backend
  moderation: z
    .object({
      checked: z.boolean().optional(),
      flagged: z.boolean().optional(),
      reason: z.string().optional(),
      flaggedAt: z.any().optional(), // Firestore Timestamp
    })
    .optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Map Firestore message + author info to GiftedChat message
export const toGiftedChatMessage = (m: Message) => ({
  _id: m.id,
  text: m.text,
  createdAt: ensureDate(m.createdAt)!,
  user: {
    _id: m.userId,
    name: m.userName,
    avatar: m.userAvatar,
  },
  image: m.image,
  video: m.video,
  audio: m.audio,
});

// Firestore converter for Message
export const messageConverter = {
  toFirestore(message: Partial<Message>) {
    const { id, ...rest } = message as any;
    return rest;
  },
  fromFirestore(snapshot: any, options: any): Message {
    const d = snapshot.data(options) || {};
    const tsToDate = (t: any) => (t && typeof t.toDate === 'function' ? t.toDate() : t);
    return {
      id: String(snapshot.id),
      chatId: String(d.chatId ?? ''),
      text: String(d.text ?? ''),
      createdAt: tsToDate(d.createdAt),
      userId: String(d.userId ?? d.user?._id ?? ''),
      userName: d.userName ?? d.user?.name,
      userAvatar: d.userAvatar ?? d.user?.avatar,
      image: d.image,
      video: d.video,
      audio: d.audio,
      user: d.user,
      moderation: d.moderation
        ? {
            checked: d.moderation.checked,
            flagged: d.moderation.flagged,
            reason: d.moderation.reason,
            flaggedAt: tsToDate(d.moderation.flaggedAt),
          }
        : undefined,
    } as Message;
  },
} as const;
