"use client";

import { usePlannerProfile, usePlannerProfileActions } from "@/hooks/useStore";
import { useState, useRef } from "react";
import { Camera, Save, X } from "lucide-react";

export default function SettingsPage() {
  const profile = usePlannerProfile();
  const { updateProfile } = usePlannerProfileActions();
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
