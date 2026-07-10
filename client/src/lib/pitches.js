/*
 * pitches.js — arithmetic over written pitches. Pure functions, no Vue, no
 * VexFlow: like durations.js, everything here is testable and explainable in
 * isolation.
 *
 * NOTATION MATH (diatonic steps)
 * ------------------------------
 * A written pitch like "g/4" names a POSITION on the staff, not a frequency.
 * Staff positions move by letter — c d e f g a b, then c of the next octave —
 * one letter per line-or-space. So every position gets a whole-number "step
 * index": octave × 7 + the letter's place in that cycle. Moving up one
 * line-or-space is exactly +1 step, which makes "transpose up", "snap a click
 * to a position" and "clamp to a sane range" all plain integer math.
 *
 * Accidentals (sharps/flats) are not part of 4b and never appear here.
 */

// The letter cycle, in staff order starting at c (octaves change at c).
export const PITCH_LETTERS = ['c', 'd', 'e', 'f', 'g', 'a', 'b']

/*
 * The range the editor lets you write in, as steps. Generous for guitar:
 * c/3 is well below the written low E (e/3), c/7 far above the 24th fret on
 * the top string. Clamping here keeps arrow-key transposing and click
 * snapping from wandering off into absurd ledger-line territory.
 */
export const MIN_STEP = pitchToStep('c/3')
export const MAX_STEP = pitchToStep('c/7')

/**
 * "g/4" → step index (octave × 7 + letter position). Returns null for
 * anything malformed so callers can bail without try/catch.
 */
export function pitchToStep(pitch) {
  const [letter, octaveRaw] = String(pitch || '').toLowerCase().split('/')
  const letterIndex = PITCH_LETTERS.indexOf(letter)
  const octave = Number(octaveRaw)
  if (letterIndex === -1 || !Number.isInteger(octave)) return null
  return octave * 7 + letterIndex
}

/** Step index → "letter/octave". The inverse of pitchToStep. */
export function stepToPitch(step) {
  const octave = Math.floor(step / 7)
  const letterIndex = step - octave * 7
  return `${PITCH_LETTERS[letterIndex]}/${octave}`
}

/** Keep a step inside the editor's writable range. */
export function clampStep(step) {
  return Math.max(MIN_STEP, Math.min(MAX_STEP, step))
}

/**
 * Move a pitch by `delta` staff positions (+1 = one line-or-space up), clamped
 * to the writable range. ±7 is an octave. Malformed pitches come back as-is.
 */
export function shiftPitch(pitch, delta) {
  const step = pitchToStep(pitch)
  if (step === null) return pitch
  return stepToPitch(clampStep(step + delta))
}

/**
 * Re-letter a pitch, keeping it as close as possible to where it already sits:
 * typing "c" while on g/4 gives c/5 (3 steps up), not c/4 (4 steps down).
 * Checks the letter in the octave below, same, and above, and takes the
 * candidate the fewest steps away; on a tie (the letter 3½ octave-steps away
 * both ways is impossible with 7 letters, but distance ties happen at ±3/±4
 * boundaries) the higher one wins, matching the "keep writing upward" habit.
 */
export function setPitchLetter(pitch, letter) {
  const current = pitchToStep(pitch)
  const letterIndex = PITCH_LETTERS.indexOf(String(letter).toLowerCase())
  if (current === null || letterIndex === -1) return pitch

  const octave = Math.floor(current / 7)
  let best = null
  for (const candidateOctave of [octave - 1, octave, octave + 1]) {
    const candidate = candidateOctave * 7 + letterIndex
    if (candidate < MIN_STEP || candidate > MAX_STEP) continue
    const distance = Math.abs(candidate - current)
    // `>=` so the later (higher) candidate takes a tie.
    if (best === null || best.distance >= distance) best = { candidate, distance }
  }
  return best ? stepToPitch(best.candidate) : pitch
}
