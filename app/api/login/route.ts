import { NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_token';

type AllowedUser = {
  email: string;
  password: string;
};

const allowedUsers: AllowedUser[] = [
  {
    email: process.env.ADMIN_EMAIL || 'apparelydotcoza@gmail.com',
    password: process.env.ADMIN_PASSWORD || '@MatCod1!@',
  },
  {
    email: process.env.SECONDARY_EMAIL || 'bijancan1996@gmail.com',
    password: process.env.SECONDARY_PASSWORD || 'BijancaLiam911221',
  },
  {
    email: process.env.GUEST_EMAIL || 'waseem@guest.co.za',
    password: process.env.GUEST_PASSWORD || '0765869789',
  },
].filter((user) => user.email && user.password);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const isAuthorized = allowedUsers.some((user) => user.email === email && user.password === password);

    if (isAuthorized) {
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

