import { auth, db } from '../admin';
import { FieldValue } from 'firebase-admin/firestore';

async function main() {
  const _auth = auth;
  const _db = db;

  const now = Date.now();
  const email = `seeded+${now}@example.com`;
  const password = Math.random().toString(36).slice(2) + 'A!9';

  // 1) Create Auth user
  const userRecord = await _auth.createUser({ email, password, emailVerified: true, displayName: 'Seed User' });
  const uid = userRecord.uid;

  // 2) Create Firestore user doc
  await _db.collection('users').doc(uid).set({
    uid,
    email,
    displayName: userRecord.displayName || null,
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // 3) Create a chat
  const primaryUid = process.env.PRIMARY_UID;
  const GENERAL_CHAT_ID = process.env.GENERAL_CHAT_ID || 'general';
  const GENERAL_CHAT_NAME = process.env.GENERAL_CHAT_NAME || 'General';
  let chatId: string | undefined;

  // Ensure global General chat exists and add the new user
  await _db.collection('chats').doc(GENERAL_CHAT_ID).set(
    {
      type: 'group',
      name: GENERAL_CHAT_NAME,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await _db.collection('chats').doc(GENERAL_CHAT_ID).set(
    {
      participants: FieldValue.arrayUnion(uid),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (primaryUid) {
    // Direct chat between PRIMARY_UID and the new user
    const chatRef = await _db.collection('chats').add({
      type: 'direct',
      name: `Chat: ${email}`,
      participants: [primaryUid, uid],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    chatId = chatRef.id;
  }

  console.log('Seed complete:');
  console.log('  uid:', uid);
  console.log('  email:', email);
  console.log('  password:', password);
  console.log('  generalChatId:', GENERAL_CHAT_ID);
  if (chatId) console.log('  directChatId:', chatId);
  if (!primaryUid) console.log('Set PRIMARY_UID to also create a direct chat with an existing user.');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
