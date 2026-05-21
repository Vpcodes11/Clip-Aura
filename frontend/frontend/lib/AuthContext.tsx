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

const isDevMode = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEV_MODE === 'true';

function buildDevSession(): { user: User; session: Session } {
  const devUser: User = {
    id: 'dev-architect-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'dev@clipaura.local',
    app_metadata: {},
    user_metadata: { full_name: 'Dev Architect' },
    created_at: '2026-01-01T00:00:00Z',
  } as User;
  const devSession: Session = {
    provider_token: undefined,
    provider_refresh_token: undefined,
    access_token: 'dev-token',
    refresh_token: 'dev-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: devUser,
  };
  return { user: devUser, session: devSession };
}

const devSessionData = isDevMode ? buildDevSession() : null;

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
    
    if (isDevMode) {
      const devSession = buildDevSession();
      setUser(devSession.user);
      setSession(devSession.session);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setSession(session);
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
  }, [router]);

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
