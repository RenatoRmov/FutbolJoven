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

/**
 * Spider/radar chart matching the "Radar de habilidades" card on the web
 * player profile (Actual/Anterior/Promedio categoría over the same
 * dimensions) — drawn with pdfkit vector primitives since there's no
 * headless browser available to rasterize the web chart itself.
 */
export function drawRadarChart(doc: PDFKit.PDFDocument, axes: RadarAxis[], maxValue = 10) {
  const n = axes.length;
  if (n < 3) return;

  const size = 200;
  ensureSpace(doc, size + 40);
  const centerX = doc.page.width / 2;
  const top = doc.y + 10;
  const centerY = top + size / 2;
  const radius = size / 2;

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
    const labelR = radius + 22;
    const lx = centerX + labelR * Math.cos(labelAngle);
    const ly = centerY + labelR * Math.sin(labelAngle);
    const align = Math.cos(labelAngle) > 0.3 ? "left" : Math.cos(labelAngle) < -0.3 ? "right" : "center";
    doc.fontSize(7.5).fillColor(COLORS.carbon).font("Helvetica-Bold").text(axis.label, lx - 45, ly - 4, { width: 90, align });
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

  doc.y = top + size + 30;

  // Legend.
  const legendY = doc.y - 16;
  const legendItems: [string, string][] = [
    ["Actual", COLORS.rojo],
    ["Anterior", COLORS.dorado],
    ["Promedio categoría", COLORS.gris],
  ];
  let lx = centerX - 130;
  for (const [label, color] of legendItems) {
    doc.rect(lx, legendY, 8, 8).fill(color);
    doc.fontSize(8).fillColor(COLORS.gris).font("Helvetica").text(label, lx + 12, legendY - 1);
    lx += 12 + doc.widthOfString(label) + 18;
  }
  doc.y = legendY + 20;
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
