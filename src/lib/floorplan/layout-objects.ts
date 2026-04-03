/**
 * Layout Objects — Supabase CRUD for the layout_objects table.
 */

import { createClient } from "@/lib/supabase/client";
import type { LayoutObject, RoomShape } from "@/lib/types";

// ── Row mappers ──

function layoutObjectToRow(obj: LayoutObject, userId: string) {
  return {
    id: obj.id,
    floor_plan_id: obj.floorPlanId,
    asset_id: obj.assetId,
    user_id: userId,
    position_x: obj.positionX,
    position_y: obj.positionY,
    rotation: obj.rotation,
    scale_x: obj.scaleX,
    scale_y: obj.scaleY,
    width_override: obj.widthOverride,
    height_override: obj.heightOverride,
    label: obj.label,
    group_id: obj.groupId,
    parent_id: obj.parentId,
    table_id: obj.tableId,
    fill_override: obj.fillOverride,
    stroke_override: obj.strokeOverride,
    tablescape_id: obj.tablescapeId,
    metadata: obj.metadata,
    z_index: obj.zIndex,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function layoutObjectFromRow(r: any): LayoutObject {
  return {
    id: r.id,
    floorPlanId: r.floor_plan_id,
    assetId: r.asset_id,
    positionX: Number(r.position_x) || 0,
    positionY: Number(r.position_y) || 0,
    rotation: Number(r.rotation) || 0,
    scaleX: Number(r.scale_x) || 1,
    scaleY: Number(r.scale_y) || 1,
    widthOverride: r.width_override != null ? Number(r.width_override) : null,
    heightOverride: r.height_override != null ? Number(r.height_override) : null,
    label: r.label || "",
    groupId: r.group_id ?? null,
    parentId: r.parent_id ?? null,
    tableId: r.table_id ?? null,
    fillOverride: r.fill_override ?? null,
    strokeOverride: r.stroke_override ?? null,
    tablescapeId: r.tablescape_id ?? null,
    metadata: r.metadata ?? {},
    zIndex: r.z_index ?? 0,
  };
}

// ── Queries ──

/** Fetch all layout objects for a floor plan */
export async function fetchLayoutObjects(floorPlanId: string): Promise<LayoutObject[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("layout_objects")
    .select("*")
    .eq("floor_plan_id", floorPlanId)
    .order("z_index", { ascending: true });

  if (error) {
    console.error("[LayoutObjects] fetch error:", error.message);
    return [];
  }
  return (data || []).map(layoutObjectFromRow);
}

/** Get the current user's ID from the Supabase session */
async function getUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/**
 * Replace all layout objects for a floor plan (full upsert + delete removed).
 * Also updates room_shape and canvas dimensions on the floor_plan row.
 */
export async function replaceLayoutObjects(
  floorPlanId: string,
  objects: LayoutObject[],
  roomShape: RoomShape | null,
  canvasWidth: number,
  canvasHeight: number,
): Promise<void> {
  const supabase = createClient();
  const userId = await getUserId();

  // 1. Update floor plan metadata
  const { error: fpError } = await supabase
    .from("floor_plans")
    .update({
      room_shape: roomShape,
      canvas_width: canvasWidth,
      canvas_height: canvasHeight,
    })
    .eq("id", floorPlanId);

  if (fpError) {
    console.error("[LayoutObjects] floor plan update error:", fpError.message);
  }

  // 2. Upsert layout objects (parent objects first to satisfy FK)
  const parentRows = objects.filter((o) => !o.parentId).map((o) => layoutObjectToRow(o, userId));
  const childRows = objects.filter((o) => o.parentId).map((o) => layoutObjectToRow(o, userId));

  if (parentRows.length > 0) {
    const { error } = await supabase
      .from("layout_objects")
      .upsert(parentRows, { onConflict: "id" });
    if (error) {
      console.error("[LayoutObjects] upsert parents error:", error.message);
    }
  }

  if (childRows.length > 0) {
    const { error } = await supabase
      .from("layout_objects")
      .upsert(childRows, { onConflict: "id" });
    if (error) {
      console.error("[LayoutObjects] upsert children error:", error.message);
    }
  }

  // 3. Delete objects that are no longer in the list
  const currentIds = objects.map((o) => o.id);
  if (currentIds.length > 0) {
    const { error: delError } = await supabase
      .from("layout_objects")
      .delete()
      .eq("floor_plan_id", floorPlanId)
      .not("id", "in", `(${currentIds.join(",")})`);

    if (delError) {
      console.error("[LayoutObjects] delete removed error:", delError.message);
    }
  } else {
    // All objects removed — delete everything for this floor plan
    const { error: delError } = await supabase
      .from("layout_objects")
      .delete()
      .eq("floor_plan_id", floorPlanId);

    if (delError) {
      console.error("[LayoutObjects] delete all error:", delError.message);
    }
  }
}
