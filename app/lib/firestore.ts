import { useCallback, useEffect, useState } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type WithId<T> = T & { id: string };

export function withId<T extends FirebaseFirestoreTypes.DocumentData>(
  doc: FirebaseFirestoreTypes.QueryDocumentSnapshot<T>
): WithId<T> {
  return { id: doc.id, ...(doc.data() as T) };
}

export type DocumentReferenceLike<T extends FirebaseFirestoreTypes.DocumentData> = Pick<
  FirebaseFirestoreTypes.DocumentReference<T>,
  'id' | 'delete'
>;

/**
 * Subscribe to a Firestore query and keep an in-memory list of documents with their IDs.
 * - Deletes are optimistic via the returned deleteDoc() helper.
 */
export function useQuery<T extends FirebaseFirestoreTypes.DocumentData>(
  query: FirebaseFirestoreTypes.Query<T> | undefined,
  deps: Array<unknown> = []
) {
  const [status, setStatus] = useState<'loading' | 'success'>('loading');
  const [docs, setDocs] = useState<WithId<T>[]>([]);
  const [error, setError] = useState<any>(null);

  const deleteDocFn = useCallback(async (docRef: DocumentReferenceLike<T>) => {
    if (!docRef) return;
    try {
      await docRef.delete();
      setDocs((prev) => prev.filter((d) => d.id !== docRef.id));
    } catch (e) {
      console.error('deleteDoc failed', e);
      setError(e);
    }
  }, []);

  useEffect(() => {
    if (!query) return;

    // Attempt to create a readable label for logs
    let logLabel = 'query';
    try {
      const anyQ = query as any;
      if (anyQ?._collectionPath?._parts) {
        logLabel = (anyQ._collectionPath._parts as string[]).join('/');
      } else if (anyQ?._queryOptions?.collectionId) {
        logLabel = String(anyQ._queryOptions.collectionId);
      }
    } catch {}

    console.log({ message: 'using firestore query ' + logLabel, deps });

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        const typedDocs = snapshot.docs as FirebaseFirestoreTypes.QueryDocumentSnapshot<T>[];
        const extantDocs = typedDocs.filter((d) => d.exists);
        setDocs(extantDocs.map(withId<T>));
        setStatus('success');
      },
      (err) => {
        setError(err);
        console.error('onSnapshot error', err, { logLabel });
      }
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  return {
    status,
    docs,
    loading: status === 'loading',
    deleteDoc: deleteDocFn,
    error,
  } as const;
}
