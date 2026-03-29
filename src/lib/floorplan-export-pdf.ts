import { jsPDF } from "jspdf";
import { LightingZone, Guest } from "./types";
import { FURNITURE_CATALOG, pxToFeetInches } from "./constants";
import { unwrapCanvasJSON } from "./floorplan-schema";

const ROSE = [244, 114, 114] as const;
const STONE_800 = [41, 37, 36] as const;
const STONE_500 = [120, 113, 108] as const;
const STONE_300 = [214, 211, 209] as const;
const VIOLET = [139, 92, 246] as const;

const LIGHTING_TYPE_LABELS: Record<string, string> = {
  uplight: "LED Uplight",
  spotlight: "Spotlight",
  pinspot: "Pin Spot",
  gobo: "Gobo Projector",
  wash: "Wash Light",
  string: "String Light",
  candles: "Candles",
};

interface FurnitureInfo {
  label: string;
  furnitureId: string;
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
  maxSeats: number;
}

/** Extract furniture items from floor plan JSON */
function extractFurniture(json: string | null): FurnitureInfo[] {
  if (!json) return [];
  try {
    const canvas = unwrapCanvasJSON(json);
    const objects = (canvas as Record<string, unknown>).objects as any[] || [];
    const items: FurnitureInfo[] = [];
    for (const obj of objects) {
      const data = obj.data;
      if (!data || data.isGrid || data.isRoom || data.isLighting) continue;
      if (!data.furnitureId) continue;
      const catalogItem = FURNITURE_CATALOG.find((f) => f.id === data.furnitureId);
      if (catalogItem) {
        items.push({
          label: data.label || catalogItem.name,
          furnitureId: data.furnitureId,
          category: catalogItem.category,
          x: obj.left ?? 0,
          y: obj.top ?? 0,
          width: obj.width ?? catalogItem.defaultWidth,
          height: obj.height ?? catalogItem.defaultHeight,
          maxSeats: catalogItem.maxSeats ?? 0,
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

interface FloorPlanPDFOptions {
  planName: string;
  eventName: string;
  plannerName?: string;
  floorPlanJSON: string | null;
  lightingZones: LightingZone[];
  guests: Guest[];
  canvasDataURL: string; // base64 PNG from canvas.toDataURL()
  canvasWidth: number;
  canvasHeight: number;
}

export function exportFloorPlanPDF(opts: FloorPlanPDFOptions) {
  const {
    planName,
    eventName,
    plannerName,
    floorPlanJSON,
    lightingZones,
    guests,
    canvasDataURL,
    canvasWidth,
    canvasHeight,
  } = opts;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: canvasWidth > canvasHeight ? "landscape" : "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = margin;

  function checkPage(needed: number) {
    if (y + needed > pageH - 16) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text: string) {
    checkPage(14);
    y += 3;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...STONE_800);
    doc.text(text, margin, y);
    y += 2.5;
    doc.setDrawColor(...ROSE);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 35, y);
    y += 6;
  }

  // ── Page 1: Header + Floor Plan Image ──

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ROSE);
  doc.text(eventName, margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...STONE_800);
  doc.text(`${planName} — Floor Plan`, margin, y);
  y += 5;

  if (plannerName) {
    doc.setFontSize(8);
    doc.setTextColor(...STONE_500);
    doc.text(`Prepared by ${plannerName}`, margin, y);
    y += 4;
  }

  doc.setFontSize(8);
  doc.setTextColor(...STONE_500);
  doc.text(
    `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    margin,
    y
  );
  y += 3;

  // Scale note
  doc.setFontSize(7);
  doc.setTextColor(...STONE_300);
  doc.text("Scale: 1px = 1 inch", margin, y);
  y += 6;

  // Floor plan image
  if (canvasDataURL) {
    const availW = contentW;
    const availH = pageH - y - 16;
    const aspect = canvasWidth / canvasHeight;
    let imgW = availW;
    let imgH = imgW / aspect;
    if (imgH > availH) {
      imgH = availH;
      imgW = imgH * aspect;
    }
    const imgX = margin + (contentW - imgW) / 2;

    // Light border around image
    doc.setDrawColor(...STONE_300);
    doc.setLineWidth(0.3);
    doc.rect(imgX - 0.5, y - 0.5, imgW + 1, imgH + 1);

    doc.addImage(canvasDataURL, "PNG", imgX, y, imgW, imgH);
    y += imgH + 8;
  }

  // ── Page 2: Furniture Legend ──
  const furniture = extractFurniture(floorPlanJSON);
  if (furniture.length > 0) {
    doc.addPage();
    y = margin;

    heading("Furniture Legend");

    // Table header
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...STONE_500);
    doc.text("Item", margin, y);
    doc.text("Category", margin + 55, y);
    doc.text("Dimensions", margin + 85, y);
    doc.text("Seats", margin + 115, y);
    y += 2;
    doc.setDrawColor(...STONE_300);
    doc.setLineWidth(0.15);
    doc.line(margin, y, margin + contentW, y);
    y += 4;

    const tables = furniture.filter((f) => f.category === "table");
    const other = furniture.filter((f) => f.category !== "table");

    [...tables, ...other].forEach((item) => {
      checkPage(6);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...STONE_800);
      doc.text(item.label, margin, y);

      doc.setTextColor(...STONE_500);
      doc.text(item.category, margin + 55, y);
      doc.text(`${pxToFeetInches(item.width)} x ${pxToFeetInches(item.height)}`, margin + 85, y);
      doc.text(item.maxSeats > 0 ? `${item.maxSeats}` : "—", margin + 115, y);
      y += 5;
    });

    // Summary
    y += 4;
    const totalSeats = furniture.reduce((s, f) => s + f.maxSeats, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...STONE_800);
    doc.text(`Total Items: ${furniture.length}`, margin, y);
    if (totalSeats > 0) {
      doc.text(`Total Seating Capacity: ${totalSeats}`, margin + 50, y);
    }
    y += 8;
  }

  // ── Lighting Legend ──
  if (lightingZones.length > 0) {
    checkPage(20);
    heading("Lighting Zones");

    lightingZones.forEach((zone) => {
      checkPage(10);

      // Color swatch
      doc.setFillColor(zone.color);
      doc.circle(margin + 3, y - 1, 2.5, "F");

      // Name + type
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...STONE_800);
      doc.text(zone.name, margin + 9, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...STONE_500);
      doc.text(LIGHTING_TYPE_LABELS[zone.type] || zone.type, margin + 55, y);
      doc.text(`${zone.intensity}%`, margin + 90, y);

      // Snapped target
      if (zone.snappedToFurnitureId) {
        doc.setFontSize(7);
        doc.setTextColor(...VIOLET);
        doc.text(`→ ${zone.snappedToFurnitureId}`, margin + 105, y);
      }
      y += 5;

      // Notes
      if (zone.notes) {
        doc.setFontSize(7);
        doc.setTextColor(...STONE_500);
        const noteLines = doc.splitTextToSize(zone.notes, contentW - 12);
        doc.text(noteLines, margin + 9, y);
        y += noteLines.length * 3.5 + 1;
      }
    });
    y += 4;
  }

  // ── Seating Chart ──
  const acceptedGuests = guests.filter((g) => g.rsvp === "accepted");
  const assignedGuests = acceptedGuests.filter((g) => g.tableAssignment);
  if (assignedGuests.length > 0) {
    checkPage(20);
    heading("Seating Chart");

    // Group guests by table
    const byTable = new Map<string, Guest[]>();
    assignedGuests.forEach((g) => {
      const table = g.tableAssignment;
      if (!byTable.has(table)) byTable.set(table, []);
      byTable.get(table)!.push(g);
    });

    byTable.forEach((tableGuests, tableLabel) => {
      checkPage(10);

      const tableItem = furniture.find((f) => f.label === tableLabel);
      const cap = tableItem?.maxSeats ?? 0;
      const headCount = tableGuests.reduce((s, g) => s + 1 + (g.plusOne ? 1 : 0), 0);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...STONE_800);
      doc.text(tableLabel, margin, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...STONE_500);
      doc.text(cap > 0 ? `(${headCount}/${cap})` : `(${headCount})`, margin + 45, y);
      y += 5;

      tableGuests.forEach((g) => {
        checkPage(5);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...STONE_800);
        let name = g.name;
        if (g.vip) name = "★ " + name;
        if (g.plusOne) name += " +1";
        doc.text(name, margin + 4, y);

        if (g.mealChoice) {
          doc.setTextColor(...STONE_500);
          doc.text(g.mealChoice, margin + 65, y);
        }
        if (g.dietaryNotes) {
          doc.setFontSize(7);
          doc.setTextColor(...STONE_500);
          doc.text(g.dietaryNotes, margin + 100, y);
        }
        y += 4;
      });
      y += 3;
    });
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...STONE_300);
    doc.text(
      `${eventName} — ${planName} Floor Plan — Page ${i} of ${pageCount}`,
      pageW / 2,
      pageH - 8,
      { align: "center" }
    );
  }

  const safeName = eventName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-");
  const safePlan = planName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-");
  doc.save(`${safeName}-${safePlan}-FloorPlan.pdf`);
}
