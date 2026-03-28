import { jsPDF } from "jspdf";
import { Event, VENDOR_TO_BUDGET_CATEGORY } from "./types";

const ROSE = [244, 114, 114] as const; // rose-400
const STONE_800 = [41, 37, 36] as const;
const STONE_500 = [120, 113, 108] as const;
const STONE_300 = [214, 211, 209] as const;

export function exportEventPDF(event: Event, plannerName?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const LINE_HEIGHT = 6;       // standard line spacing
  const SECTION_GAP = 10;      // gap between sections
  const LABEL_COL = margin;
  const VALUE_COL = margin + 35;

  function checkPage(needed: number) {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text: string) {
    checkPage(18);
    y += 4; // breathing room above heading
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...STONE_800);
    doc.text(text, margin, y);
    y += 3;
    doc.setDrawColor(...ROSE);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 40, y);
    y += 8; // breathing room below underline
  }

  function labelValue(l: string, v: string) {
    checkPage(LINE_HEIGHT + 2);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...STONE_500);
    doc.text(l, LABEL_COL, y);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...STONE_800);

    // Wrap long values
    const maxValW = pageW - margin - VALUE_COL;
    const lines = doc.splitTextToSize(v || "—", maxValW);
    doc.text(lines, VALUE_COL, y);
    y += Math.max(LINE_HEIGHT, lines.length * 4.5);
  }

  function smallText(text: string, x?: number) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...STONE_500);
    const maxW = pageW - margin - (x ?? margin);
    const lines = doc.splitTextToSize(text, maxW);
    doc.text(lines, x ?? margin, y);
    y += lines.length * 4;
  }

  // ── Header ──
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ROSE);
  const titleLines = doc.splitTextToSize(event.name, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 10 + 2;

  if (plannerName) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...STONE_500);
    doc.text(`Prepared by ${plannerName}`, margin, y);
    y += 6;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...STONE_500);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    margin,
    y
  );
  y += SECTION_GAP + 2;

  // ── Event Details ──
  heading("Event Details");

  const eventDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  labelValue("Date", eventDate);
  labelValue("Venue", event.venue || "TBD");
  labelValue("Status", event.status.charAt(0).toUpperCase() + event.status.slice(1));
  y += SECTION_GAP - LINE_HEIGHT;

  // ── Client Details ──
  heading("Client");
  labelValue("Name", event.clientName);
  labelValue("Email", event.clientEmail);
  y += SECTION_GAP - LINE_HEIGHT;

  // ── Guest Summary ──
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

  // ── Vendors ──
  const vendors = event.vendors ?? [];
  if (vendors.length > 0) {
    heading("Vendors");
    vendors.forEach((v, idx) => {
      checkPage(16);

      // Vendor name
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...STONE_800);
      doc.text(v.name, margin, y);
      y += 5;

      // Category & contract
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...STONE_500);
      doc.text(`${v.category}  ·  $${v.contractTotal.toLocaleString()}`, margin + 2, y);
      y += 5;

      // Contact info
      if (v.contact || v.email || v.phone) {
        const contact = [v.contact, v.email, v.phone].filter(Boolean).join("  ·  ");
        smallText(contact, margin + 2);
      }

      // Meal choice
      if (v.mealChoice) {
        smallText(`Meal: ${v.mealChoice}`, margin + 2);
      }

      // Separator between vendors (except last)
      if (idx < vendors.length - 1) {
        y += 2;
        doc.setDrawColor(...STONE_300);
        doc.setLineWidth(0.15);
        doc.line(margin + 2, y, margin + contentW - 2, y);
        y += 4;
      }
    });

    // Totals
    y += 4;
    const totalContracts = vendors.reduce((s, v) => s + v.contractTotal, 0);
    const totalPaid = vendors.reduce(
      (s, v) => s + (v.payments ?? []).filter((p) => p.paid).reduce((ps, p) => ps + p.amount, 0),
      0
    );
    checkPage(14);
    doc.setDrawColor(...STONE_800);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
    y += 6;
    labelValue("Total Contracts", `$${totalContracts.toLocaleString()}`);
    labelValue("Total Paid", `$${totalPaid.toLocaleString()}`);
    y += SECTION_GAP - LINE_HEIGHT;
  }

  // ── Budget ──
  const budget = event.budget ?? [];
  if (budget.length > 0) {
    heading("Budget");
    const totalAllocated = budget.reduce((s, b) => s + b.allocated, 0);

    // Table header
    checkPage(8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...STONE_500);
    doc.text("Category", margin, y);
    doc.text("Allocated", margin + 60, y);
    doc.text("Committed", margin + 90, y);
    y += 2;
    doc.setDrawColor(...STONE_300);
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + contentW, y);
    y += 5;

    budget.forEach((b) => {
      checkPage(7);
      const budgetCat = b.category;
      const matchingVendors = vendors.filter(
        (v) => VENDOR_TO_BUDGET_CATEGORY[v.category] === budgetCat
      );
      const committed = matchingVendors.reduce((s, v) => s + v.contractTotal, 0);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...STONE_800);
      doc.text(b.category, margin, y);
      doc.text(`$${b.allocated.toLocaleString()}`, margin + 60, y);
      doc.setTextColor(committed > b.allocated ? 220 : 120, committed > b.allocated ? 80 : 113, committed > b.allocated ? 80 : 108);
      doc.text(`$${committed.toLocaleString()}`, margin + 90, y);
      y += LINE_HEIGHT;
    });

    checkPage(10);
    y += 2;
    doc.setDrawColor(...STONE_800);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
    y += 6;
    labelValue("Total Budget", `$${totalAllocated.toLocaleString()}`);
    y += SECTION_GAP - LINE_HEIGHT;
  }

  // ── Expenses ──
  const expenses = event.expenses ?? [];
  if (expenses.length > 0) {
    heading("Expenses");
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    expenses.forEach((e) => {
      checkPage(7);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...STONE_800);
      doc.text(e.description, margin, y);
      doc.text(`$${e.amount.toLocaleString()}`, margin + 80, y);
      doc.setTextColor(...STONE_500);
      doc.text(e.category, margin + 110, y);
      y += LINE_HEIGHT;
    });

    checkPage(10);
    y += 2;
    doc.setDrawColor(...STONE_800);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
    y += 6;
    labelValue("Total Expenses", `$${totalExpenses.toLocaleString()}`);
    y += SECTION_GAP - LINE_HEIGHT;
  }

  // ── To-Do List ──
  const todos = event.timeline ?? [];
  if (todos.length > 0) {
    heading("To-Do Checklist");
    const sorted = [...todos].sort((a, b) => a.order - b.order);
    sorted.forEach((t) => {
      checkPage(8);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      // Checkbox
      const check = t.completed ? "✓" : "○";
      doc.setTextColor(t.completed ? 34 : 168, t.completed ? 197 : 162, t.completed ? 94 : 158);
      doc.text(check, margin, y);

      // Title
      doc.setTextColor(...STONE_800);
      const titleLines = doc.splitTextToSize(t.title, contentW - 50);
      doc.text(titleLines, margin + 7, y);

      // Due date
      if (t.dueDate) {
        doc.setTextColor(...STONE_500);
        doc.setFontSize(8);
        doc.text(
          new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          margin + contentW - 20,
          y
        );
      }
      y += Math.max(LINE_HEIGHT, titleLines.length * 4.5) + 1;
    });
    y += SECTION_GAP - LINE_HEIGHT;
  }

  // ── Day-of Schedule ──
  const schedule = event.schedule ?? [];
  if (schedule.length > 0) {
    heading("Day-of Timeline");
    const sorted = [...schedule].sort((a, b) => a.time.localeCompare(b.time));
    sorted.forEach((s) => {
      checkPage(8);

      // Time
      const [h, m] = s.time.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const timeStr = `${h12}:${m} ${ampm}`;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...ROSE);
      doc.text(timeStr, margin, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...STONE_800);
      const titleLines = doc.splitTextToSize(s.title, contentW - 30);
      doc.text(titleLines, margin + 25, y);

      if (s.notes) {
        y += titleLines.length * 4.5;
        doc.setFontSize(8);
        doc.setTextColor(...STONE_500);
        const noteLines = doc.splitTextToSize(s.notes, contentW - 30);
        doc.text(noteLines, margin + 25, y);
        y += noteLines.length * 3.5 + 3;
      } else {
        y += Math.max(LINE_HEIGHT, titleLines.length * 4.5) + 1;
      }
    });
    y += SECTION_GAP - LINE_HEIGHT;
  }

  // ── Color Palette ──
  const colors = event.colorPalette ?? [];
  if (colors.length > 0) {
    heading("Color Palette");
    let cx = margin;
    colors.forEach((color) => {
      checkPage(18);
      if (cx + 16 > pageW - margin) {
        cx = margin;
        y += 18;
      }
      doc.setFillColor(color);
      doc.roundedRect(cx, y, 12, 12, 2, 2, "F");
      doc.setFontSize(6);
      doc.setTextColor(...STONE_500);
      doc.text(color, cx, y + 15);
      cx += 18;
    });
    y += 22;
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...STONE_300);
    doc.text(
      `${event.name} — Event Summary — Page ${i} of ${pageCount}`,
      pageW / 2,
      pageH - 10,
      { align: "center" }
    );
  }

  doc.save(`${event.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-")}-Summary.pdf`);
}
