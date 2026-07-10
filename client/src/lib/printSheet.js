/*
 * printSheet — the pure math and string work behind the print/PDF sheet.
 * No Vue, no jsPDF: these functions take plain values and return plain values,
 * so each one can be explained and tested on its own. The composable
 * (usePdfExport) does the actual drawing with what's computed here.
 */

/*
 * The engraved page's width, shared by the editor and the print sheet so the
 * manuscript you write on IS the page that prints: same width, same justified
 * systems, same line breaks. 680px of engraving fits A4/letter inside the
 * browser's default print margins.
 */
export const SHEET_WIDTH = 680

/* ---- The sheet's engraved header, in px --------------------------------- */
/* jsPDF is created with unit 'px', so every number here is a CSS pixel and
   the score SVG maps onto the PDF page 1:1 — what you measure is what prints. */
const SHEET_MARGIN = 36 // white border around everything on the PDF page
const TITLE_SIZE = 26 // matches the sheet's on-screen title (--text-xl)
const DESCRIPTION_SIZE = 14
const DESCRIPTION_GAP = 24 // title baseline → description baseline
const SCORE_GAP = 20 // last header baseline → top of the score SVG

/**
 * A safe download filename from a score title: strip the characters file
 * systems refuse, tidy the whitespace, and fall back quietly when the title
 * is empty. "Study in E minor" → "Study in E minor.pdf".
 */
export function pdfFilename(title) {
  const cleaned = String(title || '')
    .replace(/[\\/:*?"<>|]/g, ' ') // characters Windows/macOS forbid in names
    .replace(/\s+/g, ' ') // collapse whitespace runs (incl. newlines)
    .trim()
    .replace(/\.+$/, '') // Windows also refuses trailing dots
  return `${cleaned || 'Untitled score'}.pdf`
}

/**
 * Where everything sits on the single long PDF page, given the score SVG's
 * drawn size. Text y-positions are BASELINES (that's where jsPDF anchors
 * text), so the title's baseline sits a full glyph height below the margin.
 * Returns every coordinate the export needs; nothing is computed twice.
 */
export function pdfLayout({ svgWidth, svgHeight, hasDescription }) {
  const titleBaseline = SHEET_MARGIN + TITLE_SIZE
  const descriptionBaseline = hasDescription
    ? titleBaseline + DESCRIPTION_GAP
    : titleBaseline
  const scoreTop = descriptionBaseline + SCORE_GAP
  return {
    margin: SHEET_MARGIN,
    titleSize: TITLE_SIZE,
    descriptionSize: DESCRIPTION_SIZE,
    titleBaseline,
    descriptionBaseline,
    scoreTop,
    pageWidth: svgWidth + SHEET_MARGIN * 2,
    pageHeight: scoreTop + svgHeight + SHEET_MARGIN
  }
}

/**
 * Parse a computed CSS colour ("rgb(33, 26, 16)") into [r, g, b] for jsPDF's
 * setTextColor. Returns null when the string isn't in that form — the caller
 * just skips the call and lets jsPDF keep its default ink.
 */
export function cssColorToRgb(color) {
  const match = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(String(color || ''))
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}
