"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { trackSignupCompleted } from "@/lib/analytics";
import { Suspense } from "react";
import { LogoMark } from "@/components/ui/Logo";

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpContent />
    </Suspense>
  );
}

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    trackSignupCompleted();

    // Preserve plan param so post-login redirect lands on the right upgrade card
    const params = new URLSearchParams({ registered: "true" });
    if (planParam) params.set("plan", planParam);
    router.push(`/sign-in?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <LogoMark size={40} />
            <span className="font-heading text-2xl font-semibold text-stone-900">SoiréeSpace</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-soft p-8">
          <h1 className="font-heading text-xl font-semibold text-stone-900 text-center mb-1">
            Create your account
          </h1>
          <p className="text-sm text-stone-500 text-center mb-6">
            {planParam === "diy"
              ? "Create your account to get started with DIY"
              : planParam === "professional"
              ? "Create your account to start your free trial"
              : planParam === "teams_5"
              ? "Create your account to get started with Team 5"
              : planParam === "teams_10"
              ? "Create your account to get started with Team 10"
              : "Get started — choose your plan after sign-up"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>

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
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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
              Create Account
            </button>
          </form>

          <p className="text-[11px] text-stone-400 text-center mt-4 leading-relaxed">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p className="text-center text-sm text-stone-500 mt-6">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-rose-500 hover:text-rose-600 font-medium">
            Sign in
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
