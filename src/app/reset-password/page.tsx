"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirect to dashboard after a moment
    setTimeout(() => {
      router.push("/planner");
      router.refresh();
    }, 2000);
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
          {success ? (
            <div className="text-center">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
              <h1 className="font-heading text-xl font-semibold text-stone-900 mb-1">
                Password updated
              </h1>
              <p className="text-sm text-stone-500">
                Redirecting you to your dashboard...
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-xl font-semibold text-stone-900 text-center mb-1">
                Set new password
              </h1>
              <p className="text-sm text-stone-500 text-center mb-6">
                Choose a new password for your account
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Update Password
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center mt-4">
          <Link href="/" className="text-xs text-stone-400 hover:text-stone-600">
            ← Back to homepage
          </Link>
        </p>
      </div>
    </div>
  );
}
