import * as admin from 'firebase-admin';

// Initialize Admin SDK once per cold start
try {
  admin.app();
} catch (_) {
  admin.initializeApp();
}

export { admin };
