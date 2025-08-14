import { z } from 'zod';
import { GiftedChatUserSchema } from './user';

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
});

export type Message = z.infer<typeof MessageSchema>;

// Map Firestore message + author info to GiftedChat message
export const toGiftedChatMessage = (m: Message) => ({
  _id: m.id,
  text: m.text,
  createdAt: m.createdAt as any,
  user: {
    _id: m.userId,
    name: m.userName,
    avatar: m.userAvatar,
  },
  image: m.image,
  video: m.video,
  audio: m.audio,
});
