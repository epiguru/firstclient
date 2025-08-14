import { z } from 'zod';

export const GroupSchema = z.object({
  id: z.string(), // Firestore doc id
  name: z.string().min(1),
  // both 1:1 and groups use participants array of user ids
  participants: z.array(z.string()).min(2),
  type: z.enum(['direct', 'group']).default('direct'),
  createdBy: z.string(),
  createdAt: z.any().optional(), // Firestore Timestamp
  updatedAt: z.any().optional(), // Firestore Timestamp
  lastMessage: z.string().optional(),
  lastMessageTime: z.any().optional(), // Firestore Timestamp
  avatar: z.string().url().optional(),
});

export type Group = z.infer<typeof GroupSchema>;
