import { FURNITURE_CATALOG } from "@/lib/constants";
import { FurnitureItemDef } from "@/lib/types";

export function getFurnitureByCategory(): Record<string, FurnitureItemDef[]> {
  const grouped: Record<string, FurnitureItemDef[]> = {};
  for (const item of FURNITURE_CATALOG) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }
  return grouped;
}

export function getFurnitureById(id: string): FurnitureItemDef | undefined {
  return FURNITURE_CATALOG.find((f) => f.id === id);
}
