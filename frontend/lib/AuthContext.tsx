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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const setSessionHint = (isAuthenticated: boolean) => {
    if (typeof document === "undefined") return;
    const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
    if (isAuthenticated) {
      document.cookie = `clipaura_session_hint=1; path=/; max-age=86400; SameSite=Lax${secureFlag}`;
    } else {
      document.cookie = `clipaura_session_hint=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
    }
  };

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_MODE === "true") {
      setUser({ id: "dev-user", email: "dev@clipaura.com", user_metadata: { full_name: "Dev User" } } as any);
      setSession({ access_token: "dev-token" } as any);
      setSessionHint(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSession(session);
      setSessionHint(Boolean(session));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setSession(session);
      setSessionHint(Boolean(session));
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
    setSessionHint(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
