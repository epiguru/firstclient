import * as functionsV1 from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { db } from '../admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserRecord } from 'firebase-admin/auth';

// Global group chat doc id and defaults
const GENERAL_CHAT_ID = process.env.GENERAL_CHAT_ID || 'general';
const GENERAL_CHAT_NAME = process.env.GENERAL_CHAT_NAME || 'General';

export const onUserCreated = functionsV1.auth.user().onCreate(async (user: UserRecord) => {
  const uid = user.uid;
  const email = user.email || null;
  const displayName = user.displayName || null;
  const photoURL = user.photoURL || null;

  try {
    // 1) Ensure Firestore user document exists
    await db.collection('users').doc(uid).set(
      {
        id: uid,
        uid,
        email,
        displayName,
        photoURL,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 2) Ensure the global group chat exists
    const generalRef = db.collection('chats').doc(GENERAL_CHAT_ID);
    await generalRef.set(
      {
        type: 'group',
        name: GENERAL_CHAT_NAME,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 3) Add the new user to the global chat participants
    await generalRef.set(
      {
        participants: FieldValue.arrayUnion(uid),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info('Added new user to general chat', { uid, GENERAL_CHAT_ID });
  } catch (e) {
    logger.error('onUserCreated failed', { e, uid });
  }
});
