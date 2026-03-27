"use client";

import { getFurnitureByCategory } from "./furniture-items";
import { CATEGORY_LABELS } from "@/lib/constants";
import { FurnitureItemDef } from "@/lib/types";

interface Props {
  onAddItem: (item: FurnitureItemDef) => void;
  mobile?: boolean;
}

export default function FurniturePalette({ onAddItem, mobile }: Props) {
  const grouped = getFurnitureByCategory();

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
                <span className="text-xs text-stone-700 leading-tight">{item.name}</span>
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
                    <span className="text-xs text-stone-600">{item.name}</span>
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
