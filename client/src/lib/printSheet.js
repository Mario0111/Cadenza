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
const CREDITS_SIZE = 13 // the credits line: tempo left, composer right
const CREDITS_GAP = 22 // last centred baseline → credits baseline
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
export function pdfLayout({ svgWidth, svgHeight, hasDescription, hasCredits }) {
  const titleBaseline = SHEET_MARGIN + TITLE_SIZE
  const descriptionBaseline = hasDescription
    ? titleBaseline + DESCRIPTION_GAP
    : titleBaseline
  // The credits line (tempo left, composer right) hangs below whichever
  // centred line came last; without one, its baseline collapses onto that
  // line so the score's gap stays the same.
  const creditsBaseline = hasCredits
    ? descriptionBaseline + CREDITS_GAP
    : descriptionBaseline
  const scoreTop = creditsBaseline + SCORE_GAP
  return {
    margin: SHEET_MARGIN,
    titleSize: TITLE_SIZE,
    descriptionSize: DESCRIPTION_SIZE,
    creditsSize: CREDITS_SIZE,
    titleBaseline,
    descriptionBaseline,
    creditsBaseline,
    scoreTop,
    pageWidth: svgWidth + SHEET_MARGIN * 2,
    pageHeight: scoreTop + svgHeight + SHEET_MARGIN
  }
}

/**
 * The tempo mark's beat figure for the PDF, as pure geometry. jsPDF's built-in
 * fonts carry no music glyphs, so the little note is drawn from primitives —
 * a notehead, a stem, flags, a dot — sized to sit beside the credits text
 * (13px). All coordinates are relative to the figure's origin: x = 0 at its
 * left edge, y = 0 on the TEXT BASELINE (the notehead rests on it, the stem
 * rises above it — negative y is up, as on the page).
 *
 * Returns { head, stem, flags, dot, width }:
 *   head  — { x, y, rx, ry, filled }  centre + radii of the notehead ellipse
 *   stem  — { x, y1, y2 } | null      a vertical line (whole notes have none)
 *   flags — [{ x, y, curve }]         each a cubic Bézier from the stem top,
 *                                     curve = [dx1,dy1, dx2,dy2, dx,dy]
 *   dot   — { x, y, r } | null        the augmentation dot beside the head
 *   width — total width, so "= 120" knows where to start
 */
export function tempoFigure(beatUnit = 'q', beatDotted = false) {
  // A whole note is just a wider hollow oval; everything else is a head with
  // a stem. Only the quarter and shorter are filled.
  const isWhole = beatUnit === 'w'
  const head = isWhole
    ? { x: 3.5, y: -2.3, rx: 3.5, ry: 2.3, filled: false }
    : { x: 2.8, y: -2.1, rx: 2.8, ry: 2.1, filled: beatUnit !== 'h' }

  // The stem rises from the head's right shoulder to a fixed top.
  const stemX = head.x + head.rx
  const stem = isWhole ? null : { x: stemX, y1: head.y, y2: -12.5 }

  // Flags hang off the stem top, curving out and down; a sixteenth stacks a
  // second one a little lower. Eighth = 1 flag, sixteenth = 2, longer = none.
  const flagCurve = [2.6, 1.6, 3.0, 4.4, 1.2, 6.6]
  const flagCount = beatUnit === '8' ? 1 : beatUnit === '16' ? 2 : 0
  const flags = Array.from({ length: flagCount }, (_, i) => ({
    x: stemX,
    y: stem.y2 + i * 3.5,
    curve: flagCurve
  }))

  const dot = beatDotted
    ? { x: head.x + head.rx + 2.4, y: head.y, r: 0.95 }
    : null

  // The figure's right edge: the head (whole), the flags' reach (8th/16th) or
  // the stem — and the dot past whichever of those it follows.
  let width = isWhole ? head.x + head.rx : flagCount ? stemX + 4.2 : stemX
  if (dot) width = Math.max(width, dot.x + dot.r)
  return { head, stem, flags, dot, width }
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
