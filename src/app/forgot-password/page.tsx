"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirect=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
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
          {sent ? (
            <div className="text-center">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
              <h1 className="font-heading text-xl font-semibold text-stone-900 mb-1">
                Check your email
              </h1>
              <p className="text-sm text-stone-500 mb-4">
                We sent a password reset link to <strong className="text-stone-700">{email}</strong>
              </p>
              <p className="text-xs text-stone-400">
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-rose-500 hover:text-rose-600 font-medium"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-xl font-semibold text-stone-900 text-center mb-1">
                Reset your password
              </h1>
              <p className="text-sm text-stone-500 text-center mb-6">
                Enter your email and we&apos;ll send you a reset link
              </p>

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

                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Send Reset Link
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-stone-500 mt-6">
          Remember your password?{" "}
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
