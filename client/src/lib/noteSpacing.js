/*
 * noteSpacing.js — the horizontal engraving rule: how much room each figure
 * reserves before the next one. Pure functions, no Vue, no VexFlow.
 *
 * The rule (Mario's): the space after a figure depends on the figure alone,
 * so the same figures always read the same on the page. A longer note gets
 * visibly more room — a hint of the length of its sound — but never
 * proportionally more: a whole note is thirty-two times a thirty-second in
 * time, roughly three times in space. Each halving of duration takes off
 * about a fifth of the room.
 */

// Room (px) a figure reserves from its own position to the next figure's.
// Rests use the same table: a rest of a length takes the room of its note.
export const FIGURE_SPACE = {
  w: 58,
  h: 46,
  q: 36,
  8: 28,
  16: 22,
  32: 18
}

// A dot lengthens the sound by half, and its room grows to match: a dotted
// figure reserves 1.5× its base room, so it reads as clearly longer than the
// plain figure.
const DOT_FACTOR = 1.5

// Room the LAST figure needs for its own glyph — after it comes only the
// measure's trailing gap, so its table entry (which reserves room up to a
// NEXT figure) doesn't apply.
export const FIGURE_ROOM = 14

/** The room one note or rest reserves before the next figure. */
export function noteSpace(note) {
  const base = FIGURE_SPACE[note.duration] ?? FIGURE_SPACE.q
  return note.dotted ? base * DOT_FACTOR : base
}

/**
 * The horizontal plan for one measure's figures: where each sits, relative
 * to the first one, and the total width the row of figures needs.
 *   offsets[i]   — x of figure i, measured from figure 0
 *   contentWidth — offsets of the last figure plus its own glyph's room
 * An empty measure plans nothing: { offsets: [], contentWidth: 0 }.
 */
export function spacingPlan(notes = []) {
  const offsets = []
  let x = 0
  for (const note of notes) {
    offsets.push(x)
    x += noteSpace(note)
  }
  const contentWidth = offsets.length ? offsets[offsets.length - 1] + FIGURE_ROOM : 0
  return { offsets, contentWidth }
}
