"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

const devUser = {
  id: 'dev-architect-id',
  email: 'dev@clip-aura.local',
  user_metadata: { full_name: 'Dev Architect' }
} as unknown as User;

const devSession = {
  user: devUser,
  access_token: 'dev-token',
  refresh_token: '',
  expires_in: 3600,
  token_type: 'bearer'
} as unknown as Session;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => isDevMode ? devUser : null);

  const [session, setSession] = useState<Session | null>(() => isDevMode ? devSession : null);

  const [loading, setLoading] = useState(() => !isDevMode);
  const router = useRouter();

  useEffect(() => {
    if (isDevMode) {
      console.log("[DEV_MODE] Simulating Auth Session...");
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN') {
        router.push('/dashboard');
      } else if (event === 'SIGNED_OUT') {
        router.push('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, isDevMode]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
