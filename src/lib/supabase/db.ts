import { createClient } from "@/lib/supabase/client";
import type {
  Event,
  FloorPlan,
  LightingZone,
  TimelineItem,
  ScheduleItem,
  Vendor,
  VendorPaymentItem,
  Guest,
  QuestionnaireAssignment,
  Invoice,
  InvoiceLineItem,
  Expense,
  BudgetItem,
  EventContract,
  SharedFile,
  MoodBoardImage,
  Message,
  DiscoveredVendor,
  PlannerProfile,
  Questionnaire,
  Inquiry,
  PreferredVendor,
  ContractTemplate,
} from "@/lib/types";
import { MAX_EVENTS } from "@/lib/plan-features";
import type { PlanType } from "@/lib/types";

// ────────────────────────────────────────────────────────────────────────────
// Helper: get current authenticated user id
// ────────────────────────────────────────────────────────────────────────────

export async function getUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

// ════════════════════════════════════════════════════════════════════════════
// ROW ↔ MODEL MAPPERS
// ════════════════════════════════════════════════════════════════════════════

// ── Event ──

function eventToRow(
  e: Omit<Event, "id" | "createdAt" | "updatedAt">,
  userId: string
) {
  return {
    name: e.name,
    date: e.date,
    venue: e.venue,
    client_name: e.clientName,
    client_email: e.clientEmail,
    status: e.status,
    color_palette: e.colorPalette,
    archived_at: e.archivedAt ?? null,
    user_id: userId,
  };
}

function eventFieldsToRow(fields: Partial<Event>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (fields.name !== undefined) row.name = fields.name;
  if (fields.date !== undefined) row.date = fields.date;
  if (fields.venue !== undefined) row.venue = fields.venue;
  if (fields.clientName !== undefined) row.client_name = fields.clientName;
  if (fields.clientEmail !== undefined) row.client_email = fields.clientEmail;
  if (fields.status !== undefined) row.status = fields.status;
  if (fields.colorPalette !== undefined)
    row.color_palette = fields.colorPalette;
  if (fields.archivedAt !== undefined) row.archived_at = fields.archivedAt;
  if (fields.updatedAt !== undefined) row.updated_at = fields.updatedAt;
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function eventFromRow(r: any): Event {
  return {
    id: r.id,
    name: r.name,
    date: r.date,
    venue: r.venue,
    clientName: r.client_name,
    clientEmail: r.client_email,
    status: r.status,
    floorPlanJSON: null,
    colorPalette: r.color_palette ?? [],
    archivedAt: r.archived_at ?? null,
    shareToken: r.share_token ?? '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    // Sub-entities — mapped if present, otherwise empty arrays
    floorPlans: Array.isArray(r.floor_plans)
      ? r.floor_plans.map(floorPlanFromRow)
      : [],
    timeline: Array.isArray(r.timeline_items)
      ? r.timeline_items.map(timelineItemFromRow)
      : [],
    schedule: Array.isArray(r.schedule_items)
      ? r.schedule_items.map(scheduleItemFromRow)
      : [],
    vendors: Array.isArray(r.vendors) ? r.vendors.map(vendorFromRow) : [],
    guests: Array.isArray(r.guests) ? r.guests.map(guestFromRow) : [],
    questionnaires: Array.isArray(r.questionnaire_assignments)
      ? r.questionnaire_assignments.map(questionnaireAssignmentFromRow)
      : [],
    invoices: Array.isArray(r.invoices)
      ? r.invoices.map(invoiceFromRow)
      : [],
    expenses: Array.isArray(r.expenses)
      ? r.expenses.map(expenseFromRow)
      : [],
    budget: Array.isArray(r.budget_items)
      ? r.budget_items.map(budgetItemFromRow)
      : [],
    contracts: Array.isArray(r.event_contracts)
      ? r.event_contracts.map(eventContractFromRow)
      : [],
    files: Array.isArray(r.shared_files)
      ? r.shared_files.map(sharedFileFromRow)
      : [],
    moodBoard: Array.isArray(r.mood_board_images)
      ? r.mood_board_images.map(moodBoardImageFromRow)
      : [],
    messages: Array.isArray(r.messages)
      ? r.messages.map(messageFromRow)
      : [],
    discoveredVendors: Array.isArray(r.discovered_vendors)
      ? r.discovered_vendors.map(discoveredVendorFromRow)
      : [],
  };
}

// ── FloorPlan ──

function floorPlanToRow(fp: FloorPlan, eventId: string, index: number) {
  return {
    id: fp.id,
    event_id: eventId,
    name: fp.name,
    json: fp.json ?? null,
    sort_order: index,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function floorPlanFromRow(r: any): FloorPlan {
  return {
    id: r.id,
    name: r.name,
    json: r.json ?? null,
    lightingZones: Array.isArray(r.lighting_zones)
      ? r.lighting_zones.map(lightingZoneFromRow)
      : [],
  };
}

// ── LightingZone ──

function lightingZoneToRow(lz: LightingZone, floorPlanId: string) {
  return {
    id: lz.id,
    floor_plan_id: floorPlanId,
    name: lz.name,
    type: lz.type,
    color: lz.color,
    intensity: lz.intensity,
    x: lz.x,
    y: lz.y,
    size: lz.size,
    notes: lz.notes,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lightingZoneFromRow(r: any): LightingZone {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    color: r.color,
    intensity: r.intensity,
    x: r.x,
    y: r.y,
    size: r.size,
    notes: r.notes,
  };
}

// ── TimelineItem ──

function timelineItemToRow(t: TimelineItem, eventId: string) {
  return {
    id: t.id,
    event_id: eventId,
    title: t.title,
    due_date: t.dueDate ?? null,
    completed: t.completed,
    sort_order: t.order,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function timelineItemFromRow(r: any): TimelineItem {
  return {
    id: r.id,
    title: r.title,
    dueDate: r.due_date ?? null,
    completed: r.completed,
    order: r.sort_order,
  };
}

// ── ScheduleItem ──

function scheduleItemToRow(s: ScheduleItem, eventId: string) {
  return {
    id: s.id,
    event_id: eventId,
    time: s.time,
    title: s.title,
    notes: s.notes,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scheduleItemFromRow(r: any): ScheduleItem {
  return {
    id: r.id,
    time: r.time,
    title: r.title,
    notes: r.notes,
  };
}

// ── Vendor ──

function vendorToRow(v: Vendor, eventId: string) {
  return {
    id: v.id,
    event_id: eventId,
    name: v.name,
    category: v.category,
    contact: v.contact,
    phone: v.phone,
    email: v.email,
    notes: v.notes,
    meal_choice: v.mealChoice,
    contract_total: v.contractTotal,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function vendorFromRow(r: any): Vendor {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    contact: r.contact,
    phone: r.phone,
    email: r.email,
    notes: r.notes,
    mealChoice: r.meal_choice,
    contractTotal: r.contract_total,
    payments: Array.isArray(r.vendor_payments)
      ? r.vendor_payments.map(vendorPaymentFromRow)
      : [],
  };
}

// ── VendorPaymentItem ──

function vendorPaymentToRow(p: VendorPaymentItem, vendorId: string) {
  return {
    id: p.id,
    vendor_id: vendorId,
    description: p.description,
    amount: p.amount,
    due_date: p.dueDate,
    paid: p.paid,
    paid_date: p.paidDate ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function vendorPaymentFromRow(r: any): VendorPaymentItem {
  return {
    id: r.id,
    description: r.description,
    amount: r.amount,
    dueDate: r.due_date,
    paid: r.paid,
    paidDate: r.paid_date ?? null,
  };
}

// ── Guest ──

function guestToRow(g: Guest, eventId: string) {
  return {
    id: g.id,
    event_id: eventId,
    name: g.name,
    email: g.email,
    rsvp: g.rsvp,
    meal_choice: g.mealChoice,
    table_assignment: g.tableAssignment,
    plus_one: g.plusOne,
    plus_one_name: g.plusOneName,
    dietary_notes: g.dietaryNotes,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function guestFromRow(r: any): Guest {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    rsvp: r.rsvp,
    mealChoice: r.meal_choice,
    tableAssignment: r.table_assignment,
    plusOne: r.plus_one,
    plusOneName: r.plus_one_name,
    dietaryNotes: r.dietary_notes,
  };
}

// ── QuestionnaireAssignment ──

function questionnaireAssignmentToRow(
  qa: QuestionnaireAssignment,
  eventId: string
) {
  return {
    event_id: eventId,
    questionnaire_id: qa.questionnaireId,
    questionnaire_name: qa.questionnaireName,
    answers: qa.answers,
    completed_at: qa.completedAt ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function questionnaireAssignmentFromRow(r: any): QuestionnaireAssignment {
  return {
    questionnaireId: r.questionnaire_id,
    questionnaireName: r.questionnaire_name,
    answers: r.answers ?? {},
    completedAt: r.completed_at ?? null,
  };
}

// ── Invoice ──

function invoiceToRow(inv: Invoice, eventId: string) {
  return {
    id: inv.id,
    event_id: eventId,
    number: inv.number,
    status: inv.status,
    notes: inv.notes,
    due_date: inv.dueDate ?? null,
    created_at: inv.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function invoiceFromRow(r: any): Invoice {
  return {
    id: r.id,
    number: r.number,
    status: r.status,
    notes: r.notes,
    dueDate: r.due_date ?? null,
    createdAt: r.created_at,
    lineItems: Array.isArray(r.invoice_line_items)
      ? r.invoice_line_items.map(invoiceLineItemFromRow)
      : [],
  };
}

// ── InvoiceLineItem ──

function invoiceLineItemToRow(li: InvoiceLineItem, invoiceId: string) {
  return {
    id: li.id,
    invoice_id: invoiceId,
    description: li.description,
    quantity: li.quantity,
    unit_price: li.unitPrice,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function invoiceLineItemFromRow(r: any): InvoiceLineItem {
  return {
    id: r.id,
    description: r.description,
    quantity: r.quantity,
    unitPrice: r.unit_price,
  };
}

// ── Expense ──

function expenseToRow(e: Expense, eventId: string) {
  return {
    id: e.id,
    event_id: eventId,
    description: e.description,
    amount: e.amount,
    category: e.category,
    date: e.date,
    notes: e.notes,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expenseFromRow(r: any): Expense {
  return {
    id: r.id,
    description: r.description,
    amount: r.amount,
    category: r.category,
    date: r.date,
    notes: r.notes,
  };
}

// ── BudgetItem ──

function budgetItemToRow(b: BudgetItem, eventId: string) {
  return {
    id: b.id,
    event_id: eventId,
    category: b.category,
    allocated: b.allocated,
    notes: b.notes,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function budgetItemFromRow(r: any): BudgetItem {
  return {
    id: r.id,
    category: r.category,
    allocated: r.allocated,
    notes: r.notes,
  };
}

// ── EventContract ──

function eventContractToRow(c: EventContract, eventId: string) {
  return {
    id: c.id,
    event_id: eventId,
    template_id: c.templateId ?? null,
    name: c.name,
    type: c.type,
    vendor_id: c.vendorId ?? null,
    vendor_name: c.vendorName ?? null,
    file_data: c.fileData,
    file_name: c.fileName,
    file_size: c.fileSize,
    signed_file_data: c.signedFileData ?? null,
    signed_file_name: c.signedFileName ?? null,
    signed_at: c.signedAt ?? null,
    assigned_at: c.assignedAt,
    planner_signature: c.plannerSignature ?? null,
    planner_signed_at: c.plannerSignedAt ?? null,
    planner_signed_name: c.plannerSignedName ?? null,
    client_signature: c.clientSignature ?? null,
    client_signed_at: c.clientSignedAt ?? null,
    client_signed_name: c.clientSignedName ?? null,
    storage_path: c.storagePath ?? null,
    storage_signed_path: c.storageSignedPath ?? null,
    storage_planner_sig: c.storagePlannerSig ?? null,
    storage_client_sig: c.storageClientSig ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function eventContractFromRow(r: any): EventContract {
  return {
    id: r.id,
    templateId: r.template_id ?? null,
    name: r.name,
    type: r.type,
    vendorId: r.vendor_id ?? null,
    vendorName: r.vendor_name ?? null,
    fileData: r.file_data,
    fileName: r.file_name,
    fileSize: r.file_size,
    signedFileData: r.signed_file_data ?? null,
    signedFileName: r.signed_file_name ?? null,
    signedAt: r.signed_at ?? null,
    assignedAt: r.assigned_at,
    plannerSignature: r.planner_signature ?? null,
    plannerSignedAt: r.planner_signed_at ?? null,
    plannerSignedName: r.planner_signed_name ?? null,
    clientSignature: r.client_signature ?? null,
    clientSignedAt: r.client_signed_at ?? null,
    clientSignedName: r.client_signed_name ?? null,
    storagePath: r.storage_path ?? null,
    storageSignedPath: r.storage_signed_path ?? null,
    storagePlannerSig: r.storage_planner_sig ?? null,
    storageClientSig: r.storage_client_sig ?? null,
  };
}

// ── SharedFile ──

function sharedFileToRow(f: SharedFile, eventId: string) {
  return {
    id: f.id,
    event_id: eventId,
    name: f.name,
    type: f.type,
    url: f.url,
    storage_path: f.storagePath ?? null,
    uploaded_at: f.uploadedAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sharedFileFromRow(r: any): SharedFile {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    url: r.storage_path || r.url,
    storagePath: r.storage_path ?? null,
    uploadedAt: r.uploaded_at,
  };
}

// ── MoodBoardImage ──

function moodBoardImageToRow(img: MoodBoardImage, eventId: string) {
  return {
    id: img.id,
    event_id: eventId,
    url: img.url,
    thumb: img.thumb,
    caption: img.caption,
    added_at: img.addedAt,
    storage_path: img.storagePath ?? null,
    storage_thumb: img.storageThumb ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function moodBoardImageFromRow(r: any): MoodBoardImage {
  return {
    id: r.id,
    url: r.url,
    thumb: r.thumb,
    caption: r.caption,
    addedAt: r.added_at,
    storagePath: r.storage_path ?? null,
    storageThumb: r.storage_thumb ?? null,
  };
}

// ── Message ──

function messageToRow(m: Message, eventId: string) {
  return {
    id: m.id,
    event_id: eventId,
    sender: m.sender,
    sender_name: m.senderName,
    text: m.text,
    created_at: m.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function messageFromRow(r: any): Message {
  return {
    id: r.id,
    sender: r.sender,
    senderName: r.sender_name,
    text: r.text,
    createdAt: r.created_at,
  };
}

// ── DiscoveredVendor ──

function discoveredVendorToRow(dv: DiscoveredVendor, eventId: string) {
  return {
    id: dv.id,
    event_id: eventId,
    name: dv.name,
    category: dv.category,
    rating: dv.rating,
    review_count: dv.reviewCount,
    phone: dv.phone,
    website: dv.website,
    address: dv.address,
    price_level: dv.priceLevel,
    google_maps_url: dv.googleMapsUrl,
    shared_at: dv.sharedAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function discoveredVendorFromRow(r: any): DiscoveredVendor {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    rating: r.rating,
    reviewCount: r.review_count,
    phone: r.phone,
    website: r.website,
    address: r.address,
    priceLevel: r.price_level,
    googleMapsUrl: r.google_maps_url,
    sharedAt: r.shared_at,
  };
}

// ── PlannerProfile ──

function profileToRow(p: Partial<PlannerProfile>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (p.businessName !== undefined) row.business_name = p.businessName;
  if (p.plannerName !== undefined) row.planner_name = p.plannerName;
  if (p.email !== undefined) row.email = p.email;
  if (p.phone !== undefined) row.phone = p.phone;
  if (p.website !== undefined) row.website = p.website;
  if (p.logoUrl !== undefined) row.logo_url = p.logoUrl;
  if (p.brandColor !== undefined) row.brand_color = p.brandColor;
  if (p.tagline !== undefined) row.tagline = p.tagline;
  if (p.plan !== undefined) row.plan = p.plan;
  if (p.trialEndsAt !== undefined) row.trial_ends_at = p.trialEndsAt;
  if (p.stripeCustomerId !== undefined) row.stripe_customer_id = p.stripeCustomerId;
  if (p.stripeSubscriptionId !== undefined) row.stripe_subscription_id = p.stripeSubscriptionId;
  if (p.stripePaymentId !== undefined) row.stripe_payment_id = p.stripePaymentId;
  return row;
}

function safeProfileToRow(p: Partial<PlannerProfile>): Record<string, unknown> {
  // Strip out fields that should only be set by webhooks/server
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  const { plan, trialEndsAt, stripeCustomerId, stripeSubscriptionId, stripePaymentId, ...safe } = p as any;
  return profileToRow(safe as Partial<PlannerProfile>);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function profileFromRow(r: any): PlannerProfile {
  return {
    businessName: r.business_name ?? "",
    plannerName: r.planner_name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    website: r.website ?? "",
    logoUrl: r.logo_url ?? "",
    brandColor: r.brand_color ?? "#e88b8b",
    tagline: r.tagline ?? "",
    plan: r.plan ?? "trial",
    trialEndsAt: r.trial_ends_at ?? null,
    stripeCustomerId: r.stripe_customer_id ?? null,
    stripeSubscriptionId: r.stripe_subscription_id ?? null,
    stripePaymentId: r.stripe_payment_id ?? null,
  };
}

// ── Questionnaire ──

function questionnaireToRow(
  q: Omit<Questionnaire, "id" | "createdAt" | "updatedAt">,
  userId: string
) {
  return {
    name: q.name,
    description: q.description,
    questions: q.questions,
    user_id: userId,
  };
}

function questionnaireFieldsToRow(
  fields: Partial<Questionnaire>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (fields.name !== undefined) row.name = fields.name;
  if (fields.description !== undefined) row.description = fields.description;
  if (fields.questions !== undefined) row.questions = fields.questions;
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function questionnaireFromRow(r: any): Questionnaire {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    questions: r.questions ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── Inquiry ──

function inquiryToRow(
  inq: Omit<Inquiry, "id" | "createdAt" | "updatedAt">,
  userId: string
) {
  return {
    name: inq.name,
    client_name: inq.clientName,
    client_email: inq.clientEmail,
    client_phone: inq.clientPhone,
    event_date: inq.eventDate,
    venue: inq.venue,
    estimated_budget: inq.estimatedBudget,
    notes: inq.notes,
    status: inq.status,
    user_id: userId,
  };
}

function inquiryFieldsToRow(
  fields: Partial<Inquiry>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (fields.name !== undefined) row.name = fields.name;
  if (fields.clientName !== undefined) row.client_name = fields.clientName;
  if (fields.clientEmail !== undefined) row.client_email = fields.clientEmail;
  if (fields.clientPhone !== undefined) row.client_phone = fields.clientPhone;
  if (fields.eventDate !== undefined) row.event_date = fields.eventDate;
  if (fields.venue !== undefined) row.venue = fields.venue;
  if (fields.estimatedBudget !== undefined)
    row.estimated_budget = fields.estimatedBudget;
  if (fields.notes !== undefined) row.notes = fields.notes;
  if (fields.status !== undefined) row.status = fields.status;
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inquiryFromRow(r: any): Inquiry {
  return {
    id: r.id,
    name: r.name,
    clientName: r.client_name,
    clientEmail: r.client_email,
    clientPhone: r.client_phone,
    eventDate: r.event_date,
    venue: r.venue,
    estimatedBudget: r.estimated_budget,
    notes: r.notes,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── PreferredVendor ──

function preferredVendorToRow(v: PreferredVendor, userId: string) {
  return {
    id: v.id,
    user_id: userId,
    name: v.name,
    category: v.category,
    rating: v.rating,
    review_count: v.reviewCount,
    phone: v.phone,
    website: v.website,
    address: v.address,
    price_level: v.priceLevel,
    google_maps_url: v.googleMapsUrl,
    notes: v.notes,
    added_at: v.addedAt,
  };
}

function preferredVendorFieldsToRow(
  fields: Partial<PreferredVendor>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (fields.name !== undefined) row.name = fields.name;
  if (fields.category !== undefined) row.category = fields.category;
  if (fields.rating !== undefined) row.rating = fields.rating;
  if (fields.reviewCount !== undefined) row.review_count = fields.reviewCount;
  if (fields.phone !== undefined) row.phone = fields.phone;
  if (fields.website !== undefined) row.website = fields.website;
  if (fields.address !== undefined) row.address = fields.address;
  if (fields.priceLevel !== undefined) row.price_level = fields.priceLevel;
  if (fields.googleMapsUrl !== undefined)
    row.google_maps_url = fields.googleMapsUrl;
  if (fields.notes !== undefined) row.notes = fields.notes;
  if (fields.addedAt !== undefined) row.added_at = fields.addedAt;
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function preferredVendorFromRow(r: any): PreferredVendor {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    rating: r.rating,
    reviewCount: r.review_count,
    phone: r.phone,
    website: r.website,
    address: r.address,
    priceLevel: r.price_level,
    googleMapsUrl: r.google_maps_url,
    notes: r.notes,
    addedAt: r.added_at,
  };
}

// ── ContractTemplate ──

function contractTemplateToRow(t: ContractTemplate, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    name: t.name,
    description: t.description,
    file_data: t.fileData,
    file_name: t.fileName,
    file_size: t.fileSize,
    storage_path: t.storagePath ?? null,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

function contractTemplateFieldsToRow(
  fields: Partial<ContractTemplate>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (fields.name !== undefined) row.name = fields.name;
  if (fields.description !== undefined) row.description = fields.description;
  if (fields.fileData !== undefined) row.file_data = fields.fileData;
  if (fields.fileName !== undefined) row.file_name = fields.fileName;
  if (fields.fileSize !== undefined) row.file_size = fields.fileSize;
  if (fields.storagePath !== undefined) row.storage_path = fields.storagePath;
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function contractTemplateFromRow(r: any): ContractTemplate {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    fileData: r.file_data,
    fileName: r.file_name,
    fileSize: r.file_size,
    storagePath: r.storage_path ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────
// Events
// ────────────────────────────────────────────────────────────────────────────

export async function fetchEvents(): Promise<Event[]> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchEvents: ${error.message}`);

  return (data ?? []).map((r) => eventFromRow(r));
}

export async function fetchEventFull(
  eventId: string
): Promise<Event | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      `
      *,
      floor_plans (*, lighting_zones (*)),
      timeline_items (*),
      schedule_items (*),
      vendors (*, vendor_payments (*)),
      guests (*),
      questionnaire_assignments (*),
      invoices (*, invoice_line_items (*)),
      expenses (*),
      budget_items (*),
      event_contracts (*),
      shared_files (*),
      mood_board_images (*),
      messages (*),
      discovered_vendors (*)
    `
    )
    .eq("id", eventId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(`fetchEventFull: ${error.message}`);
  }

  return eventFromRow(data);
}

export async function createEvent(
  data: Omit<Event, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<Event> {
  const supabase = createClient();

  // Server-side event limit enforcement
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = (profile?.plan as PlanType) || "trial";
  const maxEvents = MAX_EVENTS[plan] ?? 0;

  const { count: activeCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("planner_id", userId)
    .is("archived_at", null);

  if ((activeCount ?? 0) >= maxEvents) {
    throw new Error("Event limit reached for your current plan.");
  }

  const { data: created, error } = await supabase
    .from("events")
    .insert(eventToRow(data, userId))
    .select()
    .single();

  if (error) throw new Error(`createEvent: ${error.message}`);

  // Create 4 default floor plans
  const defaultPlans = [
    { id: "ceremony", name: "Ceremony" },
    { id: "cocktail", name: "Cocktail Hour" },
    { id: "reception", name: "Reception" },
    { id: "dancefloor", name: "Dance Floor" },
  ];

  const floorPlanRows = defaultPlans.map((fp, i) => ({
    event_id: created.id,
    name: fp.name,
    json: null,
    sort_order: i,
  }));

  const { data: insertedFps, error: fpError } = await supabase
    .from("floor_plans")
    .insert(floorPlanRows)
    .select();

  if (fpError) throw new Error(`createEvent (floor_plans): ${fpError.message}`);

  return eventFromRow({
    ...created,
    floor_plans: (insertedFps || []).map((fp: any) => ({
      id: fp.id,
      name: fp.name,
      json: null,
      lighting_zones: [],
    })),
  });
}

export async function updateEventFields(
  eventId: string,
  fields: Partial<Event>
): Promise<void> {
  const supabase = createClient();
  const row = eventFieldsToRow(fields);

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from("events")
    .update(row)
    .eq("id", eventId);

  if (error) throw new Error(`updateEventFields: ${error.message}`);
}

export async function deleteEvent(eventId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId);

  if (error) throw new Error(`deleteEvent: ${error.message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-entity "replace all" functions
// ────────────────────────────────────────────────────────────────────────────

export async function replaceGuests(
  eventId: string,
  guests: Guest[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("guests")
    .delete()
    .eq("event_id", eventId);
  if (delError) throw new Error(`replaceGuests (delete): ${delError.message}`);

  if (guests.length > 0) {
    const { error: insError } = await supabase
      .from("guests")
      .insert(guests.map((g) => guestToRow(g, eventId)));
    if (insError)
      throw new Error(`replaceGuests (insert): ${insError.message}`);
  }
}

export async function replaceVendors(
  eventId: string,
  vendors: Vendor[]
): Promise<void> {
  const supabase = createClient();

  // Delete existing vendors (vendor_payments cascade)
  const { error: delError } = await supabase
    .from("vendors")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(`replaceVendors (delete): ${delError.message}`);

  if (vendors.length > 0) {
    // Insert vendors
    const { error: insError } = await supabase
      .from("vendors")
      .insert(vendors.map((v) => vendorToRow(v, eventId)));
    if (insError)
      throw new Error(`replaceVendors (insert vendors): ${insError.message}`);

    // Collect and insert all payments
    const allPayments = vendors.flatMap((v) =>
      v.payments.map((p) => vendorPaymentToRow(p, v.id))
    );
    if (allPayments.length > 0) {
      const { error: payError } = await supabase
        .from("vendor_payments")
        .insert(allPayments);
      if (payError)
        throw new Error(
          `replaceVendors (insert payments): ${payError.message}`
        );
    }
  }
}

export async function replaceTimeline(
  eventId: string,
  items: TimelineItem[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("timeline_items")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(`replaceTimeline (delete): ${delError.message}`);

  if (items.length > 0) {
    const { error: insError } = await supabase
      .from("timeline_items")
      .insert(items.map((t) => timelineItemToRow(t, eventId)));
    if (insError)
      throw new Error(`replaceTimeline (insert): ${insError.message}`);
  }
}

export async function replaceSchedule(
  eventId: string,
  items: ScheduleItem[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("schedule_items")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(`replaceSchedule (delete): ${delError.message}`);

  if (items.length > 0) {
    const { error: insError } = await supabase
      .from("schedule_items")
      .insert(items.map((s) => scheduleItemToRow(s, eventId)));
    if (insError)
      throw new Error(`replaceSchedule (insert): ${insError.message}`);
  }
}

export async function replaceFloorPlans(
  eventId: string,
  plans: FloorPlan[]
): Promise<void> {
  const supabase = createClient();

  // Delete existing floor plans (lighting_zones cascade)
  const { error: delError } = await supabase
    .from("floor_plans")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(`replaceFloorPlans (delete): ${delError.message}`);

  if (plans.length > 0) {
    // Insert floor plans
    const { error: insError } = await supabase
      .from("floor_plans")
      .insert(plans.map((fp, i) => floorPlanToRow(fp, eventId, i)));
    if (insError)
      throw new Error(
        `replaceFloorPlans (insert plans): ${insError.message}`
      );

    // Collect and insert all lighting zones
    const allZones = plans.flatMap((fp) =>
      fp.lightingZones.map((lz) => lightingZoneToRow(lz, fp.id))
    );
    if (allZones.length > 0) {
      const { error: lzError } = await supabase
        .from("lighting_zones")
        .insert(allZones);
      if (lzError)
        throw new Error(
          `replaceFloorPlans (insert zones): ${lzError.message}`
        );
    }
  }
}

export async function replaceExpenses(
  eventId: string,
  expenses: Expense[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("expenses")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(`replaceExpenses (delete): ${delError.message}`);

  if (expenses.length > 0) {
    const { error: insError } = await supabase
      .from("expenses")
      .insert(expenses.map((e) => expenseToRow(e, eventId)));
    if (insError)
      throw new Error(`replaceExpenses (insert): ${insError.message}`);
  }
}

export async function replaceBudget(
  eventId: string,
  items: BudgetItem[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("budget_items")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(`replaceBudget (delete): ${delError.message}`);

  if (items.length > 0) {
    const { error: insError } = await supabase
      .from("budget_items")
      .insert(items.map((b) => budgetItemToRow(b, eventId)));
    if (insError)
      throw new Error(`replaceBudget (insert): ${insError.message}`);
  }
}

export async function replaceInvoices(
  eventId: string,
  invoices: Invoice[]
): Promise<void> {
  const supabase = createClient();

  // Delete existing invoices (invoice_line_items cascade)
  const { error: delError } = await supabase
    .from("invoices")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(`replaceInvoices (delete): ${delError.message}`);

  if (invoices.length > 0) {
    // Insert invoices
    const { error: insError } = await supabase
      .from("invoices")
      .insert(invoices.map((inv) => invoiceToRow(inv, eventId)));
    if (insError)
      throw new Error(
        `replaceInvoices (insert invoices): ${insError.message}`
      );

    // Collect and insert all line items
    const allLineItems = invoices.flatMap((inv) =>
      inv.lineItems.map((li) => invoiceLineItemToRow(li, inv.id))
    );
    if (allLineItems.length > 0) {
      const { error: liError } = await supabase
        .from("invoice_line_items")
        .insert(allLineItems);
      if (liError)
        throw new Error(
          `replaceInvoices (insert line items): ${liError.message}`
        );
    }
  }
}

export async function replaceContracts(
  eventId: string,
  contracts: EventContract[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("event_contracts")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(`replaceContracts (delete): ${delError.message}`);

  if (contracts.length > 0) {
    const { error: insError } = await supabase
      .from("event_contracts")
      .insert(contracts.map((c) => eventContractToRow(c, eventId)));
    if (insError)
      throw new Error(`replaceContracts (insert): ${insError.message}`);
  }
}

export async function replaceFiles(
  eventId: string,
  files: SharedFile[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("shared_files")
    .delete()
    .eq("event_id", eventId);
  if (delError) throw new Error(`replaceFiles (delete): ${delError.message}`);

  if (files.length > 0) {
    const { error: insError } = await supabase
      .from("shared_files")
      .insert(files.map((f) => sharedFileToRow(f, eventId)));
    if (insError)
      throw new Error(`replaceFiles (insert): ${insError.message}`);
  }
}

export async function replaceMoodBoard(
  eventId: string,
  images: MoodBoardImage[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("mood_board_images")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(`replaceMoodBoard (delete): ${delError.message}`);

  if (images.length > 0) {
    const { error: insError } = await supabase
      .from("mood_board_images")
      .insert(images.map((img) => moodBoardImageToRow(img, eventId)));
    if (insError)
      throw new Error(`replaceMoodBoard (insert): ${insError.message}`);
  }
}

export async function replaceMessages(
  eventId: string,
  messages: Message[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("messages")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(`replaceMessages (delete): ${delError.message}`);

  if (messages.length > 0) {
    const { error: insError } = await supabase
      .from("messages")
      .insert(messages.map((m) => messageToRow(m, eventId)));
    if (insError)
      throw new Error(`replaceMessages (insert): ${insError.message}`);
  }
}

export async function replaceDiscoveredVendors(
  eventId: string,
  vendors: DiscoveredVendor[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("discovered_vendors")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(
      `replaceDiscoveredVendors (delete): ${delError.message}`
    );

  if (vendors.length > 0) {
    const { error: insError } = await supabase
      .from("discovered_vendors")
      .insert(vendors.map((dv) => discoveredVendorToRow(dv, eventId)));
    if (insError)
      throw new Error(
        `replaceDiscoveredVendors (insert): ${insError.message}`
      );
  }
}

export async function replaceQuestionnaireAssignments(
  eventId: string,
  assignments: QuestionnaireAssignment[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("questionnaire_assignments")
    .delete()
    .eq("event_id", eventId);
  if (delError)
    throw new Error(
      `replaceQuestionnaireAssignments (delete): ${delError.message}`
    );

  if (assignments.length > 0) {
    const { error: insError } = await supabase
      .from("questionnaire_assignments")
      .insert(
        assignments.map((qa) =>
          questionnaireAssignmentToRow(qa, eventId)
        )
      );
    if (insError)
      throw new Error(
        `replaceQuestionnaireAssignments (insert): ${insError.message}`
      );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Profiles
// ────────────────────────────────────────────────────────────────────────────

export async function fetchProfile(): Promise<PlannerProfile> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    // If no profile exists yet, return defaults
    if (error.code === "PGRST116") {
      return {
        businessName: "",
        plannerName: "",
        email: "",
        phone: "",
        website: "",
        logoUrl: "",
        brandColor: "#e88b8b",
        tagline: "",
        plan: "trial",
        trialEndsAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePaymentId: null,
      };
    }
    throw new Error(`fetchProfile: ${error.message}`);
  }

  return profileFromRow(data);
}

export async function updateProfile(
  partial: Partial<PlannerProfile>
): Promise<void> {
  const supabase = createClient();
  const userId = await getUserId();
  const row = safeProfileToRow(partial);

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...row })
    .eq("id", userId);

  if (error) throw new Error(`updateProfile: ${error.message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Questionnaires
// ────────────────────────────────────────────────────────────────────────────

export async function fetchQuestionnaires(): Promise<Questionnaire[]> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("questionnaires")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchQuestionnaires: ${error.message}`);

  return (data ?? []).map(questionnaireFromRow);
}

export async function fetchQuestionnaire(
  id: string
): Promise<Questionnaire | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("questionnaires")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`fetchQuestionnaire: ${error.message}`);
  }

  return questionnaireFromRow(data);
}

export async function createQuestionnaire(
  data: Omit<Questionnaire, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<Questionnaire> {
  const supabase = createClient();

  const { data: created, error } = await supabase
    .from("questionnaires")
    .insert(questionnaireToRow(data, userId))
    .select()
    .single();

  if (error) throw new Error(`createQuestionnaire: ${error.message}`);

  return questionnaireFromRow(created);
}

export async function updateQuestionnaire(
  id: string,
  partial: Partial<Questionnaire>
): Promise<void> {
  const supabase = createClient();
  const row = questionnaireFieldsToRow(partial);

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from("questionnaires")
    .update(row)
    .eq("id", id);

  if (error) throw new Error(`updateQuestionnaire: ${error.message}`);
}

export async function deleteQuestionnaire(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("questionnaires")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`deleteQuestionnaire: ${error.message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Inquiries
// ────────────────────────────────────────────────────────────────────────────

export async function fetchInquiries(): Promise<Inquiry[]> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchInquiries: ${error.message}`);

  return (data ?? []).map(inquiryFromRow);
}

export async function createInquiry(
  data: Omit<Inquiry, "id" | "createdAt" | "updatedAt">,
  userId: string
): Promise<Inquiry> {
  const supabase = createClient();

  const { data: created, error } = await supabase
    .from("inquiries")
    .insert(inquiryToRow(data, userId))
    .select()
    .single();

  if (error) throw new Error(`createInquiry: ${error.message}`);

  return inquiryFromRow(created);
}

export async function updateInquiry(
  id: string,
  partial: Partial<Inquiry>
): Promise<void> {
  const supabase = createClient();
  const row = inquiryFieldsToRow(partial);

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from("inquiries")
    .update(row)
    .eq("id", id);

  if (error) throw new Error(`updateInquiry: ${error.message}`);
}

export async function deleteInquiry(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("inquiries")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`deleteInquiry: ${error.message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Preferred Vendors
// ────────────────────────────────────────────────────────────────────────────

export async function fetchPreferredVendors(): Promise<PreferredVendor[]> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("preferred_vendors")
    .select("*")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (error) throw new Error(`fetchPreferredVendors: ${error.message}`);

  return (data ?? []).map(preferredVendorFromRow);
}

export async function createPreferredVendor(
  vendor: PreferredVendor,
  userId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("preferred_vendors")
    .insert(preferredVendorToRow(vendor, userId));

  if (error) throw new Error(`addPreferredVendor: ${error.message}`);
}

export async function updatePreferredVendor(
  id: string,
  partial: Partial<PreferredVendor>
): Promise<void> {
  const supabase = createClient();
  const row = preferredVendorFieldsToRow(partial);

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from("preferred_vendors")
    .update(row)
    .eq("id", id);

  if (error) throw new Error(`updatePreferredVendor: ${error.message}`);
}

export async function deletePreferredVendor(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("preferred_vendors")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`removePreferredVendor: ${error.message}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Contract Templates
// ────────────────────────────────────────────────────────────────────────────

export async function fetchContractTemplates(): Promise<ContractTemplate[]> {
  const supabase = createClient();
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`fetchContractTemplates: ${error.message}`);

  return (data ?? []).map(contractTemplateFromRow);
}

export async function createContractTemplate(
  template: ContractTemplate,
  userId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("contract_templates")
    .insert(contractTemplateToRow(template, userId));

  if (error) throw new Error(`addContractTemplate: ${error.message}`);
}

export async function updateContractTemplate(
  id: string,
  partial: Partial<ContractTemplate>
): Promise<void> {
  const supabase = createClient();
  const row = contractTemplateFieldsToRow(partial);

  if (Object.keys(row).length === 0) return;

  const { error } = await supabase
    .from("contract_templates")
    .update(row)
    .eq("id", id);

  if (error) throw new Error(`updateContractTemplate: ${error.message}`);
}

export async function deleteContractTemplate(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("contract_templates")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`removeContractTemplate: ${error.message}`);
}

// ════════════════════════════════════════════════════════════════════════════
// Client Portal (public, uses RPC to bypass RLS)
// ════════════════════════════════════════════════════════════════════════════

export async function fetchClientEvent(shareToken: string): Promise<Event | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_client_event', { p_share_token: shareToken });
  if (error || !data) return null;
  return clientEventFromRow(data);
}

// Map the RPC result (snake_case JSON) to Event type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clientEventFromRow(r: any): Event {
  return {
    id: r.id,
    name: r.name,
    date: r.date,
    venue: r.venue,
    clientName: r.client_name,
    clientEmail: r.client_email,
    status: r.status,
    floorPlanJSON: null,
    colorPalette: r.color_palette ?? [],
    archivedAt: r.archived_at ?? null,
    shareToken: r.share_token ?? '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    floorPlans: (r.floor_plans ?? []).map((fp: any) => ({
      id: fp.id,
      name: fp.name,
      json: fp.json ?? null,
      lightingZones: (fp.lighting_zones ?? []).map((lz: any) => ({
        id: lz.id, name: lz.name, type: lz.type, color: lz.color,
        intensity: lz.intensity, x: lz.x, y: lz.y, size: lz.size, notes: lz.notes,
      })),
    })),
    timeline: (r.timeline_items ?? []).map((t: any) => ({
      id: t.id, title: t.title, dueDate: t.due_date ?? null,
      completed: t.completed ?? false, order: t.sort_order ?? 0,
    })),
    schedule: (r.schedule_items ?? []).map((s: any) => ({
      id: s.id, time: s.time, title: s.title, notes: s.notes,
    })),
    vendors: (r.vendors ?? []).map((v: any) => ({
      id: v.id, name: v.name, category: v.category, contact: v.contact,
      phone: v.phone, email: v.email, notes: v.notes,
      mealChoice: v.meal_choice ?? '', contractTotal: v.contract_total ?? 0,
      payments: (v.vendor_payments ?? []).map((p: any) => ({
        id: p.id, description: p.description, amount: p.amount,
        dueDate: p.due_date, paid: p.paid, paidDate: p.paid_date,
      })),
    })),
    guests: (r.guests ?? []).map((g: any) => ({
      id: g.id, name: g.name, email: g.email, rsvp: g.rsvp,
      mealChoice: g.meal_choice ?? '', tableAssignment: g.table_assignment ?? '',
      plusOne: g.plus_one ?? false, plusOneName: g.plus_one_name ?? '',
      dietaryNotes: g.dietary_notes ?? '',
    })),
    questionnaires: (r.questionnaire_assignments ?? []).map((qa: any) => ({
      questionnaireId: qa.questionnaire_id, questionnaireName: qa.questionnaire_name,
      answers: qa.answers ?? {}, completedAt: qa.completed_at,
    })),
    invoices: (r.invoices ?? []).map((i: any) => ({
      id: i.id, number: i.number, status: i.status, notes: i.notes,
      dueDate: i.due_date, createdAt: i.created_at,
      lineItems: (i.invoice_line_items ?? []).map((li: any) => ({
        id: li.id, description: li.description, quantity: li.quantity,
        unitPrice: li.unit_price,
      })),
    })),
    expenses: (r.expenses ?? []).map((ex: any) => ({
      id: ex.id, description: ex.description, amount: ex.amount,
      category: ex.category, date: ex.date, notes: ex.notes,
    })),
    budget: (r.budget_items ?? []).map((b: any) => ({
      id: b.id, category: b.category, allocated: b.allocated, notes: b.notes,
    })),
    contracts: (r.event_contracts ?? []).map((c: any) => ({
      id: c.id, templateId: c.template_id, name: c.name, type: c.type,
      vendorId: c.vendor_id, vendorName: c.vendor_name,
      fileData: c.file_data, fileName: c.file_name, fileSize: c.file_size,
      signedFileData: c.signed_file_data, signedFileName: c.signed_file_name,
      signedAt: c.signed_at, assignedAt: c.assigned_at,
      plannerSignature: c.planner_signature, plannerSignedAt: c.planner_signed_at,
      plannerSignedName: c.planner_signed_name,
      clientSignature: c.client_signature, clientSignedAt: c.client_signed_at,
      clientSignedName: c.client_signed_name,
      storagePath: c.storage_path ?? null, storageSignedPath: c.storage_signed_path ?? null,
      storagePlannerSig: c.storage_planner_sig ?? null, storageClientSig: c.storage_client_sig ?? null,
    })),
    files: (r.shared_files ?? []).map((f: any) => ({
      id: f.id, name: f.name, type: f.type, url: f.storage_path || f.url,
      storagePath: f.storage_path ?? null, uploadedAt: f.uploaded_at,
    })),
    moodBoard: (r.mood_board_images ?? []).map((m: any) => ({
      id: m.id, url: m.url, thumb: m.thumb, caption: m.caption, addedAt: m.added_at,
      storagePath: m.storage_path ?? null, storageThumb: m.storage_thumb ?? null,
    })),
    messages: (r.messages ?? []).map((msg: any) => ({
      id: msg.id, sender: msg.sender, senderName: msg.sender_name,
      text: msg.text, createdAt: msg.created_at,
    })),
    discoveredVendors: (r.discovered_vendors ?? []).map((dv: any) => ({
      id: dv.id, name: dv.name, category: dv.category,
      rating: dv.rating, reviewCount: dv.review_count,
      phone: dv.phone, website: dv.website, address: dv.address,
      priceLevel: dv.price_level, googleMapsUrl: dv.google_maps_url,
      sharedAt: dv.shared_at,
    })),
  };
}

// Client portal update functions - each calls the corresponding RPC
export async function clientUpdateGuests(shareToken: string, guests: Guest[]): Promise<void> {
  const supabase = createClient();
  const rows = guests.map(g => ({
    id: g.id, name: g.name, email: g.email, rsvp: g.rsvp,
    meal_choice: g.mealChoice, table_assignment: g.tableAssignment,
    plus_one: g.plusOne, plus_one_name: g.plusOneName, dietary_notes: g.dietaryNotes,
  }));
  const { error } = await supabase.rpc('client_update_guests', { p_share_token: shareToken, p_guests: rows });
  if (error) throw new Error(`clientUpdateGuests: ${error.message}`);
}

export async function clientUpdateMessages(shareToken: string, messages: Message[]): Promise<void> {
  const supabase = createClient();
  const rows = messages.map(m => ({
    id: m.id, sender: m.sender, sender_name: m.senderName, text: m.text, created_at: m.createdAt,
  }));
  const { error } = await supabase.rpc('client_update_messages', { p_share_token: shareToken, p_messages: rows });
  if (error) throw new Error(`clientUpdateMessages: ${error.message}`);
}

export async function clientUpdateQuestionnaireAssignments(shareToken: string, assignments: QuestionnaireAssignment[]): Promise<void> {
  const supabase = createClient();
  const rows = assignments.map(a => ({
    id: crypto.randomUUID(),
    questionnaire_id: a.questionnaireId,
    questionnaire_name: a.questionnaireName,
    answers: a.answers,
    completed_at: a.completedAt,
  }));
  const { error } = await supabase.rpc('client_update_questionnaire_assignments', { p_share_token: shareToken, p_assignments: rows });
  if (error) throw new Error(`clientUpdateQuestionnaireAssignments: ${error.message}`);
}

export async function clientUpdateContracts(shareToken: string, contracts: EventContract[]): Promise<void> {
  const supabase = createClient();
  const rows = contracts.map(c => ({
    id: c.id, template_id: c.templateId, name: c.name, type: c.type,
    vendor_id: c.vendorId, vendor_name: c.vendorName,
    file_data: c.fileData, file_name: c.fileName, file_size: c.fileSize,
    signed_file_data: c.signedFileData, signed_file_name: c.signedFileName,
    signed_at: c.signedAt, assigned_at: c.assignedAt,
    planner_signature: c.plannerSignature, planner_signed_at: c.plannerSignedAt,
    planner_signed_name: c.plannerSignedName,
    client_signature: c.clientSignature, client_signed_at: c.clientSignedAt,
    client_signed_name: c.clientSignedName,
    storage_path: c.storagePath ?? null, storage_signed_path: c.storageSignedPath ?? null,
    storage_planner_sig: c.storagePlannerSig ?? null, storage_client_sig: c.storageClientSig ?? null,
  }));
  const { error } = await supabase.rpc('client_update_contracts', { p_share_token: shareToken, p_contracts: rows });
  if (error) throw new Error(`clientUpdateContracts: ${error.message}`);
}

export async function clientUpdateFiles(shareToken: string, files: SharedFile[]): Promise<void> {
  const supabase = createClient();
  const rows = files.map(f => ({
    id: f.id, name: f.name, type: f.type, url: f.url,
    storage_path: f.storagePath ?? null, uploaded_at: f.uploadedAt,
  }));
  const { error } = await supabase.rpc('client_update_files', { p_share_token: shareToken, p_files: rows });
  if (error) throw new Error(`clientUpdateFiles: ${error.message}`);
}

export async function clientUpdateMoodBoard(shareToken: string, images: MoodBoardImage[]): Promise<void> {
  const supabase = createClient();
  const rows = images.map(m => ({
    id: m.id, url: m.url, thumb: m.thumb, caption: m.caption, added_at: m.addedAt,
    storage_path: m.storagePath ?? null, storage_thumb: m.storageThumb ?? null,
  }));
  const { error } = await supabase.rpc('client_update_mood_board', { p_share_token: shareToken, p_images: rows });
  if (error) throw new Error(`clientUpdateMoodBoard: ${error.message}`);
}

export async function clientUpdateTimeline(shareToken: string, items: TimelineItem[]): Promise<void> {
  const supabase = createClient();
  const rows = items.map(t => ({
    id: t.id, title: t.title, due_date: t.dueDate, completed: t.completed, sort_order: t.order,
  }));
  const { error } = await supabase.rpc('client_update_timeline', { p_share_token: shareToken, p_items: rows });
  if (error) throw new Error(`clientUpdateTimeline: ${error.message}`);
}

export async function clientUpdateSchedule(shareToken: string, items: ScheduleItem[]): Promise<void> {
  const supabase = createClient();
  const rows = items.map(s => ({
    id: s.id, time: s.time, title: s.title, notes: s.notes,
  }));
  const { error } = await supabase.rpc('client_update_schedule', { p_share_token: shareToken, p_items: rows });
  if (error) throw new Error(`clientUpdateSchedule: ${error.message}`);
}

export async function clientUpdateEventFields(shareToken: string, fields: Partial<Event>): Promise<void> {
  const supabase = createClient();
  const payload: any = {};
  if (fields.colorPalette !== undefined) payload.color_palette = fields.colorPalette;
  const { error } = await supabase.rpc('client_update_event_fields', { p_share_token: shareToken, p_fields: payload });
  if (error) throw new Error(`clientUpdateEventFields: ${error.message}`);
}

export async function clientUpdateBudget(shareToken: string, items: BudgetItem[]): Promise<void> {
  const supabase = createClient();
  const rows = items.map(b => ({
    id: b.id, category: b.category, allocated: b.allocated, notes: b.notes,
  }));
  const { error } = await supabase.rpc('client_update_budget', { p_share_token: shareToken, p_items: rows });
  if (error) throw new Error(`clientUpdateBudget: ${error.message}`);
}

export async function clientUpdateDiscoveredVendors(shareToken: string, vendors: DiscoveredVendor[]): Promise<void> {
  const supabase = createClient();
  const rows = vendors.map(dv => ({
    id: dv.id, name: dv.name, category: dv.category, rating: dv.rating,
    review_count: dv.reviewCount, phone: dv.phone, website: dv.website,
    address: dv.address, price_level: dv.priceLevel, google_maps_url: dv.googleMapsUrl,
    shared_at: dv.sharedAt,
  }));
  const { error } = await supabase.rpc('client_update_discovered_vendors', { p_share_token: shareToken, p_vendors: rows });
  if (error) throw new Error(`clientUpdateDiscoveredVendors: ${error.message}`);
}
