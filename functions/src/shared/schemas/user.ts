import { z } from 'zod';

// GiftedChat user minimal compatibility: {_id, name?, avatar?}
export const GiftedChatUserSchema = z.object({
  _id: z.string(),
  name: z.string().optional(),
  avatar: z.string().url().optional(),
});

export type GiftedChatUser = z.infer<typeof GiftedChatUserSchema>;

// Our app user stored in Firestore
export const UserSchema = z.object({
  id: z.string(), // Firestore doc id (uid)
  email: z.string().email(),
  displayName: z.string().optional(),
  name: z.string().optional(),
  photoURL: z.string().url().nullable().optional(),
  createdAt: z.any().optional(), // Firestore Timestamp
  updatedAt: z.any().optional(), // Firestore Timestamp
});

export type User = z.infer<typeof UserSchema>;

// Map app user to GiftedChat user shape
export const toGiftedChatUser = (user: User): GiftedChatUser => ({
  _id: user.id,
  name: user.name ?? user.displayName ?? undefined,
  avatar: user.photoURL ?? undefined,
});

// Firestore converter for User
export const userConverter = {
  toFirestore(user: Partial<User>) {
    const { id, ...rest } = user as any;
    return rest;
  },
  fromFirestore(snapshot: any, options: any): User {
    const d = snapshot.data(options) || {};
    const tsToDate = (t: any) => (t && typeof t.toDate === 'function' ? t.toDate() : t);
    return {
      id: String(snapshot.id),
      email: String(d.email ?? ''),
      displayName: d.displayName,
      name: d.name,
      photoURL: d.photoURL ?? null,
      createdAt: tsToDate(d.createdAt),
      updatedAt: tsToDate(d.updatedAt),
    } as User;
  },
} as const;
