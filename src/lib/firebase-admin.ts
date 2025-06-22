// src/lib/firebase-admin.ts
import admin from 'firebase-admin';

console.log('[Admin SDK Step 1] Module loaded.');

if (!admin.apps.length) {
  try {
    const base64 = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!base64) {
      throw new Error('[Admin SDK Setup Error] FIREBASE_SERVICE_ACCOUNT env variable is missing.');
    }

    const json = Buffer.from(base64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(json);

    const credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
    const databaseURL = process.env.FIREBASE_DATABASE_URL;

    admin.initializeApp({
      credential,
      databaseURL,
    });

    console.log('[Admin SDK Step 10] Firebase Admin initialized successfully.');
  } catch (error: any) {
    console.error('[Admin SDK Error Step 11.1] admin.initializeApp() FAILED (explicit cert).');
    console.error('[Admin SDK Error Details] Message:', error.message);
    console.error('[Admin SDK Full Error Object]', error);
    throw new Error(`Firebase Admin SDK initialization failed (explicit cert): ${error.message}.`);
  }
} else {
  console.log(`Firebase Admin SDK was already initialized. Apps count: ${admin.apps.length}`);
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export { admin };