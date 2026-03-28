"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/planner";
  const redirect = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/planner";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(redirect);
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white font-heading font-bold text-lg">
              E
            </span>
            <span className="font-heading text-2xl font-semibold text-stone-900">EventSpace</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-8">
          <h1 className="font-heading text-xl font-semibold text-stone-900 text-center mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-stone-500 text-center mb-6">
            Sign in to your planner dashboard
          </p>

          {searchParams.get("error") === "auth" && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3">
              There was a problem signing in. Please try again.
            </div>
          )}

          {searchParams.get("registered") === "true" && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs rounded-xl px-4 py-3">
              Account created! Check your email to confirm, then sign in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-stone-600">Password</label>
                <Link href="/forgot-password" className="text-xs text-rose-500 hover:text-rose-600">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-stone-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-rose-500 hover:text-rose-600 font-medium">
            Sign up
          </Link>
        </p>

        <p className="text-center mt-4">
          <Link href="/" className="text-xs text-stone-400 hover:text-stone-600">
            ← Back to homepage
          </Link>
        </p>
      </div>
    </div>
  );
}
