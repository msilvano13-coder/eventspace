import { FurnitureItemDef, RoomPreset } from "./types";

export const GRID_SIZE = 20;
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

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
