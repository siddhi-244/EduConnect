// src/app/api/auth/session-logout/route.ts
import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'appSession';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ status: 'success' });

    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // Expire immediately
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Session logout error:', error);
    return NextResponse.json({ error: 'Failed to logout session', details: error.message }, { status: 500 });
  }
}
