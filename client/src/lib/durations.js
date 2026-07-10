/*
 * durations.js — the arithmetic of note durations. Pure functions, no Vue, no
 * VexFlow: everything here can be unit-tested in isolation and explained on its
 * own.
 *
 * NOTATION MATH (ticks)
 * ---------------------
 * We measure every duration in abstract "ticks" so we can add them up and
 * compare a measure against its time signature (for the future quiet mark).
 * The unit is arbitrary but must divide cleanly, so we anchor a WHOLE note at
 * 4096 ticks: that makes a quarter 1024, an eighth 512, and so on — always
 * whole numbers, even for a dotted note (×1.5) because 4096 is divisible by 3.
 */
export const WHOLE_NOTE_TICKS = 4096

// The durations Cadenza offers, longest first. `code` is what we store in the
// score model; VexFlow happens to use the same letters, so rendering just needs
// a rest suffix (see toVexflowDuration). `label` is for UI later.
export const DURATIONS = [
  { code: 'w', label: 'Whole', ticks: WHOLE_NOTE_TICKS },
  { code: 'h', label: 'Half', ticks: WHOLE_NOTE_TICKS / 2 },
  { code: 'q', label: 'Quarter', ticks: WHOLE_NOTE_TICKS / 4 },
  { code: '8', label: 'Eighth', ticks: WHOLE_NOTE_TICKS / 8 },
  { code: '16', label: 'Sixteenth', ticks: WHOLE_NOTE_TICKS / 16 },
  { code: '32', label: 'Thirty-second', ticks: WHOLE_NOTE_TICKS / 32 }
]

// Fast lookup from a duration code to its base (undotted) tick count.
const TICKS_BY_CODE = Object.fromEntries(DURATIONS.map((d) => [d.code, d.ticks]))

// The drag-and-drop payload type for a figure dragged from the toolbar onto
// the manuscript. A custom type means a stray drag (text, a file) never looks
// like note input; the payload itself is the duration code above.
export const FIGURE_DRAG_TYPE = 'application/x-cadenza-figure'

/**
 * Ticks for a single note or rest. A dot adds half the base value again
 * (a dotted quarter = quarter + eighth = 1.5 quarters), which is why the base
 * tick counts are all divisible by 2.
 * Returns 0 for an unknown duration code so bad data never throws here.
 */
export function durationToTicks(duration, dotted = false) {
  const base = TICKS_BY_CODE[duration]
  if (base === undefined) return 0
  return dotted ? base + base / 2 : base
}

/**
 * How many ticks a full measure holds under a given time signature.
 * "num/den" means `num` beats, each worth a 1/den note. So a beat is worth
 * WHOLE / den ticks, and the measure holds num of them. (4/4 → 4096, 6/8 → 3072.)
 * Falls back to a 4/4 measure if the signature is malformed.
 */
export function measureCapacityTicks(timeSignature = '4/4') {
  const [numRaw, denRaw] = String(timeSignature).split('/')
  const num = Number(numRaw)
  const den = Number(denRaw)
  if (!Number.isFinite(num) || !Number.isFinite(den) || num <= 0 || den <= 0) {
    return WHOLE_NOTE_TICKS
  }
  return num * (WHOLE_NOTE_TICKS / den)
}

/**
 * Translate a stored duration into the string VexFlow wants. The letters match
 * ours; a rest is the same letter with an 'r' suffix ('qr', '8r', …). Dots are
 * NOT encoded here — we attach a Dot modifier at render time so the glyph draws
 * and the note still counts its own ticks.
 */
export function toVexflowDuration(duration, isRest = false) {
  return isRest ? `${duration}r` : duration
}
