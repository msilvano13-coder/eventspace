"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { X, RotateCcw } from "lucide-react";

interface SignaturePadProps {
  open: boolean;
  title?: string;
  onSign: (signature: string, name: string) => void;
  onCancel: () => void;
  /** Called when user accepts the e-signature disclosure, before signing. */
  onDisclosureAccepted?: () => void;
}

export default function SignaturePad({ open, title = "Sign Contract", onSign, onCancel, onDisclosureAccepted }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [name, setName] = useState("");
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    if (open) {
      setName("");
      setHasDrawn(false);
      setDisclosureAccepted(false);
      // Slight delay so canvas is rendered
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(2, 2);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#292524";
        }
      }, 50);
    }
  }, [open]);

  if (!open) return null;

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    setDrawing(true);
    lastPoint.current = getPos(e);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !lastPoint.current) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
    setHasDrawn(true);
  }

  function endDraw() {
    setDrawing(false);
    lastPoint.current = null;
  }

  function handleSign() {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn || !name.trim()) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSign(dataUrl, name.trim());
  }

  return (
    <div
      className="fixed inset-0 bg-stone-900/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="text-sm font-heading font-semibold text-stone-800">{title}</h2>
          <button onClick={onCancel} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Name field */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Full Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type your full legal name"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 outline-none"
            />
          </div>

          {/* Canvas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-stone-500">Draw Signature *</label>
              {hasDrawn && (
                <button
                  onClick={clear}
                  className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  <RotateCcw size={11} />
                  Clear
                </button>
              )}
            </div>
            <div className="relative border-2 border-dashed border-stone-200 rounded-xl overflow-hidden bg-stone-50/50">
              <canvas
                ref={canvasRef}
                className="w-full touch-none cursor-crosshair"
                style={{ height: 160 }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-xs text-stone-300">Sign here</p>
                </div>
              )}
              {/* Signature line */}
              <div className="absolute bottom-8 left-6 right-6 border-b border-stone-200" />
            </div>
          </div>

          {/* E-Signature Disclosure */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
            <p className="text-[11px] text-stone-500 leading-relaxed font-medium mb-2">
              Electronic Signature Disclosure
            </p>
            <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
              By checking the box below and signing, I agree that: (1) my electronic signature is the legal equivalent of my handwritten signature on this contract; (2) I consent to conduct this transaction electronically under the ESIGN Act and applicable state law; (3) I have reviewed the contract and intend to be legally bound by its terms; and (4) I understand a record of this signature, including timestamp and identity, will be retained.
            </p>
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={disclosureAccepted}
                onChange={(e) => {
                  setDisclosureAccepted(e.target.checked);
                  if (e.target.checked) onDisclosureAccepted?.();
                }}
                className="mt-0.5 rounded border-stone-300 text-rose-500 focus:ring-rose-400/30"
              />
              <span className="text-[11px] text-stone-600 leading-relaxed">
                I have read and agree to the Electronic Signature Disclosure above.
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50/50">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSign}
            disabled={!hasDrawn || !name.trim() || !disclosureAccepted}
            className="flex-1 px-4 py-2.5 text-sm font-medium bg-rose-400 hover:bg-rose-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Signature
          </button>
        </div>
      </div>
    </div>
  );
}
