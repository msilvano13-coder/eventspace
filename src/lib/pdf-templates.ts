import { jsPDF } from "jspdf";
import { Event, VENDOR_TO_BUDGET_CATEGORY } from "./types";

// ── Template Definitions ──

export interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  sections: SectionKey[];
  style: TemplateStyle;
}

type SectionKey =
  | "event-details"
  | "client"
  | "guests"
  | "vendors"
  | "budget"
  | "expenses"
  | "todos"
  | "schedule"
  | "colors";

interface TemplateStyle {
  primary: [number, number, number];
  secondary: [number, number, number];
  text: [number, number, number];
  muted: [number, number, number];
  divider: [number, number, number];
  titleSize: number;
  headingSize: number;
  bodySize: number;
  accentLine: "full" | "short" | "dot" | "none";
  headerLayout: "left" | "center";
}

// ── Color Palettes ──

const ROSE: [number, number, number] = [244, 114, 114];
const NAVY: [number, number, number] = [30, 41, 59];
const GOLD: [number, number, number] = [180, 144, 62];
const SAGE: [number, number, number] = [108, 140, 108];
const BLUSH: [number, number, number] = [210, 145, 145];
const SLATE: [number, number, number] = [71, 85, 105];
const CHARCOAL: [number, number, number] = [55, 55, 55];
const PLUM: [number, number, number] = [128, 80, 128];
const TEAL: [number, number, number] = [56, 132, 132];
const COPPER: [number, number, number] = [176, 111, 64];

const STONE_800: [number, number, number] = [41, 37, 36];
const STONE_500: [number, number, number] = [120, 113, 108];
const STONE_300: [number, number, number] = [214, 211, 209];
const STONE_200: [number, number, number] = [231, 229, 228];

// ── 10 Templates ──

export const PDF_TEMPLATES: PDFTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Clean and professional — great for any event",
    sections: ["event-details", "client", "guests", "vendors", "budget", "expenses", "todos", "schedule", "colors"],
    style: { primary: ROSE, secondary: STONE_800, text: STONE_800, muted: STONE_500, divider: STONE_300, titleSize: 24, headingSize: 13, bodySize: 10, accentLine: "short", headerLayout: "left" },
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Refined navy and gold for upscale events",
    sections: ["event-details", "client", "guests", "vendors", "budget", "expenses", "todos", "schedule", "colors"],
    style: { primary: NAVY, secondary: GOLD, text: NAVY, muted: SLATE, divider: STONE_200, titleSize: 26, headingSize: 14, bodySize: 10, accentLine: "full", headerLayout: "center" },
  },
  {
    id: "garden",
    name: "Garden Party",
    description: "Soft sage tones for outdoor and botanical events",
    sections: ["event-details", "client", "guests", "vendors", "budget", "todos", "schedule", "colors"],
    style: { primary: SAGE, secondary: STONE_800, text: STONE_800, muted: STONE_500, divider: [200, 215, 200], titleSize: 24, headingSize: 13, bodySize: 10, accentLine: "dot", headerLayout: "left" },
  },
  {
    id: "romantic",
    name: "Romantic",
    description: "Warm blush palette for weddings and intimate affairs",
    sections: ["event-details", "client", "guests", "vendors", "budget", "expenses", "todos", "schedule", "colors"],
    style: { primary: BLUSH, secondary: STONE_800, text: STONE_800, muted: STONE_500, divider: [230, 210, 210], titleSize: 24, headingSize: 13, bodySize: 10, accentLine: "short", headerLayout: "center" },
  },
  {
    id: "modern",
    name: "Modern Minimal",
    description: "Sleek charcoal design with clean lines",
    sections: ["event-details", "client", "guests", "vendors", "budget", "expenses", "todos", "schedule"],
    style: { primary: CHARCOAL, secondary: CHARCOAL, text: CHARCOAL, muted: SLATE, divider: STONE_200, titleSize: 22, headingSize: 12, bodySize: 10, accentLine: "full", headerLayout: "left" },
  },
  {
    id: "luxe",
    name: "Luxe Gold",
    description: "Bold gold accents for premium galas and black-tie events",
    sections: ["event-details", "client", "guests", "vendors", "budget", "expenses", "todos", "schedule", "colors"],
    style: { primary: GOLD, secondary: STONE_800, text: STONE_800, muted: STONE_500, divider: [220, 200, 160], titleSize: 26, headingSize: 14, bodySize: 10, accentLine: "short", headerLayout: "center" },
  },
  {
    id: "plum",
    name: "Plum",
    description: "Rich purple tones for dramatic, elegant events",
    sections: ["event-details", "client", "guests", "vendors", "budget", "expenses", "todos", "schedule", "colors"],
    style: { primary: PLUM, secondary: STONE_800, text: STONE_800, muted: STONE_500, divider: [210, 195, 210], titleSize: 24, headingSize: 13, bodySize: 10, accentLine: "dot", headerLayout: "left" },
  },
  {
    id: "coastal",
    name: "Coastal",
    description: "Calming teal for beach and waterfront events",
    sections: ["event-details", "client", "guests", "vendors", "budget", "todos", "schedule", "colors"],
    style: { primary: TEAL, secondary: STONE_800, text: STONE_800, muted: STONE_500, divider: [190, 215, 215], titleSize: 24, headingSize: 13, bodySize: 10, accentLine: "short", headerLayout: "left" },
  },
  {
    id: "rustic",
    name: "Rustic Copper",
    description: "Warm copper tones for barn and countryside settings",
    sections: ["event-details", "client", "guests", "vendors", "budget", "expenses", "todos", "schedule", "colors"],
    style: { primary: COPPER, secondary: STONE_800, text: STONE_800, muted: STONE_500, divider: [220, 200, 180], titleSize: 24, headingSize: 13, bodySize: 10, accentLine: "dot", headerLayout: "left" },
  },
  {
    id: "client-summary",
    name: "Client Summary",
    description: "Condensed overview to share with clients — no budget or expenses",
    sections: ["event-details", "guests", "vendors", "schedule", "colors"],
    style: { primary: ROSE, secondary: STONE_800, text: STONE_800, muted: STONE_500, divider: STONE_300, titleSize: 24, headingSize: 13, bodySize: 10, accentLine: "short", headerLayout: "left" },
  },
];

// ── Renderer ──

export function exportEventPDFWithTemplate(event: Event, plannerName: string | undefined, template: PDFTemplate) {
  const s = template.style;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const LINE_HEIGHT = 6;
  const SECTION_GAP = 10;
  const LABEL_COL = margin;
  const VALUE_COL = margin + 35;

  function checkPage(needed: number) {
    if (y + needed > pageH - 20) { doc.addPage(); y = margin; }
  }

  function heading(text: string) {
    checkPage(18);
    y += 4;
    doc.setFontSize(s.headingSize);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...s.text);
    if (s.headerLayout === "center") {
      doc.text(text, pageW / 2, y, { align: "center" });
    } else {
      doc.text(text, margin, y);
    }
    y += 3;

    doc.setDrawColor(...s.primary);
    doc.setLineWidth(0.5);
    if (s.accentLine === "full") {
      doc.line(margin, y, margin + contentW, y);
    } else if (s.accentLine === "short") {
      const startX = s.headerLayout === "center" ? pageW / 2 - 20 : margin;
      doc.line(startX, y, startX + 40, y);
    } else if (s.accentLine === "dot") {
      const startX = s.headerLayout === "center" ? pageW / 2 - 1.5 : margin + 1;
      doc.circle(startX, y, 1, "F");
      doc.circle(startX + 4, y, 1, "F");
      doc.circle(startX + 8, y, 1, "F");
    }
    y += 8;
  }

  function labelValue(l: string, v: string) {
    checkPage(LINE_HEIGHT + 2);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...s.muted);
    doc.text(l, LABEL_COL, y);

    doc.setFontSize(s.bodySize);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...s.text);

    const maxValW = pageW - margin - VALUE_COL;
    const lines = doc.splitTextToSize(v || "—", maxValW);
    doc.text(lines, VALUE_COL, y);
    y += Math.max(LINE_HEIGHT, lines.length * 4.5);
  }

  function smallText(text: string, x?: number) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...s.muted);
    const maxW = pageW - margin - (x ?? margin);
    const lines = doc.splitTextToSize(text, maxW);
    doc.text(lines, x ?? margin, y);
    y += lines.length * 4;
  }

  function fmtCurrency(n: number) { return `$${n.toLocaleString()}`; }

  // ── Header ──
  doc.setFontSize(s.titleSize);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...s.primary);
  if (s.headerLayout === "center") {
    const titleLines = doc.splitTextToSize(event.name, contentW);
    doc.text(titleLines, pageW / 2, y, { align: "center" });
    y += titleLines.length * 10 + 2;
  } else {
    const titleLines = doc.splitTextToSize(event.name, contentW);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 10 + 2;
  }

  if (plannerName) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...s.muted);
    const txt = `Prepared by ${plannerName}`;
    if (s.headerLayout === "center") {
      doc.text(txt, pageW / 2, y, { align: "center" });
    } else {
      doc.text(txt, margin, y);
    }
    y += 6;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...s.muted);
  const dateStr = `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  if (s.headerLayout === "center") {
    doc.text(dateStr, pageW / 2, y, { align: "center" });
  } else {
    doc.text(dateStr, margin, y);
  }
  y += SECTION_GAP + 2;

  // Decorative top line for center-aligned templates
  if (s.headerLayout === "center") {
    doc.setDrawColor(...s.primary);
    doc.setLineWidth(0.3);
    doc.line(margin + 30, y - 2, pageW - margin - 30, y - 2);
    y += 4;
  }

  // ── Sections ──
  for (const section of template.sections) {
    switch (section) {
      case "event-details": {
        heading("Event Details");
        const eventDate = new Date(event.date).toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric", year: "numeric",
        });
        labelValue("Date", eventDate);
        labelValue("Venue", event.venue || "TBD");
        labelValue("Status", event.status.charAt(0).toUpperCase() + event.status.slice(1));
        y += SECTION_GAP - LINE_HEIGHT;
        break;
      }

      case "client": {
        heading("Client");
        labelValue("Name", event.clientName);
        labelValue("Email", event.clientEmail);
        y += SECTION_GAP - LINE_HEIGHT;
        break;
      }

      case "guests": {
        const guests = event.guests ?? [];
        if (guests.length > 0) {
          heading("Guests");
          const accepted = guests.filter((g) => g.rsvp === "accepted").length;
          const declined = guests.filter((g) => g.rsvp === "declined").length;
          const pending = guests.filter((g) => g.rsvp === "pending").length;
          const plusOnes = guests.filter((g) => g.plusOne).length;

          labelValue("Total Invited", `${guests.length}`);
          labelValue("Accepted", `${accepted}`);
          labelValue("Declined", `${declined}`);
          labelValue("Pending", `${pending}`);
          labelValue("Plus Ones", `${plusOnes}`);
          labelValue("Est. Attendance", `${accepted + plusOnes}`);
          y += SECTION_GAP - LINE_HEIGHT;
        }
        break;
      }

      case "vendors": {
        const vendors = event.vendors ?? [];
        if (vendors.length > 0) {
          heading("Vendors");
          vendors.forEach((v, idx) => {
            checkPage(16);
            doc.setFontSize(s.bodySize);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...s.text);
            doc.text(v.name, margin, y);
            y += 5;

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...s.muted);
            doc.text(`${v.category}  ·  ${fmtCurrency(v.contractTotal)}`, margin + 2, y);
            y += 5;

            if (v.contact || v.email || v.phone) {
              const contact = [v.contact, v.email, v.phone].filter(Boolean).join("  ·  ");
              smallText(contact, margin + 2);
            }

            if (v.mealChoice) smallText(`Meal: ${v.mealChoice}`, margin + 2);

            if (idx < vendors.length - 1) {
              y += 2;
              doc.setDrawColor(...s.divider);
              doc.setLineWidth(0.15);
              doc.line(margin + 2, y, margin + contentW - 2, y);
              y += 4;
            }
          });

          y += 4;
          const totalContracts = vendors.reduce((sum, v) => sum + v.contractTotal, 0);
          const totalPaid = vendors.reduce(
            (sum, v) => sum + (v.payments ?? []).filter((p) => p.paid).reduce((ps, p) => ps + p.amount, 0), 0
          );
          checkPage(14);
          doc.setDrawColor(...s.text);
          doc.setLineWidth(0.3);
          doc.line(margin, y, margin + contentW, y);
          y += 6;
          labelValue("Total Contracts", fmtCurrency(totalContracts));
          labelValue("Total Paid", fmtCurrency(totalPaid));
          y += SECTION_GAP - LINE_HEIGHT;
        }
        break;
      }

      case "budget": {
        const budget = event.budget ?? [];
        const vendors = event.vendors ?? [];
        if (budget.length > 0) {
          heading("Budget");
          const totalAllocated = budget.reduce((sum, b) => sum + b.allocated, 0);

          checkPage(8);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...s.muted);
          doc.text("Category", margin, y);
          doc.text("Allocated", margin + 60, y);
          doc.text("Committed", margin + 90, y);
          y += 2;
          doc.setDrawColor(...s.divider);
          doc.setLineWidth(0.2);
          doc.line(margin, y, margin + contentW, y);
          y += 5;

          budget.forEach((b) => {
            checkPage(7);
            const matchingVendors = vendors.filter((v) => VENDOR_TO_BUDGET_CATEGORY[v.category] === b.category);
            const committed = matchingVendors.reduce((sum, v) => sum + v.contractTotal, 0);

            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...s.text);
            doc.text(b.category, margin, y);
            doc.text(fmtCurrency(b.allocated), margin + 60, y);
            doc.setTextColor(committed > b.allocated ? 220 : s.muted[0], committed > b.allocated ? 80 : s.muted[1], committed > b.allocated ? 80 : s.muted[2]);
            doc.text(fmtCurrency(committed), margin + 90, y);
            y += LINE_HEIGHT;
          });

          checkPage(10);
          y += 2;
          doc.setDrawColor(...s.text);
          doc.setLineWidth(0.3);
          doc.line(margin, y, margin + contentW, y);
          y += 6;
          labelValue("Total Budget", fmtCurrency(totalAllocated));
          y += SECTION_GAP - LINE_HEIGHT;
        }
        break;
      }

      case "expenses": {
        const expenses = event.expenses ?? [];
        if (expenses.length > 0) {
          heading("Expenses");
          const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

          expenses.forEach((e) => {
            checkPage(7);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...s.text);
            doc.text(e.description, margin, y);
            doc.text(fmtCurrency(e.amount), margin + 80, y);
            doc.setTextColor(...s.muted);
            doc.text(e.category, margin + 110, y);
            y += LINE_HEIGHT;
          });

          checkPage(10);
          y += 2;
          doc.setDrawColor(...s.text);
          doc.setLineWidth(0.3);
          doc.line(margin, y, margin + contentW, y);
          y += 6;
          labelValue("Total Expenses", fmtCurrency(totalExpenses));
          y += SECTION_GAP - LINE_HEIGHT;
        }
        break;
      }

      case "todos": {
        const todos = event.timeline ?? [];
        if (todos.length > 0) {
          heading("To-Do Checklist");
          const sorted = [...todos].sort((a, b) => a.order - b.order);
          sorted.forEach((t) => {
            checkPage(8);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");

            const check = t.completed ? "✓" : "○";
            doc.setTextColor(t.completed ? 34 : 168, t.completed ? 197 : 162, t.completed ? 94 : 158);
            doc.text(check, margin, y);

            doc.setTextColor(...s.text);
            const tLines = doc.splitTextToSize(t.title, contentW - 50);
            doc.text(tLines, margin + 7, y);

            if (t.dueDate) {
              doc.setTextColor(...s.muted);
              doc.setFontSize(8);
              doc.text(
                new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                margin + contentW - 20, y
              );
            }
            y += Math.max(LINE_HEIGHT, tLines.length * 4.5) + 1;
          });
          y += SECTION_GAP - LINE_HEIGHT;
        }
        break;
      }

      case "schedule": {
        const schedule = event.schedule ?? [];
        if (schedule.length > 0) {
          heading("Day-of Timeline");
          const sorted = [...schedule].sort((a, b) => a.time.localeCompare(b.time));
          sorted.forEach((item) => {
            checkPage(8);
            const [h, m] = item.time.split(":");
            const hour = parseInt(h);
            const ampm = hour >= 12 ? "PM" : "AM";
            const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
            const timeStr = `${h12}:${m} ${ampm}`;

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...s.primary);
            doc.text(timeStr, margin, y);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(...s.text);
            const tLines = doc.splitTextToSize(item.title, contentW - 30);
            doc.text(tLines, margin + 25, y);

            if (item.notes) {
              y += tLines.length * 4.5;
              doc.setFontSize(8);
              doc.setTextColor(...s.muted);
              const noteLines = doc.splitTextToSize(item.notes, contentW - 30);
              doc.text(noteLines, margin + 25, y);
              y += noteLines.length * 3.5 + 3;
            } else {
              y += Math.max(LINE_HEIGHT, tLines.length * 4.5) + 1;
            }
          });
          y += SECTION_GAP - LINE_HEIGHT;
        }
        break;
      }

      case "colors": {
        const colors = event.colorPalette ?? [];
        if (colors.length > 0) {
          heading("Color Palette");
          let cx = margin;
          colors.forEach((color) => {
            checkPage(18);
            if (cx + 16 > pageW - margin) { cx = margin; y += 18; }
            doc.setFillColor(color);
            doc.roundedRect(cx, y, 12, 12, 2, 2, "F");
            doc.setFontSize(6);
            doc.setTextColor(...s.muted);
            doc.text(color, cx, y + 15);
            cx += 18;
          });
          y += 22;
        }
        break;
      }
    }
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...s.divider);
    doc.text(
      `${event.name} — Event Summary — Page ${i} of ${pageCount}`,
      pageW / 2, pageH - 10, { align: "center" }
    );
  }

  doc.save(`${event.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-")}-Summary.pdf`);
}
