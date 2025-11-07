import { NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_token';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'apparelydotcoza@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '@MatCod1!@';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true });
      response.cookies.set(AUTH_COOKIE_NAME, 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
      });
      return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request payload' }, { status: 400 });
  }
}

