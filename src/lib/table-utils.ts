import { FURNITURE_CATALOG } from "@/lib/constants";
import { unwrapCanvasJSON } from "@/lib/floorplan-schema";

export interface TableInfo {
  /** Stable unique ID persisted on canvas object — used as seating key */
  tableId: string;
  /** Human-readable display name */
  label: string;
  furnitureId: string;
  maxSeats: number;
}

/** Count chairs inside a table-set group (recursively) */
export function countChairs(obj: any): number {
  let count = 0;
  if (obj.objects && Array.isArray(obj.objects)) {
    for (const child of obj.objects) {
      if (child.data?.furnitureId === "chair") {
        count++;
      } else if (child.objects) {
        count += countChairs(child);
      }
    }
  }
  return count;
}

/** Parse floor plan JSON to extract table objects with stable unique IDs.
 *  Recurses into nested Fabric.js Groups to find table sub-objects within table sets.
 *  For table-set groups (isTableSet), uses the group's tableId and counts chairs for maxSeats.
 */
export function extractTables(json: string | null): TableInfo[] {
  if (!json) return [];
  try {
    const canvas = unwrapCanvasJSON(json);
    const objects = (canvas as Record<string, unknown>).objects as any[] || [];
    const tables: TableInfo[] = [];
    let fallbackIdx = 0;

    const processObject = (obj: any) => {
      const data = obj.data;
      if (!data || data.isGrid || data.isRoom) return;

      // Table-set groups (e.g., Round 60" + 8 Chairs) — count chairs for accurate maxSeats
      if (data.isTableSet && data.tableId) {
        const chairCount = countChairs(obj);
        const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
        tables.push({
          tableId: data.tableId,
          label: data.label || catalogItem?.name || "Table",
          furnitureId: data.furnitureId,
          maxSeats: chairCount > 0 ? chairCount : (catalogItem?.maxSeats ?? 0),
        });
        return; // Don't recurse further — the group is the table unit
      }

      // Individual table objects (not in a group)
      if (data.furnitureId) {
        const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
        if (catalogItem && catalogItem.category === "table") {
          const posKey = `${Math.round(obj.left ?? 0)}_${Math.round(obj.top ?? 0)}`;
          const tableId = data.tableId || `__legacy_${data.furnitureId}_${posKey}_${fallbackIdx++}`;
          tables.push({
            tableId,
            label: data.label || catalogItem.name,
            furnitureId: data.furnitureId,
            maxSeats: catalogItem.maxSeats ?? 0,
          });
          return;
        }
      }

      // Recurse into nested groups (e.g., ungrouped sub-groups)
      if (obj.objects && Array.isArray(obj.objects)) {
        for (const child of obj.objects) {
          processObject(child);
        }
      }
    };

    for (const obj of objects) {
      processObject(obj);
    }

    // Ensure unique display labels — append #N for duplicates
    const labelCounts = new Map<string, number>();
    for (const t of tables) {
      labelCounts.set(t.label, (labelCounts.get(t.label) ?? 0) + 1);
    }
    const labelIdx = new Map<string, number>();
    for (const t of tables) {
      if ((labelCounts.get(t.label) ?? 0) > 1) {
        const idx = (labelIdx.get(t.label) ?? 0) + 1;
        labelIdx.set(t.label, idx);
        t.label = `${t.label} #${idx}`;
      }
    }
    return tables;
  } catch (err) {
    console.error("[table-utils] extractTables failed:", err);
    return [];
  }
}

export function isSweetheartTable(t: TableInfo): boolean {
  return t.furnitureId.includes("sweetheart") || t.label.toLowerCase().includes("sweetheart");
}
