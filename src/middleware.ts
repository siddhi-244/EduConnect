import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Add paths that should be protected here
const protectedPaths = ['/dashboard', '/profile', '/app']; // '/app' as a prefix example

export function middleware(request: NextRequest) {
  const currentUserCookie = request.cookies.get('firebaseAuthToken'); // This cookie name is an example, actual might vary based on how you set it.
  // Firebase client-side auth doesn't typically set a simple token cookie easily accessible by middleware.
  // A common pattern for Next.js middleware with Firebase is to use a custom solution involving
  // setting a session cookie upon login via a backend function (e.g., Firebase Function or Next API route).
  // For simplicity in this scaffold, we'll assume such a cookie *could* exist,
  // or this logic would be enhanced.
  // A more robust client-side check is usually performed within a layout or page component.

  // This is a simplified check. True Firebase auth state is managed client-side or via server-side sessions.
  // This middleware acts as a basic redirector if a hypothetical auth token cookie is missing.
  // In a real app, you'd verify this token.

  const { pathname } = request.nextUrl;

  if (protectedPaths.some(path => pathname.startsWith(path))) {
    // console.log(`Middleware: Checking protected path: ${pathname}`);
    // if (!currentUserCookie) { // Temporarily commented out for debugging
    //   console.log(`Middleware: No auth token, redirecting from ${pathname} to /login`);
    //   const loginUrl = new URL('/login', request.url);
    //   loginUrl.searchParams.set('redirectedFrom', pathname);
    //   return NextResponse.redirect(loginUrl);
    // }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/app/:path*'],
};

