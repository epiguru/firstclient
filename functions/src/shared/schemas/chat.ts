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
  avatar: z.string().url().optional(),
});

export type Chat = z.infer<typeof ChatSchema>;
