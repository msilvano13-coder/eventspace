import { FurnitureItemDef, LightingType, RoomPreset } from "./types";

export const GRID_SIZE = 10;

export const PIXELS_PER_INCH = 1; // 1px = 1 inch (implicit in furniture catalog)
export const INCHES_PER_FOOT = 12;

/** Convert pixels to a human-readable dimension string */
export function pxToFeetInches(px: number): string {
  const inches = Math.round(px / PIXELS_PER_INCH);
  if (inches < 12) return `${inches}"`;
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return remainingInches === 0 ? `${feet}'` : `${feet}' ${remainingInches}"`;
}

export const FURNITURE_CATALOG: FurnitureItemDef[] = [
  // Tables
  {
    id: "round-table-60",
    name: "Round Table (60\")",
    category: "table",
    shape: "circle",
    defaultWidth: 60,
    defaultHeight: 60,
    defaultRadius: 30,
    fill: "#f5f0e8",
    stroke: "#c4b5a0",
    maxSeats: 8,
  },
  {
    id: "round-table-72",
    name: "Round Table (72\")",
    category: "table",
    shape: "circle",
    defaultWidth: 72,
    defaultHeight: 72,
    defaultRadius: 36,
    fill: "#f5f0e8",
    stroke: "#c4b5a0",
    maxSeats: 10,
  },
  {
    id: "rect-table-6",
    name: "Rectangular Table (6')",
    category: "table",
    shape: "rect",
    defaultWidth: 72,
    defaultHeight: 30,
    fill: "#f5f0e8",
    stroke: "#c4b5a0",
    maxSeats: 6,
  },
  {
    id: "rect-table-8",
    name: "Rectangular Table (8')",
    category: "table",
    shape: "rect",
    defaultWidth: 96,
    defaultHeight: 30,
    fill: "#f5f0e8",
    stroke: "#c4b5a0",
    maxSeats: 8,
  },
  {
    id: "cocktail-table",
    name: "Cocktail Table",
    category: "table",
    shape: "circle",
    defaultWidth: 24,
    defaultHeight: 24,
    defaultRadius: 12,
    fill: "#f5f0e8",
    stroke: "#c4b5a0",
    maxSeats: 4,
  },
  {
    id: "sweetheart-table",
    name: "Sweetheart Table",
    category: "table",
    shape: "rect",
    defaultWidth: 48,
    defaultHeight: 24,
    fill: "#fce7f3",
    stroke: "#ec4899",
    maxSeats: 2,
  },
  {
    id: "high-top-table",
    name: "High-Top Table",
    category: "table",
    shape: "circle",
    defaultWidth: 24,
    defaultHeight: 24,
    defaultRadius: 12,
    fill: "#f5f0e8",
    stroke: "#92400e",
    maxSeats: 4,
  },
  {
    id: "gift-table",
    name: "Gift Table",
    category: "table",
    shape: "rect",
    defaultWidth: 60,
    defaultHeight: 30,
    fill: "#f5f0e8",
    stroke: "#c4b5a0",
    maxSeats: 0,
  },
  {
    id: "cake-table",
    name: "Cake Table",
    category: "table",
    shape: "circle",
    defaultWidth: 36,
    defaultHeight: 36,
    defaultRadius: 18,
    fill: "#f5f0e8",
    stroke: "#c4b5a0",
    maxSeats: 0,
  },
  {
    id: "guest-book-table",
    name: "Guest Book Table",
    category: "table",
    shape: "rect",
    defaultWidth: 48,
    defaultHeight: 24,
    fill: "#f5f0e8",
    stroke: "#c4b5a0",
    maxSeats: 0,
  },
  // Seating
  {
    id: "chair",
    name: "Chair",
    category: "seating",
    shape: "rect",
    defaultWidth: 16,
    defaultHeight: 16,
    fill: "#dde5ed",
    stroke: "#94a3b8",
  },
  {
    id: "sofa",
    name: "Lounge Sofa",
    category: "seating",
    shape: "rect",
    defaultWidth: 72,
    defaultHeight: 30,
    fill: "#dde5ed",
    stroke: "#94a3b8",
  },
  // Entertainment
  {
    id: "dance-floor",
    name: "Dance Floor",
    category: "entertainment",
    shape: "rect",
    defaultWidth: 160,
    defaultHeight: 160,
    fill: "#fef3c7",
    stroke: "#d97706",
  },
  {
    id: "stage",
    name: "Stage",
    category: "entertainment",
    shape: "rect",
    defaultWidth: 180,
    defaultHeight: 80,
    fill: "#e0e7ff",
    stroke: "#6366f1",
  },
  {
    id: "dj-booth",
    name: "DJ Booth",
    category: "entertainment",
    shape: "rect",
    defaultWidth: 48,
    defaultHeight: 24,
    fill: "#e0e7ff",
    stroke: "#6366f1",
  },
  // Structure
  {
    id: "bar",
    name: "Bar",
    category: "structure",
    shape: "rect",
    defaultWidth: 96,
    defaultHeight: 36,
    fill: "#fce7f3",
    stroke: "#ec4899",
  },
  {
    id: "buffet",
    name: "Buffet Station",
    category: "structure",
    shape: "rect",
    defaultWidth: 96,
    defaultHeight: 30,
    fill: "#fce7f3",
    stroke: "#ec4899",
  },
  {
    id: "photo-booth",
    name: "Photo Booth",
    category: "structure",
    shape: "rect",
    defaultWidth: 60,
    defaultHeight: 60,
    fill: "#fef3c7",
    stroke: "#d97706",
  },
  {
    id: "restrooms",
    name: "Restrooms",
    category: "structure",
    shape: "rect",
    defaultWidth: 48,
    defaultHeight: 36,
    fill: "#e0e7ff",
    stroke: "#6366f1",
  },
  {
    id: "dessert-station",
    name: "Dessert Station",
    category: "structure",
    shape: "rect",
    defaultWidth: 72,
    defaultHeight: 30,
    fill: "#fce7f3",
    stroke: "#ec4899",
  },
  {
    id: "coffee-station",
    name: "Coffee Station",
    category: "structure",
    shape: "rect",
    defaultWidth: 60,
    defaultHeight: 24,
    fill: "#fef3c7",
    stroke: "#92400e",
  },
  // Decor
  {
    id: "flower-arrangement",
    name: "Flower Arrangement",
    category: "decor",
    shape: "circle",
    defaultWidth: 20,
    defaultHeight: 20,
    defaultRadius: 10,
    fill: "#fecdd3",
    stroke: "#e11d48",
  },
  {
    id: "arch",
    name: "Ceremony Arch",
    category: "decor",
    shape: "rect",
    defaultWidth: 60,
    defaultHeight: 10,
    fill: "#d1fae5",
    stroke: "#059669",
  },
  {
    id: "aisle-runner",
    name: "Aisle Runner",
    category: "decor",
    shape: "rect",
    defaultWidth: 30,
    defaultHeight: 200,
    fill: "#fff1f2",
    stroke: "#fda4af",
  },
  {
    id: "uplighting",
    name: "Uplighting",
    category: "decor",
    shape: "circle",
    defaultWidth: 12,
    defaultHeight: 12,
    defaultRadius: 6,
    fill: "#fef9c3",
    stroke: "#ca8a04",
  },
  {
    id: "draping",
    name: "Draping",
    category: "decor",
    shape: "rect",
    defaultWidth: 120,
    defaultHeight: 8,
    fill: "#f5f5f4",
    stroke: "#a8a29e",
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  table: "Tables",
  seating: "Seating",
  entertainment: "Entertainment",
  structure: "Structures",
  decor: "Decor",
};

export const ROOM_PRESETS: RoomPreset[] = [
  {
    id: "rectangle",
    name: "Rectangle",
    width: 600,
    height: 400,
    points: [
      [0, 0], [600, 0], [600, 400], [0, 400],
    ],
  },
  {
    id: "square",
    name: "Square",
    width: 500,
    height: 500,
    points: [
      [0, 0], [500, 0], [500, 500], [0, 500],
    ],
  },
  {
    id: "l-shape",
    name: "L-Shape",
    width: 600,
    height: 500,
    points: [
      [0, 0], [600, 0], [600, 300], [350, 300], [350, 500], [0, 500],
    ],
  },
  {
    id: "t-shape",
    name: "T-Shape",
    width: 600,
    height: 500,
    points: [
      [100, 0], [500, 0], [500, 200], [600, 200], [600, 350], [0, 350], [0, 200], [100, 200],
    ],
  },
  {
    id: "wide",
    name: "Ballroom",
    width: 800,
    height: 400,
    points: [
      [0, 0], [800, 0], [800, 400], [0, 400],
    ],
  },
  {
    id: "narrow",
    name: "Gallery",
    width: 800,
    height: 250,
    points: [
      [0, 0], [800, 0], [800, 250], [0, 250],
    ],
  },
];

// ── Furniture Groups (Table + Chairs presets) ──

export interface FurnitureGroup {
  id: string;
  name: string;
  description: string;
  items: { furnitureId: string; offsetX: number; offsetY: number; angle?: number }[];
}

/** Arrange chairs in a circle around center at given radius */
function chairsInCircle(count: number, radius: number): { furnitureId: string; offsetX: number; offsetY: number; angle: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return {
      furnitureId: "chair",
      offsetX: Math.round(Math.cos(angle) * radius),
      offsetY: Math.round(Math.sin(angle) * radius),
      angle: Math.round((angle * 180 / Math.PI) + 90), // face inward
    };
  });
}

/** Arrange chairs along both long sides of a rect table */
function chairsAlongRect(countPerSide: number, tableWidth: number, tableHeight: number): { furnitureId: string; offsetX: number; offsetY: number; angle: number }[] {
  const chairs: { furnitureId: string; offsetX: number; offsetY: number; angle: number }[] = [];
  const chairSpacing = tableWidth / (countPerSide + 1);
  const yOffset = tableHeight / 2 + 14; // 14px gap between table edge and chair center
  for (let i = 0; i < countPerSide; i++) {
    const x = -tableWidth / 2 + chairSpacing * (i + 1);
    chairs.push({ furnitureId: "chair", offsetX: Math.round(x), offsetY: -Math.round(yOffset), angle: 0 });
    chairs.push({ furnitureId: "chair", offsetX: Math.round(x), offsetY: Math.round(yOffset), angle: 180 });
  }
  return chairs;
}

export const FURNITURE_GROUPS: FurnitureGroup[] = [
  {
    id: "round-60-8",
    name: "Round 60\" + 8 Chairs",
    description: "8-top round table",
    items: [
      { furnitureId: "round-table-60", offsetX: 0, offsetY: 0 },
      ...chairsInCircle(8, 46),
    ],
  },
  {
    id: "round-72-10",
    name: "Round 72\" + 10 Chairs",
    description: "10-top round table",
    items: [
      { furnitureId: "round-table-72", offsetX: 0, offsetY: 0 },
      ...chairsInCircle(10, 54),
    ],
  },
  {
    id: "rect-6-6",
    name: "Rect 6' + 6 Chairs",
    description: "6-seat banquet",
    items: [
      { furnitureId: "rect-table-6", offsetX: 0, offsetY: 0 },
      ...chairsAlongRect(3, 72, 30),
    ],
  },
  {
    id: "rect-8-8",
    name: "Rect 8' + 8 Chairs",
    description: "8-seat banquet",
    items: [
      { furnitureId: "rect-table-8", offsetX: 0, offsetY: 0 },
      ...chairsAlongRect(4, 96, 30),
    ],
  },
  {
    id: "sweetheart-2",
    name: "Sweetheart + 2 Chairs",
    description: "Head table for two",
    items: [
      { furnitureId: "sweetheart-table", offsetX: 0, offsetY: 0 },
      { furnitureId: "chair", offsetX: -16, offsetY: -28, angle: 0 },
      { furnitureId: "chair", offsetX: 16, offsetY: -28, angle: 0 },
    ],
  },
];

// ── Lighting type defaults ──

export const LIGHTING_TYPE_DEFAULTS: Record<LightingType, { name: string; color: string; size: number; intensity: number; height: number; spread: number }> = {
  uplight:   { name: "Uplight",      color: "#c084fc", size: 50,  intensity: 80, height: 1,  spread: 45 },
  spotlight: { name: "Spotlight",    color: "#fbbf24", size: 60,  intensity: 70, height: 12, spread: 30 },
  pinspot:   { name: "Pin Spot",     color: "#f5f5f4", size: 30,  intensity: 60, height: 14, spread: 15 },
  gobo:      { name: "Gobo",         color: "#fb7185", size: 45,  intensity: 50, height: 12, spread: 40 },
  wash:      { name: "Wash Light",   color: "#60a5fa", size: 80,  intensity: 65, height: 10, spread: 90 },
  string:    { name: "String Light", color: "#fde68a", size: 40,  intensity: 75, height: 10, spread: 60 },
  candles:   { name: "Candles",      color: "#f59e0b", size: 20,  intensity: 40, height: 3,  spread: 80 },
};
