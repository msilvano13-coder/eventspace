// ── Planner Profile ──

export interface PlannerProfile {
  businessName: string;
  plannerName: string;
  email: string;
  phone: string;
  website: string;
  logoUrl: string;          // base64 data URL or empty
  brandColor: string;       // hex color
  tagline: string;
}

export interface FloorPlan {
  id: string;
  name: string;
  json: string | null;
}

export const DEFAULT_FLOOR_PLANS: Omit<FloorPlan, "json">[] = [
  { id: "ceremony", name: "Ceremony" },
  { id: "cocktail", name: "Cocktail Hour" },
  { id: "reception", name: "Reception" },
  { id: "dancefloor", name: "Dance Floor" },
];

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
  budget: BudgetItem[];
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleItem {
  id: string;
  time: string;   // "HH:MM" 24-hour format
  title: string;
  notes: string;
}

export interface SharedFile {
  id: string;
  name: string;
  type: "contract" | "photo" | "moodboard" | "other";
  url: string;
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
  category: "table" | "seating" | "entertainment" | "decor" | "structure";
  shape: "circle" | "rect";
  defaultWidth: number;
  defaultHeight: number;
  defaultRadius?: number;
  fill: string;
  stroke: string;
}

export interface RoomPreset {
  id: string;
  name: string;
  points: number[][];
  width: number;
  height: number;
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

// ── Mood Board ──

export interface MoodBoardImage {
  id: string;
  url: string;        // base64 data URL
  caption: string;
  addedAt: string;
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
