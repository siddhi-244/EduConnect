// src/app/api/auth/session-login/route.ts
import { type NextRequest, NextResponse } from 'next/server';
// cookies function is for reading, for setting we use NextResponse.cookies
import { adminAuth } from '@/lib/firebase-admin';

const SESSION_COOKIE_NAME = 'appSession';
const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body.idToken as string;

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    const decodedIdToken = await adminAuth.verifyIdToken(idToken, true);
    
    const response = NextResponse.json({ status: 'success', uid: decodedIdToken.uid });

    response.cookies.set(SESSION_COOKIE_NAME, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn / 1000, // maxAge is in seconds
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Session login error:', error);
    if (error.code === 'auth/id-token-revoked') {
      return NextResponse.json({ error: 'ID token has been revoked. Please re-authenticate.' }, { status: 401 });
    }
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'ID token has expired. Please re-authenticate.' }, { status: 401 });
    }
    // Catch Admin SDK initialization errors if they propagate here
    if (error.message && error.message.includes("Failed to parse service account KeyFile")) {
        return NextResponse.json({ error: 'Server configuration error for authentication.', details: 'Service account key issue.' }, { status: 500 });
    }
    if (error.message && error.message.includes("Firebase Admin SDK initialization failed")) {
      return NextResponse.json({ error: 'Server authentication system error.', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to create session', details: error.message }, { status: 500 });
  }
}
