const PDFDocument = require('pdfkit');

const INK = '#1a2028';
const MUTED = '#6b7280';
const LINE = '#e2e5ea';
const ACCENT = '#0891a3';

function money(value, symbol = '$') {
  return `${symbol}${(Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function newDocument() {
  return new PDFDocument({ size: 'A4', margin: 50 });
}

function streamPdf(res, doc, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
}

function drawBrandHeader(doc, store, docType, docSubtitle) {
  doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(19).text(store.storeName || 'My Store', 50, 50);
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(9)
    .text([store.address, store.phone, store.email].filter(Boolean).join('  •  '), 50, 72, { width: 300 });

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(docType, 0, 50, { align: 'right' });
  if (docSubtitle) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(docSubtitle, 0, 74, { align: 'right' });
  }

  doc.moveTo(50, 108).lineTo(545, 108).strokeColor(LINE).lineWidth(1).stroke();
  doc.y = 122;
}

function labelValue(doc, x, y, label, value, opts = {}) {
  doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text(label.toUpperCase(), x, y, { characterSpacing: 0.4 });
  doc
    .fillColor(INK)
    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts.size || 11)
    .text(value || '—', x, y + 13, { width: opts.width || 240 });
}

function drawTableHeader(doc, x, y, columns) {
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8.5);
  columns.forEach((col) => {
    doc.text(col.label.toUpperCase(), x + col.x, y, { width: col.width, align: col.align || 'left', characterSpacing: 0.3 });
  });
  const totalWidth = columns.reduce((sum, c) => Math.max(sum, c.x + c.width), 0);
  doc.moveTo(x, y + 16).lineTo(x + totalWidth, y + 16).strokeColor(LINE).lineWidth(1).stroke();
}

function drawTableRow(doc, x, y, columns, values, opts = {}) {
  doc.fillColor(opts.color || INK).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 10);
  columns.forEach((col, i) => {
    doc.text(String(values[i] ?? ''), x + col.x, y, { width: col.width, align: col.align || 'left' });
  });
}

function drawFooter(doc, text) {
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(8.5)
    .text(text, 50, 780, { align: 'center', width: 495 });
}

module.exports = {
  newDocument,
  streamPdf,
  drawBrandHeader,
  labelValue,
  drawTableHeader,
  drawTableRow,
  drawFooter,
  money,
  INK,
  MUTED,
  LINE,
  ACCENT,
};
