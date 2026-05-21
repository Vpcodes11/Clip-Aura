import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tmvcemupolugzknwhszf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdmNlbXVwb2x1Z3prbndoc3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzgyMjksImV4cCI6MjA5NDM1NDIyOX0.OdJtdcMoJUAppZn6J1MBGi9IvsHNSU0BGXIHMPBT_CI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
  
  let accessToken = 'dev-token';
  
  if (!isDevMode) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn("No active session found for authenticatedFetch");
      throw new Error("Authentication required. Please sign in again.");
    }
    accessToken = session.access_token;
  }
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`,
  };

  return fetch(url, { ...options, headers });
};
