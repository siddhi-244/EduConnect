
// src/lib/firebase-admin.ts
import admin from 'firebase-admin';
// import type { ServiceAccount as AdminServiceAccountType } from 'firebase-admin'; // We'll cast later
import fs from 'node:fs';
import path from 'node:path';

console.log('[Admin SDK Step 1] Module loaded.');

// Check if GOOGLE_APPLICATION_CREDENTIALS is set
const credentialsPathEnvVar = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!admin.apps.length) {
  try {
    if (!credentialsPathEnvVar) {
      console.error('[Admin SDK Error Step 3.1] GOOGLE_APPLICATION_CREDENTIALS env var is not set.');
      throw new Error('[Admin SDK Setup Error] GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
    }
    const absoluteKeyFilePath = path.resolve(process.cwd(), credentialsPathEnvVar);

    if (!fs.existsSync(absoluteKeyFilePath)) {
      console.error(`[Admin SDK Error Step 4.1] Credentials file NOT FOUND at: ${absoluteKeyFilePath}`);
      throw new Error(`[Admin SDK Setup Error] Credentials file not found at ${absoluteKeyFilePath}.`);
    }

    const fileContent = fs.readFileSync(absoluteKeyFilePath, 'utf8');

    const parsedServiceAccount = JSON.parse(fileContent); // Parse first
    console.log('Credentials file content parsed as JSON successfully.');

    // Detailed logging of key service account fields from the raw parsed object
    if (parsedServiceAccount && typeof parsedServiceAccount === 'object' && parsedServiceAccount !== null) {
      // Accessing properties as they are in the JSON (snake_case)
      if (parsedServiceAccount.private_key) {
         console.log(`[Admin SDK Step 8.4] Private key starts with -----BEGIN PRIVATE KEY-----: ${String(parsedServiceAccount.private_key).startsWith('-----BEGIN PRIVATE KEY-----')}`);
      }
    } else {
      throw new Error('[Admin SDK Setup Error] Service account object is undefined or not an object after parsing.');
    }
    
    const credential = admin.credential.cert(parsedServiceAccount as admin.ServiceAccount);

    const databaseURL = process.env.FIREBASE_DATABASE_URL;

    admin.initializeApp({
      credential, // Use the credential object created above
      databaseURL: databaseURL
    });

  } catch (error: any) {
    console.error('[Admin SDK Error Step 11.1] admin.initializeApp() FAILED (explicit cert).');
    console.error('[Admin SDK Error Details] Message:', error.message);
    // Log the full error object from initializeApp for maximum detail
    console.error('[Admin SDK Full Error Object]', error);
    throw new Error(`Firebase Admin SDK initialization failed (explicit cert): ${error.message}.`);
  }
} else {
  console.log(` Firebase Admin SDK was already initialized. Apps count: ${admin.apps.length}`);
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export { admin };
