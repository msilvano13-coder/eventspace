"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getFurnitureByCategory } from "./furniture-items";
import { CATEGORY_LABELS, pxToFeetInches, FURNITURE_GROUPS, FurnitureGroup } from "@/lib/constants";
import { FurnitureItemDef } from "@/lib/types";

interface Props {
  onAddItem: (item: FurnitureItemDef) => void;
  onAddGroup?: (group: FurnitureGroup) => void;
  mobile?: boolean;
}

export default function FurniturePalette({ onAddItem, onAddGroup, mobile }: Props) {
  const grouped = getFurnitureByCategory();
  const [groupsExpanded, setGroupsExpanded] = useState(true);

  return (
    <div
      className={
        mobile
          ? "w-full overflow-y-auto"
          : "w-56 bg-white border-r border-stone-200 overflow-y-auto flex-shrink-0"
      }
    >
      {!mobile && (
        <div className="p-3 border-b border-stone-100">
          <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">
            Furniture
          </h3>
        </div>
      )}
      {/* Table Sets section */}
      {mobile ? (
        <div className="px-3 pt-3 pb-1">
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-2">Table Sets</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {FURNITURE_GROUPS.map((group) => (
              <button
                key={group.id}
                className="flex flex-col gap-0.5 px-3 py-3 rounded-xl bg-rose-50/60 hover:bg-rose-100/60 border border-rose-200/50 transition-colors text-left"
                onClick={() => onAddGroup?.(group)}
              >
                <span className="text-xs font-medium text-stone-700 leading-tight">{group.name}</span>
                <span className="text-[10px] text-stone-400">{group.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-2 pb-0">
          <button
            className="w-full flex items-center gap-1 px-2 mb-1"
            onClick={() => setGroupsExpanded(!groupsExpanded)}
          >
            {groupsExpanded ? <ChevronDown size={12} className="text-stone-400" /> : <ChevronRight size={12} className="text-stone-400" />}
            <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Table Sets</p>
          </button>
          {groupsExpanded && (
            <div className="space-y-0.5 mb-3">
              {FURNITURE_GROUPS.map((group) => (
                <button
                  key={group.id}
                  className="w-full flex flex-col gap-0.5 px-2.5 py-2 rounded-xl bg-rose-50/40 hover:bg-rose-100/50 border border-rose-200/40 transition-colors text-left"
                  onClick={() => onAddGroup?.(group)}
                >
                  <span className="text-xs font-medium text-stone-600">{group.name}</span>
                  <span className="text-[10px] text-stone-400">{group.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={mobile ? "p-3 grid grid-cols-2 gap-2" : "p-2 space-y-4"}>
        {Object.entries(grouped).map(([category, items]) =>
          mobile ? (
            items.map((item) => (
              <button
                key={item.id}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors text-left"
                onClick={() => onAddItem(item)}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: item.fill,
                    border: `1.5px solid ${item.stroke}`,
                    borderRadius: item.shape === "circle" ? "50%" : "8px",
                  }}
                />
                <div className="min-w-0">
                  <span className="text-xs text-stone-700 leading-tight block">{item.name}</span>
                  <span className="text-[10px] text-stone-400">
                    {item.shape === "circle"
                      ? `\u00D8 ${pxToFeetInches(item.defaultWidth)}`
                      : `${pxToFeetInches(item.defaultWidth)} \u00D7 ${pxToFeetInches(item.defaultHeight)}`}
                    {item.maxSeats && item.maxSeats > 0 ? ` \u00B7 ${item.maxSeats} seats` : ""}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div key={category}>
              <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider px-2 mb-1.5">
                {CATEGORY_LABELS[category] || category}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <button
                    key={item.id}
                    className="furniture-drag-item w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-stone-50 transition-colors text-left"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("furnitureId", item.id);
                    }}
                    onClick={() => onAddItem(item)}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: item.fill,
                        border: `1.5px solid ${item.stroke}`,
                        borderRadius: item.shape === "circle" ? "50%" : "6px",
                      }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs text-stone-600 block">{item.name}</span>
                      <span className="text-[10px] text-stone-400">
                        {item.shape === "circle"
                          ? `\u00D8 ${pxToFeetInches(item.defaultWidth)}`
                          : `${pxToFeetInches(item.defaultWidth)} \u00D7 ${pxToFeetInches(item.defaultHeight)}`}
                        {item.maxSeats && item.maxSeats > 0 ? ` \u00B7 ${item.maxSeats} seats` : ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
