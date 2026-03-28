"use client";

import { usePlannerProfile, usePlannerProfileActions } from "@/hooks/useStore";
import { plannerStore } from "@/lib/planner-store";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, Save, X, CreditCard, ExternalLink, CheckCircle2, Loader2, Mail, Shield, Calendar, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const profile = usePlannerProfile();
  const { updateProfile } = usePlannerProfileActions();
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setAccountEmail(data.user.email);
    });
  }, []);

  // After Stripe checkout redirect, verify the session server-side to update plan immediately
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      fetch("/api/stripe/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then(() => plannerStore.refetch())
        .catch((err) => console.error("verify-session failed:", err));
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const trialDaysLeft =
    profile.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(profile.trialEndsAt).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  const planLabel =
    profile.plan === "trial"
      ? "Trial"
      : profile.plan === "diy"
        ? "DIY"
        : profile.plan === "professional"
          ? "Professional"
          : "Expired";

  const showUpgrade = profile.plan === "trial" || profile.plan === "expired";
  const isDiy = profile.plan === "diy";
  const showManageBilling =
    profile.plan === "diy" || profile.plan === "professional";

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong");
        setPortalLoading(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setPortalLoading(false);
    }
  }

  async function handleCancelPlan() {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCancelSuccess(true);
        setShowCancelConfirm(false);
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setCancelLoading(false);
  }

  // Sync form when profile loads from localStorage
  const [initialized, setInitialized] = useState(false);
  if (!initialized && profile.businessName !== form.businessName && profile.businessName) {
    setForm(profile);
    setInitialized(true);
  }

  function handleSave() {
    updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      alert("Logo must be under 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setForm({ ...form, logoUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setForm({ ...form, logoUrl: "" });
  }

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 mb-1">
        Settings
      </h1>
      <p className="text-sm text-stone-400 mb-8">
        Your business profile and branding shown on client portals.
      </p>

      <div className="space-y-6">
        {/* Logo */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
          <h2 className="font-heading font-semibold text-stone-800 mb-4">Logo</h2>
          <div className="flex items-center gap-5">
            {form.logoUrl ? (
              <div className="relative group">
                <img
                  src={form.logoUrl}
                  alt="Business logo"
                  className="w-20 h-20 rounded-xl object-cover border border-stone-200"
                />
                <button
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-400 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-300 hover:border-rose-300 hover:text-rose-400 transition-colors"
              >
                <Camera size={20} />
                <span className="text-[9px] mt-1 font-medium">Upload</span>
              </button>
            )}
            <div className="text-xs text-stone-400">
              <p>Square image recommended</p>
              <p>PNG or JPG, max 500KB</p>
              {form.logoUrl && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-rose-500 hover:text-rose-600 font-medium mt-1"
                >
                  Change logo
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Business Info */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
          <h2 className="font-heading font-semibold text-stone-800 mb-4">Business Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-500 mb-1">Business Name</label>
              <input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="e.g. Elegant Events Co."
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Your Name</label>
              <input
                value={form.plannerName}
                onChange={(e) => setForm({ ...form, plannerName: e.target.value })}
                placeholder="Jane Smith"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="hello@elegantevents.com"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Website</label>
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="www.elegantevents.com"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-500 mb-1">Tagline</label>
              <input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="Crafting unforgettable celebrations"
                className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Brand Color */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
          <h2 className="font-heading font-semibold text-stone-800 mb-4">Brand Color</h2>
          <p className="text-xs text-stone-400 mb-3">Used as the accent color on your client portals.</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.brandColor}
              onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
              className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer"
            />
            <input
              value={form.brandColor}
              onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
              placeholder="#e88b8b"
              className="w-28 border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
            <div
              className="flex-1 h-10 rounded-xl"
              style={{ backgroundColor: form.brandColor }}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
          <h2 className="font-heading font-semibold text-stone-800 mb-4">Client Portal Preview</h2>
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: form.brandColor + "15" }}>
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-heading font-bold text-sm"
                  style={{ backgroundColor: form.brandColor }}
                >
                  {(form.businessName || "E")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-heading font-semibold text-stone-800">
                  {form.businessName || "Your Business Name"}
                </p>
                {form.tagline && (
                  <p className="text-[10px] text-stone-400">{form.tagline}</p>
                )}
              </div>
            </div>
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-stone-300">Client portal content...</p>
            </div>
            <div className="px-4 py-2 border-t border-stone-100 text-center">
              <p className="text-[10px] text-stone-300">
                Planned by {form.businessName || "Your Business"} {form.website && `· ${form.website}`}
              </p>
            </div>
          </div>
        </div>

        {/* Account & Billing */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-soft">
          <h2 className="font-heading font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-stone-400" />
            Account & Billing
          </h2>

          {showSuccess && (
            <div className="mb-4 flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium">
              <CheckCircle2 size={16} />
              Payment successful! Your plan has been updated.
            </div>
          )}

          <div className="space-y-4">
            {/* Account Email */}
            <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
              <Mail size={16} className="text-stone-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-stone-500">Account Email</p>
                <p className="text-sm text-stone-800">{accountEmail || "Loading..."}</p>
              </div>
            </div>

            {/* Current Plan */}
            <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
              <Shield size={16} className="text-stone-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-stone-500">Current Plan</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-semibold text-stone-800">{planLabel}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    profile.plan === "professional"
                      ? "bg-rose-100 text-rose-600"
                      : profile.plan === "diy"
                        ? "bg-amber-100 text-amber-600"
                        : profile.plan === "trial"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-red-100 text-red-600"
                  }`}>
                    {profile.plan === "professional" ? "Pro" : profile.plan === "diy" ? "DIY" : profile.plan === "trial" ? "Free Trial" : "Expired"}
                  </span>
                </div>
              </div>
            </div>

            {/* Trial / Expiry Info */}
            {profile.plan === "trial" && (
              <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                <Calendar size={16} className="text-stone-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-stone-500">Trial Status</p>
                  {trialDaysLeft > 0 ? (
                    <p className="text-sm text-stone-800">
                      <span className="text-rose-500 font-semibold">{trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</span> remaining
                      {profile.trialEndsAt && (
                        <span className="text-stone-400 text-xs ml-2">
                          (expires {new Date(profile.trialEndsAt).toLocaleDateString()})
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-rose-500 font-medium">Your trial has expired</p>
                  )}
                </div>
              </div>
            )}

            {profile.plan === "expired" && (
              <div className="p-3 bg-red-50 rounded-xl">
                <p className="text-sm text-red-600 font-medium">Your trial has expired. Upgrade to continue using EventSpace.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              {showUpgrade && (
                <Link
                  href="/planner/upgrade"
                  className="flex items-center gap-2 bg-rose-400 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-500 transition-colors"
                >
                  Upgrade Plan
                  <ExternalLink size={12} />
                </Link>
              )}
              {showManageBilling && (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="flex items-center gap-2 bg-stone-100 text-stone-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                  {portalLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Manage Billing
                      <ExternalLink size={12} />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Cancel Plan — only for subscription plans, not one-time DIY */}
            {profile.plan === "professional" && !cancelSuccess && (
              <div className="border-t border-stone-100 pt-4">
                {!showCancelConfirm ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                  >
                    Cancel plan
                  </button>
                ) : (
                  <div className="p-4 bg-red-50 rounded-xl space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-700">Are you sure you want to cancel?</p>
                        <p className="text-xs text-red-600 mt-1">
                          {profile.plan === "professional"
                            ? "Your subscription will remain active until the end of your current billing period, then your account will be downgraded."
                            : "Your plan will be downgraded and you'll lose access to paid features."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelPlan}
                        disabled={cancelLoading}
                        className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {cancelLoading ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          "Yes, cancel my plan"
                        )}
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="px-4 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        Keep my plan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {cancelSuccess && (
              <div className="border-t border-stone-100 pt-4">
                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm font-medium">
                  <CheckCircle2 size={16} />
                  Your plan has been cancelled. You&apos;ll have access until the end of your billing period.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pb-8">
          {saved && (
            <span className="text-xs text-emerald-600 font-medium">Saved!</span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-rose-400 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-500 transition-colors"
          >
            <Save size={14} />
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
