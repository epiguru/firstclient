import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type WithId<T> = T & { id: string };

// Message type expected by the chat UI
export interface Message {
  _id: string;
  text: string;
  createdAt: Date;
  user: { _id: string; name: string };
  moderation?: { flagged?: boolean; checked?: boolean; reason?: string };
}

export interface ChatDoc {
  name: string;
  type: 'direct' | 'group';
  participants: string[];
  createdAt?: Date;
  updatedAt?: Date;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export interface AppUserDoc {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Explicit mappers (Firestore -> App types)
export const mapMessage = (snapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot): Message => {
  const data = snapshot.data();
  const ts = data.createdAt as FirebaseFirestoreTypes.Timestamp | undefined;
  return {
    _id: snapshot.id,
    text: String(data.text ?? ''),
    createdAt: ts ? ts.toDate() : new Date(0),
    user: { _id: String(data.user?._id ?? ''), name: String(data.user?.name ?? '') },
    moderation: data.moderation,
  };
};

export const mapChat = (snapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot): ChatDoc => {
  const d = snapshot.data();
  const created = d.createdAt as FirebaseFirestoreTypes.Timestamp | undefined;
  const updated = d.updatedAt as FirebaseFirestoreTypes.Timestamp | undefined;
  const lastTs = d.lastMessageTime as FirebaseFirestoreTypes.Timestamp | undefined;
  return {
    name: String(d.name ?? ''),
    type: (d.type as 'direct' | 'group') ?? 'direct',
    participants: Array.isArray(d.participants) ? d.participants.map(String) : [],
    createdAt: created ? created.toDate() : undefined,
    updatedAt: updated ? updated.toDate() : undefined,
    lastMessage: d.lastMessage,
    lastMessageTime: lastTs ? lastTs.toDate() : undefined,
  };
};

export const mapUser = (snapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot): AppUserDoc => {
  const d = snapshot.data();
  const created = d.createdAt as FirebaseFirestoreTypes.Timestamp | undefined;
  const updated = d.updatedAt as FirebaseFirestoreTypes.Timestamp | undefined;
  return {
    id: String(d.id ?? snapshot.id),
    uid: String(d.uid ?? snapshot.id),
    email: d.email ?? null,
    displayName: d.displayName ?? null,
    photoURL: d.photoURL ?? null,
    createdAt: created ? created.toDate() : undefined,
    updatedAt: updated ? updated.toDate() : undefined,
  };
};

// Hook to read queries and map docs
export function useQueryMap<T>(
  query: FirebaseFirestoreTypes.Query | undefined,
  mapper: (doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => T,
  deps: Array<unknown> = []
) {
  const React = require('react') as typeof import('react');
  const { useEffect, useState } = React;

  const [status, setStatus] = useState<'loading' | 'success'>('loading');
  const [docs, setDocs] = useState<WithId<T>[]>([]);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!query) return;
    const unsub = query.onSnapshot(
      (snap) => {
        const data = snap.docs
          .filter((d) => d.exists)
          .map((d) => ({ id: d.id, ...(mapper(d) as any) }));
        setDocs(data);
        setStatus('success');
      },
      (err) => {
        setError(err);
      }
    );
    return () => unsub();
  }, deps);

  return { status, docs, loading: status === 'loading', error } as const;
}

// Helpers to write messages consistently (server timestamps etc.)
export async function addMessageDoc(chatsCollection: FirebaseFirestoreTypes.CollectionReference, chatId: string, body: { text: string; user: { _id: string; name: string } }) {
  await chatsCollection
    .doc(chatId)
    .collection('messages')
    .add({
      text: body.text,
      createdAt: firestore.FieldValue.serverTimestamp(),
      user: body.user,
    });
}
