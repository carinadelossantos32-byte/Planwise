// Renders RPFP Form 1 (PMED-FM021, Version 04) to PDF so that it matches the
// reference Excel sheet: same grid, merged cells, borders, fonts and wording.
// The grid itself lives in form1PdfLayout.js (generated from the Excel file).
import { FORM1_LAYOUT as L } from "./form1PdfLayout.js";

// Folio / "8.5 x 13 in" landscape – the paper size set in the reference sheet.
export const FORM1_PAGE = { width: 936, height: 612, margin: 8 };

const FONT = { serif: "times", sans: "helvetica" };
const LINE_HEIGHT = 1.18;
const PAD_X = 2.25;
const PAD_Y = 1;
const MIN_FONT = 4.5;

const sum = (arr, to) => arr.slice(0, to).reduce((total, n) => total + n, 0);
const hexToRgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));

function createGeometry() {
  const contentWidth = sum(L.cols, L.cols.length);
  const contentHeight = sum(L.rows, L.rows.length);
  const { width, height, margin } = FORM1_PAGE;
  const k = Math.min((width - margin * 2) / contentWidth, (height - margin * 2) / contentHeight);
  const ox = (width - contentWidth * k) / 2;
  const oy = (height - contentHeight * k) / 2;
  const xs = [0, ...L.cols.map((_, i) => sum(L.cols, i + 1))].map((n) => ox + n * k);
  const ys = [0, ...L.rows.map((_, i) => sum(L.rows, i + 1))].map((n) => oy + n * k);
  return { k, ox, oy, xs, ys, contentWidth, contentHeight };
}

// Arial Narrow / Calibri are narrower than the built-in Helvetica, so the text
// is horizontally scaled (PDF "Tz" operator) to get the same proportions.
function withHorizontalScale(pdf, factor, draw) {
  if (factor === 1) return draw();
  pdf.internal.write("q");
  pdf.internal.write(`${(factor * 100).toFixed(1)} Tz`);
  draw();
  pdf.internal.write("Q");
}

function setFont(pdf, spec, size) {
  const style = spec.b && spec.i ? "bolditalic" : spec.b ? "bold" : spec.i ? "italic" : "normal";
  pdf.setFont(FONT[spec.font], style);
  pdf.setFontSize(size);
}

function wrapLines(pdf, text, maxWidth, factor, keepSpaces = false) {
  const width = (s) => pdf.getTextWidth(s) * factor;
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    const words = keepSpaces
      ? paragraph.match(/\S+\s*/g) || [""]
      : paragraph.trim().split(/\s+/);
    let line = "";
    for (let word of words) {
      // A single word wider than the cell is broken by characters.
      while (width(word.trimEnd()) > maxWidth && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && width(word.slice(0, cut)) > maxWidth) cut -= 1;
        if (line) { lines.push(line); line = ""; }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const candidate = !line ? word : keepSpaces ? line + word : `${line} ${word}`;
      if (!line || width(candidate.trimEnd()) <= maxWidth) line = candidate;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

// Draws text inside a box the way Excel lays out a cell.
function drawText(pdf, box, spec, text, { fit = false, keepSpaces = false } = {}) {
  const value = String(text ?? "");
  if (!value.trim() && !spec.runs) return;
  const factor = spec.nf || 1;
  const maxWidth = box.w - PAD_X * 2 * box.k;
  const maxHeight = box.h - PAD_Y * 2 * box.k;
  let size = spec.size * box.k;
  const minSize = MIN_FONT * box.k;
  let lines;

  for (;;) {
    setFont(pdf, spec, size);
    lines = spec.wrap || fit ? wrapLines(pdf, value, maxWidth, factor, keepSpaces) : [value.trim()];
    if (!fit || size <= minSize || lines.length * size * LINE_HEIGHT <= maxHeight) break;
    size = Math.max(minSize, size - 0.25 * box.k);
  }

  const lineHeight = size * LINE_HEIGHT;
  const blockHeight = lines.length * lineHeight;
  let top = box.y + PAD_Y * box.k;
  if (spec.v === "center") top = box.y + (box.h - blockHeight) / 2;
  else if (spec.v === "bottom") top = box.y + box.h - PAD_Y * box.k - blockHeight;

  const color = hexToRgb(spec.color || "000000");
  pdf.setTextColor(...color);

  lines.forEach((line, index) => {
    const y = top + index * lineHeight + lineHeight / 2;
    const runs = spec.runs && lines.length === 1 ? spec.runs : [[line, spec.color]];
    const widths = runs.map(([part]) => pdf.getTextWidth(part) * factor);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = box.x + PAD_X * box.k;
    if (spec.h === "center") x = box.x + (box.w - total) / 2;
    else if (spec.h === "right") x = box.x + box.w - PAD_X * box.k - total;

    runs.forEach(([part, runColor], i) => {
      pdf.setTextColor(...hexToRgb(runColor || "000000"));
      withHorizontalScale(pdf, factor, () => pdf.text(part, x, y, { baseline: "middle" }));
      x += widths[i];
    });
  });
  pdf.setTextColor(0, 0, 0);
}

function cellBox(g, r0, c0, r1 = r0, c1 = c0) {
  return {
    x: g.xs[c0],
    y: g.ys[r0],
    w: g.xs[c1 + 1] - g.xs[c0],
    h: g.ys[r1 + 1] - g.ys[r0],
    k: g.k,
  };
}

const NARROW = { font: "sans", nf: 0.82, size: 10, b: false, i: false, color: null, h: "center", v: "center", wrap: true };
const VALUE = (v) => (v == null || v === "" ? "-" : String(v));

function participantRows(client) {
  const address = [client.address, client.contact_number || client.phone_number]
    .filter(Boolean).map(VALUE).join("\n") || "-";
  return [
    {
      name: VALUE(client.name), sex: "M", civil: VALUE(client.civil_status_male),
      birth: VALUE(client.birthdate_male), education: VALUE(client.educational_attainment_male),
    },
    {
      name: VALUE(client.spouse_name), sex: "F", civil: VALUE(client.civil_status_female),
      birth: VALUE(client.birthdate_female), education: VALUE(client.educational_attainment_female),
    },
  ].map((row, i) => (i === 0 ? { ...row, address } : row));
}

function drawRecords(pdf, g, records, firstNumber, signatures) {
  records.forEach((client, index) => {
    const top = L.firstDataRow + index * 2;
    const [husband, wife] = participantRows(client);
    const left = { ...NARROW, h: "left" };

    drawText(pdf, cellBox(g, top, 0, top + 1, 0), NARROW, String(firstNumber + index));
    drawText(pdf, cellBox(g, top, 6, top + 1, 6), left, husband.address, { fit: true });

    [[husband, top], [wife, top + 1]].forEach(([row, r]) => {
      drawText(pdf, cellBox(g, r, 1, r, 2), left, row.name, { fit: true });
      drawText(pdf, cellBox(g, r, 3), NARROW, row.sex, { fit: true });
      drawText(pdf, cellBox(g, r, 4), NARROW, row.civil, { fit: true });
      drawText(pdf, cellBox(g, r, 5), NARROW, row.birth, { fit: true });
      drawText(pdf, cellBox(g, r, 7), NARROW, row.education, { fit: true });
    });

    // Columns (7)–(12) are merged across the husband / wife rows.
    [
      [8, client.no_of_children || "0"],
      [9, client.fp_method],
      [10, client.intention_to_shift],
      [11, client.type],
      [12, client.status],
      [13, client.reason],
    ].forEach(([col, value]) => {
      drawText(pdf, cellBox(g, top, col, top + 1, col), NARROW, VALUE(value), { fit: true });
    });

    const signature = client.id && signatures?.get(client.id);
    if (signature) {
      const box = cellBox(g, top, 14);
      const pad = 1.5 * g.k;
      const scale = Math.min((box.w - pad * 2) / signature.width, (box.h - pad * 2) / signature.height);
      const w = signature.width * scale;
      const h = signature.height * scale;
      pdf.addImage(signature.data, "PNG", box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
    }
  });
}

function drawStaticText(pdf, g) {
  L.texts.forEach((t) => {
    drawText(pdf, cellBox(g, t.r0, t.c0, t.r1, t.c1), t, t.text, { keepSpaces: t.keepSpaces });
  });
}

function drawBorders(pdf, g) {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineCap("square");
  L.hEdges.forEach(([row, c0, c1, w]) => {
    pdf.setLineWidth(w * g.k);
    pdf.line(g.xs[c0], g.ys[row], g.xs[c1], g.ys[row]);
  });
  L.vEdges.forEach(([col, r0, r1, w]) => {
    pdf.setLineWidth(w * g.k);
    pdf.line(g.xs[col], g.ys[r0], g.xs[col], g.ys[r1]);
  });
}

function drawLogo(pdf, g, logoDataUrl) {
  if (!logoDataUrl) return;
  // The reference logo starts above the print area, so it is clipped to it.
  pdf.saveGraphicsState();
  pdf.rect(g.ox, g.oy, g.contentWidth * g.k, g.contentHeight * g.k, null);
  pdf.clip();
  pdf.discardPath();
  pdf.addImage(
    logoDataUrl, "PNG",
    g.ox + L.logo.x * g.k, g.oy + L.logo.y * g.k, L.logo.w * g.k, L.logo.h * g.k,
    "rpfp-form1-logo"
  );
  pdf.restoreGraphicsState();
}

/**
 * Draws every page of the Form 1 export into `pdf`
 * (a jsPDF instance created with unit "pt" and FORM1_PAGE size).
 */
export function drawForm1Pages(pdf, records, { logo, signatures } = {}) {
  const g = createGeometry();
  const pages = Math.max(1, Math.ceil(records.length / L.couplesPerSheet));

  for (let page = 0; page < pages; page += 1) {
    if (page > 0) pdf.addPage();
    const first = page * L.couplesPerSheet;
    drawStaticText(pdf, g);
    drawRecords(pdf, g, records.slice(first, first + L.couplesPerSheet), first + 1, signatures);
    drawBorders(pdf, g);
    drawLogo(pdf, g, logo);
  }
}
