"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { useModelsManifest, TABLESCAPE_CATEGORIES, getAssetThumbnailPath } from "@/hooks/useAsset";
import type { AssetModel } from "@/hooks/useAsset";

interface AssetBrowserProps {
  onSelectAsset: (asset: AssetModel) => void;
  selectedAssetId: string | null;
  onClose: () => void;
}

export default function AssetBrowser({ onSelectAsset, selectedAssetId, onClose }: AssetBrowserProps) {
  const { manifest, loading } = useModelsManifest();
  const [activeCategory, setActiveCategory] = useState<string>(TABLESCAPE_CATEGORIES[0].id);
  const [search, setSearch] = useState("");

  const assets = useMemo(() => {
    if (!manifest) return [];
    return Object.values(manifest.models)
      .filter((m) => m.catalog === "tablescape" && m.category === activeCategory)
      .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [manifest, activeCategory, search]);

  if (loading) {
    return (
      <div className="w-72 bg-white border-l border-stone-200 flex items-center justify-center">
        <p className="text-stone-400 text-sm">Loading assets...</p>
      </div>
    );
  }

  return (
    <div className="w-72 bg-white border-l border-stone-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-stone-200 flex items-center justify-between">
        <h3 className="font-heading font-semibold text-stone-800 text-sm">Asset Library</h3>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1">
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-stone-100">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full text-xs pl-8 pr-3 py-2 border border-stone-200 rounded-lg outline-none focus:border-teal-400"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-stone-100">
        {TABLESCAPE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
              activeCategory === cat.id
                ? "bg-teal-50 text-teal-600 border border-teal-200"
                : "text-stone-400 hover:text-stone-600 border border-transparent hover:bg-stone-50"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Asset grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {assets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/tablescape-asset", JSON.stringify({ id: asset.id, category: asset.category }));
                e.dataTransfer.effectAllowed = "copy";
              }}
              className={`relative rounded-xl border p-1.5 transition-all text-left group cursor-grab active:cursor-grabbing ${
                selectedAssetId === asset.id
                  ? "border-teal-400 bg-teal-50 ring-1 ring-teal-200"
                  : "border-stone-200 hover:border-stone-300 hover:shadow-sm"
              }`}
            >
              <div className="aspect-square bg-stone-100 rounded-lg overflow-hidden mb-1.5">
                <img
                  src={getAssetThumbnailPath(asset)}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="text-[10px] font-medium text-stone-700 leading-tight line-clamp-2">
                {asset.name}
              </p>
              <p className="text-[9px] text-stone-400 mt-0.5">
                {Math.round(asset.fileSize / 1024)} KB
              </p>
            </button>
          ))}
        </div>
        {assets.length === 0 && (
          <p className="text-center text-stone-400 text-xs py-8">
            {search ? "No items match your search" : "No items in this category"}
          </p>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-stone-100 bg-stone-50">
        <p className="text-[10px] text-stone-400 text-center">
          Click an item, then click on the table to place it
        </p>
      </div>
    </div>
  );
}
