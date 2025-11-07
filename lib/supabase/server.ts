import { CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from './database.types';

export const createClient = () => {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options?: CookieOptions) {
          // Next.js cookies API handles deletion via empty value + maxAge 0 or delete helper
          if (options) {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          }
          cookieStore.delete(name);
        },
      },
    }
  );
};

