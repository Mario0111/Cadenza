/*
 * scoreModel.js — helpers over the score data model. Pure functions, no Vue and
 * no VexFlow imports, so the shape of a score is defined and testable in one
 * place. The model IS the source of truth; VexFlow only ever renders it.
 *
 * A note event (see CLAUDE.md) looks like:
 *   { pitches, duration, dotted, isRest, strings, frets, leftFinger, rightFinger }
 * Tabs are manual and per-pitch: `strings`/`frets` are nullable and never
 * derived from the pitches. A note with no fret data simply won't appear on the
 * tab stave.
 */
import { durationToTicks, measureCapacityTicks } from './durations'

/**
 * Build a note event with the model's defaults, overriding any fields you pass.
 * Kept explicit (rather than a spread of unknown shape) so the canonical fields
 * are visible and every note we create is complete.
 */
export function createNote(overrides = {}) {
  return {
    pitches: ['e/4'], // array so a note can be a chord; ignored when isRest
    duration: 'q',
    dotted: false,
    isRest: false,
    beamed: false, // set BY HAND; adjacent flagged eighths-or-shorter share a beam
    slurred: false, // set BY HAND; adjacent flagged notes share one slur
    harmonic: false, // set BY HAND; circle above the note, brackets round the fret
    strings: [null], // per-pitch, nullable — tabs are entered by hand
    frets: [null],
    leftFinger: null, // 1..4 | null
    rightFinger: null, // 'p' | 'i' | 'm' | 'a' | null
    ...overrides
  }
}

/** An empty measure. Empty measures are legal and stay empty (no auto-fill). */
export function createMeasure(overrides = {}) {
  return { notes: [], ...overrides }
}

/** A blank score matching the backend Score model's defaults. */
export function createScore(overrides = {}) {
  return {
    title: 'Untitled score',
    description: '',
    bpm: null, // beats per minute — the engraved tempo, optional
    composer: '', // the engraved credit on the sheet's right, optional
    timeSignature: '4/4',
    keySignature: 'C',
    displayMode: 'both', // 'notation' | 'tab' | 'both'
    measures: [createMeasure()],
    ...overrides
  }
}

/**
 * The next note's defaults after `prevNote`: same duration and dot as the last
 * note entered (a paper-like convenience — you keep writing quarters until you
 * change). Everything else resets to a fresh note. With no previous note, this
 * is just a default note.
 */
export function defaultNextNote(prevNote = null) {
  if (!prevNote) return createNote()
  return createNote({ duration: prevNote.duration, dotted: prevNote.dotted })
}

/**
 * True for a TAB-ONLY note: no pitches written, not a rest. Such a note lives
 * on the tab stave alone — the mirror of a pitched note without tab data,
 * which lives on the notation stave alone. Which staves show an event is
 * always derived from what data it carries; nothing is ever converted.
 */
export function isTabOnly(note) {
  if (!note || note.isRest) return false
  return !note.pitches || note.pitches.length === 0
}

// The durations short enough to carry a flag — and therefore a beam.
const BEAMABLE_DURATIONS = ['8', '16', '32']

/**
 * True when a note can sit under a beam: an eighth or shorter, with a stem on
 * the notation stave (a beam is a notation mark — rests have no stem, and a
 * tab-only note never appears there). The `beamed` flag itself is manual;
 * this only says whether the flag can mean anything.
 */
export function isBeamable(note) {
  if (!note || note.isRest || isTabOnly(note)) return false
  return BEAMABLE_DURATIONS.includes(note.duration)
}

/**
 * True when a note can sit under a slur: any pitched note with a notehead on
 * the notation stave (not a rest, not tab-only). Unlike a beam, a slur has no
 * duration limit — it arcs over a phrase of notes of any length. The `slurred`
 * flag is manual; this only says whether the flag can mean anything.
 */
export function isSlurrable(note) {
  if (!note || note.isRest || isTabOnly(note)) return false
  return true
}

/**
 * True when a note can sound a harmonic: anything that sounds — a pitched note
 * or a tab-only note, but not a rest (nothing rings there). The `harmonic`
 * flag itself is manual; this only says whether the flag can mean anything.
 */
export function isHarmonicable(note) {
  if (!note || note.isRest) return false
  return true
}

/** True when a note carries any tab data — at least one string+fret pair set. */
export function noteHasTab(note) {
  if (!note || note.isRest) return false
  const strings = note.strings || []
  const frets = note.frets || []
  return strings.some((str, i) => str != null && frets[i] != null)
}

/**
 * Total ticks currently used by a measure's NOTATION content (pitched notes
 * and rests). Tab-only notes are left out on purpose: the quiet mark observes
 * the notation stave's rhythm against the time signature, and a note that
 * lives on the tab stave alone is outside that arithmetic — a measure holding
 * nothing but tab reads as empty here, and empty is never marked.
 */
export function measureTicks(measure) {
  const notes = measure?.notes || []
  return notes.reduce(
    (sum, note) =>
      isTabOnly(note) ? sum : sum + durationToTicks(note.duration, note.dotted),
    0
  )
}

/**
 * Compare a measure's contents against its time signature — the raw material for
 * the quiet mark (built later, in 4c). Returns used/capacity ticks and a state:
 *   'empty'   — nothing written yet
 *   'partial' — a beat short
 *   'exact'   — adds up perfectly
 *   'over'    — overfull
 * This only observes; it never changes the measure. Being "wrong" is allowed.
 */
export function measureFullness(measure, timeSignature) {
  const used = measureTicks(measure)
  const capacity = measureCapacityTicks(timeSignature)

  let state = 'partial'
  if (used === 0) state = 'empty'
  else if (used === capacity) state = 'exact'
  else if (used > capacity) state = 'over'

  return { used, capacity, state }
}
