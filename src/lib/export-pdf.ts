import { jsPDF } from "jspdf";
import { Event, VENDOR_TO_BUDGET_CATEGORY } from "./types";

const ROSE = [244, 114, 114] as const; // rose-400
const STONE_800 = [41, 37, 36] as const;
const STONE_500 = [120, 113, 108] as const;
const STONE_300 = [214, 211, 209] as const;

export function exportEventPDF(event: Event, plannerName?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  function checkPage(needed: number) {
    if (y + needed > 270) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text: string) {
    checkPage(14);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...STONE_800);
    doc.text(text, margin, y);
    y += 2;
    doc.setDrawColor(...ROSE);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 40, y);
    y += 6;
  }

  function label(text: string) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...STONE_500);
    doc.text(text, margin, y);
  }

  function value(text: string, x?: number) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...STONE_800);
    doc.text(text, x ?? margin + 30, y);
  }

  // ── Header ──
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ROSE);
  doc.text(event.name, margin, y);
  y += 8;

  if (plannerName) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...STONE_500);
    doc.text(`Prepared by ${plannerName}`, margin, y);
    y += 5;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...STONE_500);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    margin,
    y
  );
  y += 10;

  // ── Event Details ──
  heading("Event Details");

  const eventDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const details = [
    ["Date", eventDate],
    ["Venue", event.venue || "TBD"],
    ["Status", event.status.charAt(0).toUpperCase() + event.status.slice(1)],
  ];
  details.forEach(([l, v]) => {
    checkPage(6);
    label(l);
    value(v);
    y += 5.5;
  });
  y += 4;

  // ── Client Details ──
  heading("Client");
  const clientDetails = [
    ["Name", event.clientName],
    ["Email", event.clientEmail],
  ];
  clientDetails.forEach(([l, v]) => {
    checkPage(6);
    label(l);
    value(v);
    y += 5.5;
  });
  y += 4;

  // ── Guest Summary ──
  const guests = event.guests ?? [];
  if (guests.length > 0) {
    heading("Guests");
    const accepted = guests.filter((g) => g.rsvp === "accepted").length;
    const declined = guests.filter((g) => g.rsvp === "declined").length;
    const pending = guests.filter((g) => g.rsvp === "pending").length;
    const plusOnes = guests.filter((g) => g.plusOne).length;

    const guestInfo = [
      ["Total Invited", `${guests.length}`],
      ["Accepted", `${accepted}`],
      ["Declined", `${declined}`],
      ["Pending", `${pending}`],
      ["Plus Ones", `${plusOnes}`],
      ["Est. Attendance", `${accepted + plusOnes}`],
    ];
    guestInfo.forEach(([l, v]) => {
      checkPage(6);
      label(l);
      value(v);
      y += 5.5;
    });
    y += 4;
  }

  // ── Vendors ──
  const vendors = event.vendors ?? [];
  if (vendors.length > 0) {
    heading("Vendors");
    vendors.forEach((v) => {
      checkPage(12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...STONE_800);
      doc.text(v.name, margin, y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...STONE_500);
      doc.text(`${v.category} · $${v.contractTotal.toLocaleString()}`, margin + 50, y);
      y += 4.5;

      if (v.contact || v.email || v.phone) {
        doc.setFontSize(8);
        const contact = [v.contact, v.email, v.phone].filter(Boolean).join(" · ");
        doc.text(contact, margin + 2, y);
        y += 4.5;
      }
      if (v.mealChoice) {
        doc.setFontSize(8);
        doc.text(`Meal: ${v.mealChoice}`, margin + 2, y);
        y += 4.5;
      }
    });

    const totalContracts = vendors.reduce((s, v) => s + v.contractTotal, 0);
    const totalPaid = vendors.reduce(
      (s, v) => s + (v.payments ?? []).filter((p) => p.paid).reduce((ps, p) => ps + p.amount, 0),
      0
    );
    checkPage(10);
    doc.setDrawColor(...STONE_300);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
    y += 4;
    label("Total Contracts");
    value(`$${totalContracts.toLocaleString()}`);
    y += 5;
    label("Total Paid");
    value(`$${totalPaid.toLocaleString()}`);
    y += 8;
  }

  // ── Budget ──
  const budget = event.budget ?? [];
  if (budget.length > 0) {
    heading("Budget");
    const totalAllocated = budget.reduce((s, b) => s + b.allocated, 0);

    budget.forEach((b) => {
      checkPage(6);
      const budgetCat = b.category;
      const matchingVendors = vendors.filter(
        (v) => VENDOR_TO_BUDGET_CATEGORY[v.category] === budgetCat
      );
      const committed = matchingVendors.reduce((s, v) => s + v.contractTotal, 0);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...STONE_800);
      doc.text(b.category, margin, y);
      doc.text(`$${b.allocated.toLocaleString()}`, margin + 55, y);
      doc.setTextColor(...STONE_500);
      doc.text(`committed: $${committed.toLocaleString()}`, margin + 80, y);
      y += 5;
    });

    checkPage(8);
    doc.setDrawColor(...STONE_300);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
    y += 4;
    label("Total Budget");
    value(`$${totalAllocated.toLocaleString()}`);
    y += 8;
  }

  // ── To-Do List ──
  const todos = event.timeline ?? [];
  if (todos.length > 0) {
    heading("To-Do Checklist");
    const sorted = [...todos].sort((a, b) => a.order - b.order);
    sorted.forEach((t) => {
      checkPage(6);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...STONE_800);
      const check = t.completed ? "[x]" : "[ ]";
      doc.text(`${check}  ${t.title}`, margin, y);
      if (t.dueDate) {
        doc.setTextColor(...STONE_500);
        doc.text(
          new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          margin + 120,
          y
        );
      }
      y += 5;
    });
    y += 4;
  }

  // ── Day-of Schedule ──
  const schedule = event.schedule ?? [];
  if (schedule.length > 0) {
    heading("Day-of Timeline");
    const sorted = [...schedule].sort((a, b) => a.time.localeCompare(b.time));
    sorted.forEach((s) => {
      checkPage(6);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...STONE_800);
      // Convert 24h to 12h
      const [h, m] = s.time.split(":");
      const hour = parseInt(h);
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      doc.text(`${h12}:${m} ${ampm}`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(s.title, margin + 22, y);
      y += 5;
    });
    y += 4;
  }

  // ── Color Palette ──
  const colors = event.colorPalette ?? [];
  if (colors.length > 0) {
    heading("Color Palette");
    let cx = margin;
    colors.forEach((color) => {
      checkPage(14);
      if (cx + 14 > pageW - margin) {
        cx = margin;
        y += 14;
      }
      doc.setFillColor(color);
      doc.roundedRect(cx, y, 10, 10, 2, 2, "F");
      doc.setFontSize(6);
      doc.setTextColor(...STONE_500);
      doc.text(color, cx, y + 13);
      cx += 16;
    });
    y += 18;
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
      290,
      { align: "center" }
    );
  }

  doc.save(`${event.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-")}-Summary.pdf`);
}
