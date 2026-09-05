import PDFDocument from "pdfkit";

export const COLORS = {
  rojo: "#C8102E",
  rojoOscuro: "#8C0E22",
  carbon: "#1A1A1A",
  gris: "#6E6660",
  grisClaro: "#F1ECE9",
  borde: "#E6DEDA",
  dorado: "#F0B429",
};

export const STATUS_COLORS: Record<string, string> = {
  PROYECTADO: "#1E7A3E",
  PROYECTABLE: "#1D5FB3",
  EN_DESARROLLO: "#C68A00",
  LIMITADO: "#B4531A",
  NO_APTO: "#8C0E22",
};

const PAGE_MARGIN = 40;
const PAGE_HEIGHT = 841.89; // A4 in points

export function renderPdfToBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      build(doc);
    } catch (err) {
      reject(err);
      return;
    }
    doc.end();
  });
}

/** Club header bar — used at the top of every report page. */
export function addHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  doc.rect(0, 0, doc.page.width, 70).fill(COLORS.rojo);
  doc.fillColor("#fff").fontSize(18).font("Helvetica-Bold").text("CLUB DEPORTES LIMACHE", PAGE_MARGIN, 20);
  doc.fontSize(10).font("Helvetica").text(subtitle, PAGE_MARGIN, 44);
  doc.fillColor(COLORS.carbon).fontSize(20).font("Helvetica-Bold").text(title, PAGE_MARGIN, 88);
  doc.moveDown(1.5);
  doc.fillColor(COLORS.carbon).font("Helvetica");
}

export function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > PAGE_HEIGHT - PAGE_MARGIN - 90) {
    doc.addPage();
  }
}

const CONTENT_WIDTH_OPTS = { width: 595.28 - PAGE_MARGIN * 2 };

/** Always sets an explicit x + full content width — pdfkit otherwise inherits
 * the x/width of whatever the last positioned .text() call used (e.g. a
 * narrow column at the right edge of a bar), which silently wraps every
 * following line to one character per line. */
export function fullWidthText(doc: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) {
  doc.text(text, PAGE_MARGIN, doc.y, { ...CONTENT_WIDTH_OPTS, ...options });
}

export function sectionTitle(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 30);
  doc.moveDown(0.5);
  doc.fillColor(COLORS.rojoOscuro).fontSize(13).font("Helvetica-Bold");
  fullWidthText(doc, text);
  doc.fillColor(COLORS.carbon).font("Helvetica").fontSize(10);
  doc.moveDown(0.3);
}

/** A single horizontal bar (0..max) with a label — used for dimension/player score breakdowns. */
export function drawBar(doc: PDFKit.PDFDocument, label: string, value: number | null, max: number, color = COLORS.rojo) {
  ensureSpace(doc, 20);
  const barX = PAGE_MARGIN + 140;
  const barWidth = doc.page.width - PAGE_MARGIN - barX - 40;
  const y = doc.y;

  doc.fontSize(9).fillColor(COLORS.carbon).text(label, PAGE_MARGIN, y + 2, { width: 130, height: 10, ellipsis: true, lineBreak: false });
  doc.rect(barX, y, barWidth, 10).fill(COLORS.grisClaro);
  if (value !== null) {
    const fillWidth = Math.max(0, Math.min(1, value / max)) * barWidth;
    doc.rect(barX, y, fillWidth, 10).fill(color);
  }
  doc.fontSize(9).fillColor(COLORS.gris).text(value === null ? "—" : value.toFixed(1), barX + barWidth + 6, y + 1);
  doc.y = y + 16;
}

export interface RadarAxis {
  label: string;
  current: number | null;
  previous: number | null;
  teamAverage: number | null;
}

export interface RadarChartOptions {
  maxValue?: number;
  /** Center x in page coordinates. Defaults to the page's horizontal center (standalone/full-width use). */
  centerX?: number;
  /** Chart diameter in points. Defaults to 200. */
  size?: number;
  /** Top y in page coordinates. When provided, the chart never reads/writes `doc.y` — the caller
   * tracks its own cursor (used for the two side-by-side column radars). Omit for the original
   * full-width standalone behavior, which advances `doc.y` past the chart + legend itself. */
  topY?: number;
  showLegend?: boolean;
}

/**
 * Spider/radar chart matching the "Radar de habilidades" card on the web
 * player profile (Actual/Anterior/Promedio categoría over the same
 * dimensions) — drawn with pdfkit vector primitives since there's no
 * headless browser available to rasterize the web chart itself.
 *
 * Returns the y position immediately below everything drawn (chart + legend),
 * so callers doing manual column layout can chain from it.
 */
export function drawRadarChart(doc: PDFKit.PDFDocument, axes: RadarAxis[], options: RadarChartOptions = {}): number {
  const { maxValue = 10, size = 200, showLegend = true } = options;
  const standalone = options.topY === undefined;
  const n = axes.length;
  if (n < 3) return options.topY ?? doc.y;

  if (standalone) ensureSpace(doc, size + 40);
  const centerX = options.centerX ?? doc.page.width / 2;
  const top = options.topY ?? doc.y + 10;
  const centerY = top + size / 2;
  const radius = size / 2;
  const labelFontSize = Math.max(6, size / 26.5);
  const labelOffset = Math.max(14, size * 0.11);
  const labelBoxWidth = Math.max(45, size * 0.45);

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pointFor = (i: number, value: number) => {
    const r = (Math.max(0, Math.min(maxValue, value)) / maxValue) * radius;
    const angle = angleFor(i);
    return [centerX + r * Math.cos(angle), centerY + r * Math.sin(angle)];
  };

  // Grid rings + axes.
  for (const frac of [0.25, 0.5, 0.75, 1]) {
    doc.strokeColor(COLORS.borde).lineWidth(0.5);
    axes.forEach((_, i) => {
      const [x, y] = pointFor(i, maxValue * frac);
      if (i === 0) doc.moveTo(x, y);
      else doc.lineTo(x, y);
    });
    doc.closePath().stroke();
  }
  axes.forEach((axis, i) => {
    const [x, y] = pointFor(i, maxValue);
    doc.strokeColor(COLORS.borde).lineWidth(0.5).moveTo(centerX, centerY).lineTo(x, y).stroke();
    const labelAngle = angleFor(i);
    const labelR = radius + labelOffset;
    const lx = centerX + labelR * Math.cos(labelAngle);
    const ly = centerY + labelR * Math.sin(labelAngle);
    const align = Math.cos(labelAngle) > 0.3 ? "left" : Math.cos(labelAngle) < -0.3 ? "right" : "center";
    doc
      .fontSize(labelFontSize)
      .fillColor(COLORS.carbon)
      .font("Helvetica-Bold")
      .text(axis.label, lx - labelBoxWidth / 2, ly - labelFontSize / 2, { width: labelBoxWidth, align });
  });

  function drawSeries(getValue: (a: RadarAxis) => number | null, color: string, fillOpacity: number, dashed: boolean) {
    if (axes.every((a) => getValue(a) === null)) return;
    doc.strokeColor(color).lineWidth(1.3);
    if (dashed) doc.dash(3, { space: 2 });
    axes.forEach((axis, i) => {
      const [x, y] = pointFor(i, getValue(axis) ?? 0);
      if (i === 0) doc.moveTo(x, y);
      else doc.lineTo(x, y);
    });
    doc.closePath();
    if (fillOpacity > 0) {
      doc.fillOpacity(fillOpacity).fillColor(color).fill();
      doc.fillOpacity(1);
    }
    doc.stroke();
    if (dashed) doc.undash();
  }

  drawSeries((a) => a.teamAverage, COLORS.gris, 0, true);
  drawSeries((a) => a.previous, COLORS.dorado, 0.12, false);
  drawSeries((a) => a.current, COLORS.rojo, 0.28, false);

  let bottomY = top + size + 14;

  if (showLegend) {
    const legendY = bottomY;
    const legendFontSize = Math.max(6.5, labelFontSize - 0.5);
    const legendItems: [string, string][] = [
      ["Actual", COLORS.rojo],
      ["Anterior", COLORS.dorado],
      ["Promedio categoría", COLORS.gris],
    ];
    doc.fontSize(legendFontSize).font("Helvetica");
    const totalWidth = legendItems.reduce((sum, [label]) => sum + 12 + doc.widthOfString(label) + 14, -14);
    let lx = centerX - totalWidth / 2;
    for (const [label, color] of legendItems) {
      doc.rect(lx, legendY, 7, 7).fill(color);
      doc.fontSize(legendFontSize).fillColor(COLORS.gris).font("Helvetica").text(label, lx + 10, legendY - 1);
      lx += 10 + doc.widthOfString(label) + 14;
    }
    bottomY = legendY + legendFontSize + 10;
  }

  if (standalone) doc.y = bottomY;
  return bottomY;
}

/** Big value + small caption below, e.g. "67 kg" / "PESO CORPORAL". Returns the y below the card. */
export function drawStatCard(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, value: string, label: string): number {
  doc.roundedRect(x, y, w, h, 4).fill(COLORS.grisClaro);
  // pdfkit's lineBreak:false + ellipsis doesn't reliably keep long values on one
  // line at this column width — shrink the font instead of risking a wrap that
  // bleeds into the caption below.
  const valueFontSize = value.length > 6 ? 10 : value.length > 4 ? 11.5 : 13;
  doc
    .fillColor(COLORS.rojoOscuro)
    .fontSize(valueFontSize)
    .font("Helvetica-Bold")
    .text(value, x + 2, y + h / 2 - valueFontSize / 2 - 3, { width: w - 4, align: "center" });
  const labelFontSize = label.length > 14 ? 5.5 : 6.5;
  doc
    .fillColor(COLORS.gris)
    .fontSize(labelFontSize)
    .font("Helvetica")
    .text(label.toUpperCase(), x + 2, y + h - 14, { width: w - 4, align: "center" });
  return y + h;
}

/** Small table (a handful of rows) at an explicit position — used where a full-width table would be too tall for a column. Returns the y below the table. */
export function drawMiniTable(doc: PDFKit.PDFDocument, x: number, y: number, width: number, headers: string[], rows: string[][]): number {
  const colWidth = width / headers.length;
  doc.fontSize(7).fillColor(COLORS.rojoOscuro).font("Helvetica-Bold");
  headers.forEach((h, i) => doc.text(h, x + i * colWidth, y, { width: colWidth - 2 }));
  let rowY = y + 11;
  doc.strokeColor(COLORS.borde).lineWidth(0.5).moveTo(x, rowY - 2).lineTo(x + width, rowY - 2).stroke();
  doc.font("Helvetica").fillColor(COLORS.carbon).fontSize(7);
  for (const row of rows) {
    row.forEach((cell, i) => doc.text(cell, x + i * colWidth, rowY, { width: colWidth - 2, height: 9, ellipsis: true, lineBreak: false }));
    rowY += 12;
  }
  return rowY;
}

/** Section title at an explicit position, for column layouts. Returns the y below the title. */
export function columnSectionTitle(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number): number {
  doc.fillColor(COLORS.rojoOscuro).fontSize(11).font("Helvetica-Bold");
  doc.text(text, x, y, { width });
  const consumed = doc.heightOfString(text, { width });
  doc.fillColor(COLORS.carbon).font("Helvetica").fontSize(8);
  return y + consumed + 6;
}

/** Body text at an explicit position, for column layouts. Returns the y below the text. */
export function columnText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  options: PDFKit.Mixins.TextOptions & { fontSize?: number } = {},
): number {
  const { fontSize = 9, ...textOptions } = options;
  doc.fontSize(fontSize);
  doc.text(text, x, y, { width, ...textOptions });
  return y + doc.heightOfString(text, { width, ...textOptions }) + 3;
}

/** Printed "signature" footer — every generated report carries this audit trail. */
export function addSignatureBlock(doc: PDFKit.PDFDocument) {
  ensureSpace(doc, 90);
  doc.moveDown(2);
  const y = doc.y + 20;
  const colWidth = (doc.page.width - PAGE_MARGIN * 2) / 2;

  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + colWidth - 30, y).strokeColor(COLORS.borde).stroke();
  doc.moveTo(PAGE_MARGIN + colWidth, y).lineTo(PAGE_MARGIN + colWidth * 2 - 30, y).strokeColor(COLORS.borde).stroke();

  doc.fontSize(9).fillColor(COLORS.carbon).font("Helvetica-Bold");
  doc.text("Jacob Eduardo Donoso Miranda", PAGE_MARGIN, y + 5, { width: colWidth - 30 });
  doc.text("Renato Jesús Oliva Aguirre", PAGE_MARGIN + colWidth, y + 5, { width: colWidth - 30 });

  doc.fontSize(8).fillColor(COLORS.gris).font("Helvetica");
  doc.text("Director Deportivo", PAGE_MARGIN, y + 18, { width: colWidth - 30 });
  doc.text("Coordinador de Datos", PAGE_MARGIN + colWidth, y + 18, { width: colWidth - 30 });

  doc.fontSize(7.5).fillColor(COLORS.gris);
  doc.text(`Documento generado el ${new Date().toLocaleString("es-CL")} — FutbolJoven / Club Deportes Limache`, PAGE_MARGIN, y + 40, {
    width: doc.page.width - PAGE_MARGIN * 2,
    align: "center",
  });
}
