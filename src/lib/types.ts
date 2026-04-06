import { v4 as uuid } from "uuid";

// ── Teams ──

export type TeamPlan = "teams_5" | "teams_10";
export type TeamMemberStatus = "pending" | "active" | "removed";
export type TeamRole = "coordinator" | "assistant" | "viewer";

export interface Team {
  id: string;
  ownerId: string;
  name: string;
  plan: TeamPlan;
  maxMembers: number;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  email: string;
  userId: string | null;
  role: TeamRole;
  status: TeamMemberStatus;
  inviteToken: string | null;
  invitedAt: string;
  acceptedAt: string | null;
}

export interface TeamEventAssignment {
  id: string;
  teamId: string;
  eventId: string;
  memberId: string;
  assignedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// ── Planner Profile ──

export type PlanType = "pending" | "trial" | "diy" | "professional" | "expired";

export interface PlannerProfile {
  businessName: string;
  plannerName: string;
  email: string;
  phone: string;
  website: string;
  logoUrl: string;          // Storage public URL, base64 data URL, or empty
  brandColor: string;       // hex color
  tagline: string;
  plan: PlanType;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePaymentId: string | null;
}

export type LightingType = "uplight" | "spotlight" | "pinspot" | "gobo" | "wash" | "string" | "candles";

export interface LightingZone {
  id: string;
  name: string;
  type: LightingType;
  color: string;          // hex color
  colorTemperature?: number; // Kelvin (1000–15000) — overrides color when set
  intensity: number;      // 0–100
  x: number;              // percentage position (0–100)
  y: number;              // percentage position (0–100)
  size: number;           // size in pixels (10–200)
  angle: number;          // rotation in degrees (0–360)
  height: number;         // mounting height in feet (1–20), default varies by type
  spread: number;         // beam spread angle in degrees (10–120), default varies by type
  notes: string;
  snappedToFurnitureId?: string;  // canvas object data.label when snapped to furniture
  goboPattern?: string;           // pattern name for gobo projectors (e.g., "leaves", "stars")
}

export interface View3DSettings {
  venuePreset: "none" | "indoor-ballroom" | "tent" | "outdoor-garden" | "rooftop" | "barn" | "beach";
  chairStyle: "solid-back" | "chiavari" | "folding" | "ghost";
  linenColor: "ivory" | "white" | "blush" | "navy" | "sage" | "gold";
  floorMaterial: "hardwood" | "marble" | "carpet" | "concrete" | "tile";
  floorColor: string | null;
  lightingMood: "warm" | "cool" | "neutral" | "dramatic";
  lightingColorCast: number;
  chairColor: string | null;
  linenCustomColor: string | null;
  wallColor: string | null;
  matchSeatToLinen: boolean;
  showLabels: boolean;
  showShadows: boolean;
  cameraPreset: "default" | "birds-eye" | "eye-level" | "presentation" | "walkthrough";
  qualityOverride: "auto" | "low" | "medium" | "high";
  exposure: number;
}

export interface FloorPlan {
  id: string;
  name: string;
  json: string | null;              // legacy — replaced by layoutObjects
  lightingZones: LightingZone[];
  layoutObjects: LayoutObject[];
  roomShape: RoomShape | null;
  canvasWidth: number;
  canvasHeight: number;
  view3dSettings?: View3DSettings | null;
}

export function createDefaultFloorPlans(): FloorPlan[] {
  const defaults = { json: null, lightingZones: [], layoutObjects: [], roomShape: null, canvasWidth: 600, canvasHeight: 400 };
  return [
    { id: uuid(), name: "Ceremony", ...defaults },
    { id: uuid(), name: "Cocktail Hour", ...defaults },
    { id: uuid(), name: "Reception", ...defaults },
    { id: uuid(), name: "Dance Floor", ...defaults },
  ];
}

// ── Tablescape ──

export type TableShape = "round" | "rectangular" | "square";

export interface TablescapeItem {
  id: string;
  assetId: string;          // slug from models-manifest.json
  positionX: number;        // meters, relative to table center
  positionY: number;        // meters, height above table surface
  positionZ: number;        // meters, relative to table center
  rotationY: number;        // Y-axis rotation in radians
  scale: number;            // uniform scale multiplier (default 1)
  colorOverride: string | null; // hex color for mat_primary swap
}

export interface Tablescape {
  id: string;
  name: string;
  tableShape: TableShape;
  tableWidth: number;       // inches
  tableDepth: number;       // inches
  items: TablescapeItem[];
}

export function createDefaultTablescapes(): Tablescape[] {
  return [
    { id: uuid(), name: "Head Table", tableShape: "rectangular", tableWidth: 96, tableDepth: 30, items: [] },
    { id: uuid(), name: "Guest Table", tableShape: "round", tableWidth: 60, tableDepth: 60, items: [] },
  ];
}

export interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  clientName: string;
  clientEmail: string;
  status: "planning" | "confirmed" | "completed";
  floorPlanJSON: string | null;
  floorPlans: FloorPlan[];
  tablescapes: Tablescape[];
  files: SharedFile[];
  timeline: TimelineItem[];   // to-do checklist items
  schedule: ScheduleItem[];   // day-of timeline
  vendors: Vendor[];
  questionnaires: QuestionnaireAssignment[];
  invoices: Invoice[];
  expenses: Expense[];
  guests: Guest[];
  colorPalette: string[];
  moodBoard: MoodBoardImage[];
  discoveredVendors: DiscoveredVendor[];
  contracts: EventContract[];
  budget: BudgetItem[];
  messages: Message[];
  archivedAt: string | null;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
  // Wedding website fields
  weddingPageEnabled: boolean;
  weddingSlug: string | null;
  weddingHeadline: string;
  weddingStory: string;
  weddingHeroStoragePath: string;
  weddingVenueDetails: WeddingVenueDetails;
  weddingTravelInfo: WeddingTravelItem[];
  weddingFaq: WeddingFaqItem[];
  weddingRegistryLinks: WeddingRegistryLink[];
  weddingSectionsOrder: string[];
  // Layout approval (client presentation flow)
  layoutApprovalStatus?: "pending" | "approved" | "changes_requested" | null;
  layoutApprovalAt?: string | null;
  layoutApprovalNote?: string | null;
}

export interface WeddingVenueDetails {
  address?: string;
  mapUrl?: string;
  parkingNotes?: string;
  description?: string;
}

export interface WeddingTravelItem {
  id: string;
  title: string;
  description: string;
  url?: string;
}

export interface WeddingFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface WeddingRegistryLink {
  id: string;
  name: string;
  url: string;
}

export interface ScheduleItem {
  id: string;
  time: string;   // "HH:MM" 24-hour format
  title: string;
  notes: string;
  showOnWeddingPage: boolean;
}

export interface SharedFile {
  id: string;
  name: string;
  type: "contract" | "photo" | "moodboard" | "other";
  url: string;              // Storage path or legacy base64/placeholder
  storagePath: string | null; // Supabase Storage path (when migrated)
  uploadedAt: string;
}

export interface TimelineItem {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  order: number;
}

export interface FurnitureItemDef {
  id: string;
  name: string;
  category: "table" | "seating" | "entertainment" | "decor" | "structure" | "room-feature";
  shape: "circle" | "rect";
  defaultWidth: number;
  defaultHeight: number;
  defaultRadius?: number;
  fill: string;
  stroke: string;
  maxSeats?: number;
}

export interface RoomPreset {
  id: string;
  name: string;
  points: number[][];
  width: number;
  height: number;
}

// ── Phase 2: Spatial Data Model ──

export interface SnapPoint {
  x: number;      // inches, relative to asset center
  y: number;      // inches, relative to asset center
  angle: number;  // degrees, direction the snap point faces
}

export interface ModelVariant {
  name: string;
  color: string;
  material: string;
  productFolder: string;
}

/** Unified asset definition — replaces FurnitureItemDef + models-manifest entries */
export interface AssetDefinition {
  id: string;
  name: string;
  category: string;
  subcategory: string;

  // 2D rendering
  shape: "circle" | "rect";
  defaultWidth: number;       // inches
  defaultHeight: number;      // inches
  defaultRadius?: number;     // inches
  fillColor: string;
  strokeColor: string;

  // Capacity
  maxSeats: number;
  minSeats: number;
  seatSpacing: number;        // inches between seat centers

  // Snap points
  snapPoints: SnapPoint[];

  // 3D model
  modelFilePath: string | null;
  modelFileSize: number | null;
  modelComplexity: "low" | "medium" | "high" | null;
  modelVariants: ModelVariant[];

  // Physical 3D dimensions (inches)
  physicalWidthIn: number | null;
  physicalDepthIn: number | null;
  physicalHeightIn: number | null;

  // Extensibility (vendor, SKU, price, weight, etc.)
  metadata: Record<string, unknown>;

  source: "builtin" | "model_manifest" | "custom";
  active: boolean;
}

/** Individual object placed on a floor plan */
export interface LayoutObject {
  id: string;
  floorPlanId: string;
  assetId: string;

  // Spatial (inches)
  positionX: number;
  positionY: number;
  rotation: number;            // degrees
  scaleX: number;
  scaleY: number;

  // Dimension overrides (null = use asset defaults)
  widthOverride: number | null;
  heightOverride: number | null;

  label: string;

  // Grouping
  groupId: string | null;
  parentId: string | null;

  // Table assignment
  tableId: string | null;

  // Visual overrides
  fillOverride: string | null;
  strokeOverride: string | null;

  tablescapeId: string | null;

  metadata: Record<string, unknown>;
  zIndex: number;
}

/** Room shape stored on floor_plans */
export interface RoomShape {
  points: number[][];          // [[x,y], ...] in inches
  width: number;               // bounding width in inches
  height: number;              // bounding height in inches
}

/** Version history snapshot */
export interface LayoutVersion {
  id: string;
  floorPlanId: string;
  versionNumber: number;
  label: string;
  snapshot: LayoutObject[];
  roomShape: RoomShape | null;
  createdAt: string;
}

export type VendorCategory =
  | "catering"
  | "photography"
  | "videography"
  | "music"
  | "flowers"
  | "cake"
  | "venue"
  | "hair & makeup"
  | "transport"
  | "officiant"
  | "other";

export interface VendorPaymentItem {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  paidDate: string | null;
}

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  contact: string;
  phone: string;
  email: string;
  notes: string;
  mealChoice: string;          // vendor meal selection (e.g. "Chicken", "Vegetarian")
  contractTotal: number;
  payments: VendorPaymentItem[];
}

// ── Questionnaires ──

export type QuestionType = "text" | "textarea" | "select" | "multiselect" | "date";

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];       // for select / multiselect
  required: boolean;
}

export interface Questionnaire {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionnaireAssignment {
  questionnaireId: string;
  questionnaireName: string;   // snapshot of name at time of assignment
  answers: Record<string, string | string[]>;  // questionId → answer
  completedAt: string | null;
}

// ── Guests ──

export type RsvpStatus = "pending" | "accepted" | "declined";

export interface Guest {
  id: string;
  name: string;
  email: string;
  rsvp: RsvpStatus;
  mealChoice: string;
  tableAssignment: string;
  plusOne: boolean;
  plusOneName: string;
  dietaryNotes: string;
  group: string;           // e.g. "Bride's Family", "College Friends"
  vip: boolean;            // VIPs get priority seating
}

export type RelationshipType = "together" | "apart";

export interface GuestRelationship {
  guestId1: string;
  guestId2: string;
  type: RelationshipType;
}

// ── Expenses ──

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
}

// ── Budget ──

export const BUDGET_CATEGORIES = [
  "Venue",
  "Catering",
  "Photography",
  "Videography",
  "Flowers & Decor",
  "Music & Entertainment",
  "Cake & Desserts",
  "Attire & Beauty",
  "Stationery",
  "Transportation",
  "Favors & Gifts",
  "Officiant",
  "Rentals",
  "Lighting",
  "Planner Fee",
  "Other",
] as const;

export interface BudgetItem {
  id: string;
  category: string;
  allocated: number;
  notes: string;
}

// Maps vendor categories → budget categories for auto-tracking
export const VENDOR_TO_BUDGET_CATEGORY: Record<VendorCategory, string> = {
  venue: "Venue",
  catering: "Catering",
  photography: "Photography",
  videography: "Videography",
  flowers: "Flowers & Decor",
  music: "Music & Entertainment",
  cake: "Cake & Desserts",
  "hair & makeup": "Attire & Beauty",
  transport: "Transportation",
  officiant: "Officiant",
  other: "Other",
};

// ── Contract Templates (planner-level reusable) ──

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  fileData: string;       // Storage path or legacy base64 data URL
  fileName: string;
  fileSize: number;       // bytes
  storagePath: string | null; // Supabase Storage path (when migrated)
  createdAt: string;
  updatedAt: string;
}

// ── Event Contracts ──

export interface EventContract {
  id: string;
  templateId: string | null;
  name: string;
  type: "planner" | "vendor";
  vendorId: string | null;
  vendorName: string | null;
  fileData: string;           // Storage path or legacy base64 data URL
  fileName: string;
  fileSize: number;
  signedFileData: string | null;
  signedFileName: string | null;
  signedAt: string | null;
  assignedAt: string;
  // E-signature fields
  plannerSignature: string | null;   // Storage path or legacy base64 PNG
  plannerSignedAt: string | null;
  plannerSignedName: string | null;
  clientSignature: string | null;    // Storage path or legacy base64 PNG
  clientSignedAt: string | null;
  clientSignedName: string | null;
  // Storage paths (when migrated)
  storagePath: string | null;
  storageSignedPath: string | null;
  storagePlannerSig: string | null;
  storageClientSig: string | null;
  // E-signature disclosure tracking
  plannerDisclosureAcceptedAt: string | null;
  plannerDisclosureIp: string | null;
  clientDisclosureAcceptedAt: string | null;
  clientDisclosureIp: string | null;
}

// ── Contract Audit Trail ──

export type ContractAuditAction =
  | "contract_created"
  | "contract_viewed"
  | "contract_downloaded"
  | "disclosure_accepted"
  | "signature_applied"
  | "signature_removed"
  | "signed_copy_uploaded"
  | "contract_deleted";

export interface ContractAuditEntry {
  id: string;
  eventId: string;
  contractId: string;
  userId: string | null;
  actorType: "planner" | "client";
  action: ContractAuditAction;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ── Preferred Vendors (planner-level saved list) ──

export interface PreferredVendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  phone: string;
  website: string;
  address: string;
  priceLevel: number;
  googleMapsUrl: string;
  notes: string;
  addedAt: string;
}

// ── Discovered Vendors (shared to client portal) ──

export interface DiscoveredVendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  phone: string;
  website: string;
  address: string;
  priceLevel: number;
  googleMapsUrl: string;
  sharedAt: string;
}

// ── Mood Board ──

export interface MoodBoardImage {
  id: string;
  url: string;        // Storage signed URL or legacy base64 data URL
  thumb: string;      // Storage signed URL or legacy thumbnail base64
  caption: string;
  addedAt: string;
  storagePath: string | null;  // Supabase Storage path for full image
  storageThumb: string | null; // Supabase Storage path for thumbnail
}

// ── Messages ──

export interface Message {
  id: string;
  sender: "planner" | "client";
  senderName: string;
  text: string;
  createdAt: string;
}

// ── Invoices ──

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  number: string;
  status: "draft" | "sent" | "paid";
  lineItems: InvoiceLineItem[];
  notes: string;
  dueDate: string | null;
  createdAt: string;
}

// ── Inquiries / Leads ──

export type InquiryStatus = "inquiry" | "consultation";

export interface Inquiry {
  id: string;
  name: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventDate: string;
  venue: string;
  estimatedBudget: string;
  notes: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
}

// ── AI Designs ──

export interface DesignProject {
  id: string;
  name: string;
  clientName: string | null;
  clientEmail: string | null;
  eventDate: string | null;
  venueName: string | null;
  status: "draft" | "active" | "generating" | "complete" | "archived";
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VenuePhoto {
  id: string;
  projectId: string;
  storagePath: string;
  originalName: string;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface GeneratedImage {
  id: string;
  projectId: string;
  venuePhotoId: string;
  styleId: string | null;
  storagePath: string | null;
  thumbnailPath: string | null;
  replicateId: string | null;
  status: "pending" | "processing" | "complete" | "failed";
  errorMessage: string | null;
  promptUsed: string;
  seed: number | null;
  generationTimeMs: number | null;
  createdAt: string;
}
