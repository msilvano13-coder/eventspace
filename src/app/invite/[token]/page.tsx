"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "checking" | "accepting" | "success" | "error" | "login">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [teamName, setTeamName] = useState("");

  useEffect(() => {
    async function checkAuthAndAccept() {
      setStatus("checking");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatus("login");
        return;
      }

      // User is authenticated — accept the invite
      setStatus("accepting");
      try {
        const res = await fetch("/api/teams/accept-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (data.success) {
          setTeamName(data.teamName || "");
          setStatus("success");
          setTimeout(() => router.push("/planner"), 2000);
        } else {
          setErrorMsg(data.error || "Failed to accept invite");
          setStatus("error");
        }
      } catch {
        setErrorMsg("Something went wrong. Please try again.");
        setStatus("error");
      }
    }

    checkAuthAndAccept();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {(status === "loading" || status === "checking" || status === "accepting") && (
          <>
            <Loader2 size={32} className="animate-spin text-rose-500 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-stone-900 mb-2">
              {status === "accepting" ? "Joining team..." : "Checking invitation..."}
            </h2>
            <p className="text-stone-500 text-sm">Just a moment</p>
          </>
        )}

        {status === "login" && (
          <>
            <h2 className="font-heading text-xl font-semibold text-stone-900 mb-2">
              You&apos;ve been invited to a team!
            </h2>
            <p className="text-stone-500 text-sm mb-6">
              Sign in or create an account to accept this invitation.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/sign-in?redirect=/invite/${token}`}
                className="bg-rose-500 text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-rose-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href={`/sign-up?redirect=/invite/${token}`}
                className="bg-white text-stone-700 px-6 py-2.5 rounded-xl font-medium text-sm border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                Create Account
              </Link>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-stone-900 mb-2">
              You&apos;re on the team!
            </h2>
            <p className="text-stone-500 text-sm">
              {teamName ? `Welcome to ${teamName}. ` : ""}Redirecting to your dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={32} className="text-red-500 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-stone-900 mb-2">
              Invitation Error
            </h2>
            <p className="text-stone-500 text-sm mb-4">{errorMsg}</p>
            <Link
              href="/planner"
              className="text-rose-500 text-sm font-medium hover:underline"
            >
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
