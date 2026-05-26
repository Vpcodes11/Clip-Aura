import { createClient } from '@supabase/supabase-js';

const isFrontendDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

if (isFrontendDevMode && process.env.NODE_ENV === 'production') {
  throw new Error("NEXT_PUBLIC_DEV_MODE must be false in production builds.");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required and must be a real Supabase URL.");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder-anon-key') {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required and must be a real Supabase anon key.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required and must be a real Supabase URL.");
}
if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-anon-key') {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required and must be a real Supabase anon key.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer dev-token`,
    };
    return fetch(url, { ...options, headers });
  }

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.warn("No active session found for authenticatedFetch");
    throw new Error("Authentication required. Please sign in again.");
  }
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${session.access_token}`,
  };

  return fetch(url, { ...options, headers });
};
