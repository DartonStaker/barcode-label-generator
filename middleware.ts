import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_token';
const PUBLIC_PATHS = ['/login', '/api/login', '/api/logout', '/_next', '/favicon.ico', '/vercel.svg'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((publicPath) => pathname.startsWith(publicPath));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);

  if (authCookie?.value === 'authenticated') {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|vercel.svg).*)'],
};

