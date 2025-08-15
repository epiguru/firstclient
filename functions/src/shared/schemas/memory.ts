import { z } from 'zod';

// Chat memory entries stored at chats/{chatId}/memory/{memoryId}
// We don't redundantly store chatId in the document since it's in the path.
export const ChatMemorySchema = z.object({
  id: z.string().optional(), // Firestore doc id (if materialized)
  text: z.string().min(1),
  createdAt: z.any(), // Firestore Timestamp
  sourceMessageId: z.string().optional(),
});

export type ChatMemory = z.infer<typeof ChatMemorySchema>;

// Consolidated group memory stored at chats/{chatId}/groupMemory
export const GroupMemorySchema = z.object({
  // Not redundantly storing chatId since it's in the path
  purpose: z.string().optional(),
  goals: z.array(z.string()).optional(),
  alignment: z.string().optional(),
  summary: z.string().optional(),
  risks: z.array(z.string()).optional(),
  sourceCount: z.number().optional(),
  sources: z.array(z.string()).optional(), // memory document ids used
  updatedAt: z.any().optional(), // Firestore Timestamp
});

export type GroupMemory = z.infer<typeof GroupMemorySchema>;
