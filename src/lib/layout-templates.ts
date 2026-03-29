/**
 * Pre-built layout templates for quick floor plan setup.
 * Each template specifies a room preset and a list of furniture placements.
 * Coordinates are in inches (matching PIXELS_PER_INCH = 1).
 */

export interface LayoutPlacement {
  /** ID from FURNITURE_CATALOG or FURNITURE_GROUPS */
  itemId: string;
  /** true if this is a group (table + chairs combo) */
  isGroup?: boolean;
  /** Center X in inches from canvas origin */
  x: number;
  /** Center Y in inches from canvas origin */
  y: number;
  /** Rotation in degrees */
  angle?: number;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  /** Which room preset to use */
  roomPreset: string;
  /** Furniture placements */
  placements: LayoutPlacement[];
}

/**
 * 5 pre-built layout templates covering common event configurations
 */
export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  // ── 1. Banquet / Reception ──
  {
    id: "banquet",
    name: "Banquet Reception",
    description: "Classic dinner reception with round tables, dance floor, bar, and stage",
    roomPreset: "wide",
    placements: [
      // Dance floor center-left
      { itemId: "dance-floor", x: 250, y: 200 },
      // Stage behind dance floor
      { itemId: "stage", x: 250, y: 60 },
      // DJ booth on stage
      { itemId: "dj-booth", x: 250, y: 60 },
      // Bar top-right
      { itemId: "bar", x: 650, y: 80 },
      // Sweetheart table front-center
      { itemId: "sweetheart-2", isGroup: true, x: 250, y: 330 },
      // Round tables in two rows
      { itemId: "round-60-8", isGroup: true, x: 480, y: 160 },
      { itemId: "round-60-8", isGroup: true, x: 630, y: 160 },
      { itemId: "round-60-8", isGroup: true, x: 480, y: 280 },
      { itemId: "round-60-8", isGroup: true, x: 630, y: 280 },
      { itemId: "round-60-8", isGroup: true, x: 100, y: 350 },
      { itemId: "round-60-8", isGroup: true, x: 400, y: 350 },
      // Buffet along right wall
      { itemId: "buffet", x: 750, y: 250, angle: 90 },
      // Cake table
      { itemId: "cake-table", x: 750, y: 350 },
    ],
  },

  // ── 2. Classroom / Conference ──
  {
    id: "classroom",
    name: "Classroom",
    description: "Forward-facing rows of rectangular tables for presentations and workshops",
    roomPreset: "rectangle",
    placements: [
      // Presenter table at front
      { itemId: "rect-table-8", x: 300, y: 60 },
      // Row 1
      { itemId: "rect-6-6", isGroup: true, x: 150, y: 150 },
      { itemId: "rect-6-6", isGroup: true, x: 300, y: 150 },
      { itemId: "rect-6-6", isGroup: true, x: 450, y: 150 },
      // Row 2
      { itemId: "rect-6-6", isGroup: true, x: 150, y: 230 },
      { itemId: "rect-6-6", isGroup: true, x: 300, y: 230 },
      { itemId: "rect-6-6", isGroup: true, x: 450, y: 230 },
      // Row 3
      { itemId: "rect-6-6", isGroup: true, x: 150, y: 310 },
      { itemId: "rect-6-6", isGroup: true, x: 300, y: 310 },
      { itemId: "rect-6-6", isGroup: true, x: 450, y: 310 },
      // Coffee station back wall
      { itemId: "coffee-station", x: 300, y: 380 },
    ],
  },

  // ── 3. Theater ──
  {
    id: "theater",
    name: "Theater / Ceremony",
    description: "Rows of chairs facing a stage with an aisle down the center",
    roomPreset: "rectangle",
    placements: [
      // Stage at front
      { itemId: "stage", x: 300, y: 50 },
      // Arch on stage
      { itemId: "arch", x: 300, y: 90 },
      // Aisle runner
      { itemId: "aisle-runner", x: 300, y: 250 },
      // Left side chairs (5 rows of 5)
      { itemId: "chair", x: 120, y: 140 },
      { itemId: "chair", x: 150, y: 140 },
      { itemId: "chair", x: 180, y: 140 },
      { itemId: "chair", x: 210, y: 140 },
      { itemId: "chair", x: 240, y: 140 },
      { itemId: "chair", x: 120, y: 170 },
      { itemId: "chair", x: 150, y: 170 },
      { itemId: "chair", x: 180, y: 170 },
      { itemId: "chair", x: 210, y: 170 },
      { itemId: "chair", x: 240, y: 170 },
      { itemId: "chair", x: 120, y: 200 },
      { itemId: "chair", x: 150, y: 200 },
      { itemId: "chair", x: 180, y: 200 },
      { itemId: "chair", x: 210, y: 200 },
      { itemId: "chair", x: 240, y: 200 },
      { itemId: "chair", x: 120, y: 230 },
      { itemId: "chair", x: 150, y: 230 },
      { itemId: "chair", x: 180, y: 230 },
      { itemId: "chair", x: 210, y: 230 },
      { itemId: "chair", x: 240, y: 230 },
      { itemId: "chair", x: 120, y: 260 },
      { itemId: "chair", x: 150, y: 260 },
      { itemId: "chair", x: 180, y: 260 },
      { itemId: "chair", x: 210, y: 260 },
      { itemId: "chair", x: 240, y: 260 },
      // Right side chairs (5 rows of 5)
      { itemId: "chair", x: 360, y: 140 },
      { itemId: "chair", x: 390, y: 140 },
      { itemId: "chair", x: 420, y: 140 },
      { itemId: "chair", x: 450, y: 140 },
      { itemId: "chair", x: 480, y: 140 },
      { itemId: "chair", x: 360, y: 170 },
      { itemId: "chair", x: 390, y: 170 },
      { itemId: "chair", x: 420, y: 170 },
      { itemId: "chair", x: 450, y: 170 },
      { itemId: "chair", x: 480, y: 170 },
      { itemId: "chair", x: 360, y: 200 },
      { itemId: "chair", x: 390, y: 200 },
      { itemId: "chair", x: 420, y: 200 },
      { itemId: "chair", x: 450, y: 200 },
      { itemId: "chair", x: 480, y: 200 },
      { itemId: "chair", x: 360, y: 230 },
      { itemId: "chair", x: 390, y: 230 },
      { itemId: "chair", x: 420, y: 230 },
      { itemId: "chair", x: 450, y: 230 },
      { itemId: "chair", x: 480, y: 230 },
      { itemId: "chair", x: 360, y: 260 },
      { itemId: "chair", x: 390, y: 260 },
      { itemId: "chair", x: 420, y: 260 },
      { itemId: "chair", x: 450, y: 260 },
      { itemId: "chair", x: 480, y: 260 },
      // Flower arrangements at front
      { itemId: "flower-arrangement", x: 200, y: 100 },
      { itemId: "flower-arrangement", x: 400, y: 100 },
    ],
  },

  // ── 4. U-Shape / Board Meeting ──
  {
    id: "u-shape",
    name: "U-Shape Conference",
    description: "U-shaped table arrangement ideal for meetings and presentations",
    roomPreset: "square",
    placements: [
      // Top row (head table)
      { itemId: "rect-8-8", isGroup: true, x: 250, y: 120 },
      // Left arm
      { itemId: "rect-8-8", isGroup: true, x: 120, y: 200, angle: 90 },
      { itemId: "rect-8-8", isGroup: true, x: 120, y: 310, angle: 90 },
      // Right arm
      { itemId: "rect-8-8", isGroup: true, x: 380, y: 200, angle: 90 },
      { itemId: "rect-8-8", isGroup: true, x: 380, y: 310, angle: 90 },
      // Presenter area
      { itemId: "cocktail-table", x: 250, y: 50 },
      // Coffee station back
      { itemId: "coffee-station", x: 250, y: 460 },
    ],
  },

  // ── 5. Cocktail / Mixer ──
  {
    id: "cocktail",
    name: "Cocktail Party",
    description: "Standing-room mixer with high-tops, bar stations, and lounge areas",
    roomPreset: "wide",
    placements: [
      // Two bars
      { itemId: "bar", x: 150, y: 80 },
      { itemId: "bar", x: 650, y: 80 },
      // High-top tables scattered
      { itemId: "high-top-table", x: 200, y: 180 },
      { itemId: "high-top-table", x: 350, y: 150 },
      { itemId: "high-top-table", x: 500, y: 180 },
      { itemId: "high-top-table", x: 650, y: 200 },
      { itemId: "high-top-table", x: 200, y: 300 },
      { itemId: "high-top-table", x: 400, y: 280 },
      { itemId: "high-top-table", x: 600, y: 310 },
      // Lounge sofas
      { itemId: "sofa", x: 100, y: 350, angle: 0 },
      { itemId: "sofa", x: 700, y: 350, angle: 0 },
      // Cocktail tables near sofas
      { itemId: "cocktail-table", x: 100, y: 310 },
      { itemId: "cocktail-table", x: 700, y: 310 },
      // Dance floor
      { itemId: "dance-floor", x: 400, y: 200 },
      // DJ booth
      { itemId: "dj-booth", x: 400, y: 60 },
      // Photo booth
      { itemId: "photo-booth", x: 750, y: 350 },
      // Dessert station
      { itemId: "dessert-station", x: 400, y: 380 },
    ],
  },
];
