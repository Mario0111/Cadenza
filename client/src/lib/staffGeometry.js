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
// that (e.g. on the tab stave below) a click is not note input.
const PITCH_BAND_SPACINGS = 3

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
