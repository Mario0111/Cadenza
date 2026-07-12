/*
 * staffGeometry.js — the math that turns a click on the rendered score into a
 * musical position. Pure functions over the layout data `renderScore` returns
 * ({ measures: [{ x, width, hitTop, hitBottom, topLineY, lineSpacing,
 * notes: [{ noteIndex, x }] }] }) — nothing here touches VexFlow or the DOM,
 * so the data → render direction stays intact: the renderer REPORTS where it
 * drew things, and we only read that report.
 *
 * NOTATION MATH (y → staff position → pitch)
 * ------------------------------------------
 * A staff is five lines; VexFlow numbers them from the TOP, and on a treble
 * staff the top line is f/5. Lines sit `lineSpacing` px apart, and the spaces
 * BETWEEN lines are positions too — so one diatonic step (see pitches.js) is
 * exactly half a line spacing. A click's distance below the top line, rounded
 * to the nearest half-spacing, is therefore how many letter-steps below f/5
 * the user aimed. That rounding IS the "clean snapping": any y lands exactly
 * on a line or a space, never between.
 */
import { pitchToStep, stepToPitch, clampStep } from './pitches.js'

// The top line of a treble staff carries this pitch.
const TOP_LINE_PITCH = 'f/5'
const TOP_LINE_STEP = pitchToStep(TOP_LINE_PITCH)

// Clicks within a note-head's reach of a drawn note select it instead of
// writing a new one.
const NOTE_HIT_RADIUS = 14

// How far above/below the five lines a click still means "write a note here",
// in line spacings. 3 spacings = 6 steps of ledger territory each way; beyond
// that (e.g. on the tab stave below) a click is not note input. Exported so
// the quiet mark can sit clear of the whole band — above the highest note a
// drop could possibly write.
export const PITCH_BAND_SPACINGS = 3

/**
 * Snap a click height to a pitch, or null when the click is outside the
 * measure's writable band (or the measure has no notation stave to measure
 * against — in tab-only view there is no pitch axis to snap to).
 */
export function pitchAt(y, measureLayout) {
  const { topLineY, lineSpacing } = measureLayout
  if (topLineY == null || !lineSpacing) return null

  const margin = PITCH_BAND_SPACINGS * lineSpacing
  const bottomLineY = topLineY + 4 * lineSpacing // 5 lines = 4 spacings
  if (y < topLineY - margin || y > bottomLineY + margin) return null

  // Half a line spacing per diatonic step, measured downward from the top line.
  const stepsBelowTopLine = Math.round((y - topLineY) / (lineSpacing / 2))
  return stepToPitch(clampStep(TOP_LINE_STEP - stepsBelowTopLine))
}

/**
 * The inverse of pitchAt: the y of a pitch's notehead centre on this measure's
 * staff, or null when there is no notation stave to measure against. pitchAt
 * rounds a y to the nearest step; this maps a step back to its exact y.
 */
export function yForPitch(pitch, measureLayout) {
  const { topLineY, lineSpacing } = measureLayout
  if (topLineY == null || !lineSpacing) return null
  const stepsBelowTopLine = TOP_LINE_STEP - pitchToStep(pitch)
  return topLineY + stepsBelowTopLine * (lineSpacing / 2)
}

/**
 * The ledger strokes a notehead at this y needs: one at every full line
 * position between the staff and the note, including the note's own position
 * when it sits ON a ledger line. Returns their y values, [] for a notehead
 * inside the staff (or when there is no notation stave to measure against).
 *
 * The math works on the staff's half-spacing grid, measured in steps below
 * the top line: lines sit on EVEN steps, spaces on odd ones, and the five
 * staff lines cover steps 0..8. So a notehead above step 0 needs a ledger at
 * every even step from -2 up to its own; below step 8, at every even step
 * from 10 down to its own. (A note in the space just outside the staff —
 * step -1 or 9 — touches the outer staff line and needs no ledger.)
 */
export function ledgerLineYs(noteY, measureLayout) {
  const { topLineY, lineSpacing } = measureLayout
  if (topLineY == null || !lineSpacing) return []

  const halfSpacing = lineSpacing / 2
  const noteStep = Math.round((noteY - topLineY) / halfSpacing)
  const ys = []
  if (noteStep < 0) {
    for (let lineStep = -2; lineStep >= noteStep; lineStep -= 2) {
      ys.push(topLineY + lineStep * halfSpacing)
    }
  } else if (noteStep > 8) {
    for (let lineStep = 10; lineStep <= noteStep; lineStep += 2) {
      ys.push(topLineY + lineStep * halfSpacing)
    }
  }
  return ys
}

/**
 * Snap a drop height to a guitar string, or null when the point is not on the
 * tab stave (or there is no tab stave to measure against). The tab stave's six
 * lines ARE the strings — the top line is string 1 (high e), numbering down to
 * string 6 (low E). Unlike the notation staff there are no spaces between and
 * no ledger territory beyond: a drop more than half a line spacing outside the
 * six lines means something else, so it snaps to nothing.
 */
export function stringAt(y, measureLayout) {
  const { tabTopLineY, tabLineSpacing } = measureLayout
  if (tabTopLineY == null || !tabLineSpacing) return null

  const lineIndex = Math.round((y - tabTopLineY) / tabLineSpacing)
  if (lineIndex < 0 || lineIndex > 5) return null
  return lineIndex + 1 // lines count from 0 at the top; strings from 1
}

/** The measure whose box (x span + system band) contains the point, or null. */
export function findMeasureAt(layout, x, y) {
  const measures = layout?.measures || []
  return (
    measures.find(
      (m) => x >= m.x && x <= m.x + m.width && y >= m.hitTop && y <= m.hitBottom
    ) || null
  )
}

/**
 * The drawn note nearest the click's x, if it is within reach — vertical
 * position is deliberately ignored so a click on a tab digit selects the same
 * note as a click on its notehead. Returns { noteIndex, x } or null.
 */
export function findNoteAt(measureLayout, x) {
  let best = null
  for (const note of measureLayout.notes || []) {
    const distance = Math.abs(note.x - x)
    if (distance <= NOTE_HIT_RADIUS && (best === null || distance < best.distance)) {
      best = { note, distance }
    }
  }
  return best ? best.note : null
}

/**
 * Where a new note belongs when the click misses every drawn note: before the
 * first note whose x lies to the right of the click. Clicking left of a note
 * inserts before it; clicking after the last note appends — writing left to
 * right, like on paper.
 */
export function insertIndexForX(measureLayout, x) {
  const notes = measureLayout.notes || []
  return notes.filter((note) => note.x < x).length
}
