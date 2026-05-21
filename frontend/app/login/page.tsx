"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Shield, Lock, Mail, Globe2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        setSuccessMsg("Verification link sent! Check your inbox.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Google login failed.");
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    // If dev mode is true, simply reload/navigate to dashboard
    // and AuthContext will automatically load the dev session
    router.push("/dashboard");
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-muted">
        <Loader2 className="spin" size={24} />
        <span>Syncing aura authentication...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 pt-20">
      <div className="glass max-w-md w-full p-8 flex flex-col gap-6 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent-2/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-1 text-center">
          <div className="logo-box mx-auto scale-110 mb-2 flex items-center justify-center text-white bg-accent/10 border-accent/20 rounded-xl w-12 h-12">
            O
          </div>
          <h1 className="text-2xl font-bold font-outfit tracking-wide text-white">
            {isSignUp ? "Create Workspace" : "Welcome Back"}
          </h1>
          <p className="text-sm text-muted">
            {isSignUp
              ? "Access the first cinematic AI clipping pipeline."
              : "Access your stealth video workspace."}
          </p>
        </div>

        {errorMsg && (
          <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="px-4 py-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold tracking-wider text-muted uppercase">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-muted/60" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-background-soft border border-border focus:border-accent-2/60 rounded-lg py-3 pl-10 pr-4 text-sm text-white placeholder-muted/40 outline-none transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold tracking-wider text-muted uppercase">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-muted/60" size={16} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background-soft border border-border focus:border-accent-2/60 rounded-lg py-3 pl-10 pr-4 text-sm text-white placeholder-muted/40 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 glow-button flex items-center justify-center gap-2 cursor-pointer rounded-lg text-sm font-bold text-black"
          >
            {loading ? (
              <Loader2 className="spin" size={16} />
            ) : isSignUp ? (
              "Initialize Account"
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="flex items-center gap-4 text-xs text-muted/50 my-1">
          <div className="h-[1px] bg-border w-full" />
          <span>OR</span>
          <div className="h-[1px] bg-border w-full" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full nav-btn flex items-center justify-center gap-2 border border-border rounded-lg py-3 text-sm font-bold text-white bg-transparent hover:bg-white/5 cursor-pointer transition"
        >
          <Globe2 size={16} />
          Continue with Google
        </button>

        {isDevMode && (
          <button
            onClick={handleDevBypass}
            className="w-full py-2 bg-accent/10 border border-accent/20 text-accent text-xs font-mono font-bold tracking-wider rounded-lg flex items-center justify-center gap-2 hover:bg-accent/20 transition cursor-pointer"
          >
            <Shield size={14} />
            BYPASS AUTH (DEV MODE ENABLED)
          </button>
        )}

        <div className="text-center text-xs text-muted">
          {isSignUp ? (
            <span>
              Already have an workspace?{" "}
              <button
                onClick={() => setIsSignUp(false)}
                className="text-accent hover:underline font-semibold"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don&apos;t have an workspace?{" "}
              <button
                onClick={() => setIsSignUp(true)}
                className="text-accent hover:underline font-semibold"
              >
                Create Account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
