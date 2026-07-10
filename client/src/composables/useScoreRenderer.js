/*
 * useScoreRenderer — turns a score model into VexFlow drawing calls.
 *
 * The flow is strictly one direction: DATA → RENDER. Nothing here writes back
 * to the model, and VexFlow is never consulted as a source of truth. Given a
 * container element and a score, `renderScore` clears whatever was there and
 * draws the score fresh, so calling it again after the model changes is safe.
 *
 * Voices are ALWAYS soft (setStrict(false) + Voice.Mode.SOFT). Cadenza treats an
 * incomplete or overfull measure as a feature, not an error — strict voices
 * would throw on exactly the "wrong" measures we want to render calmly.
 *
 * For the editor, `renderScore` also RETURNS a layout report — each measure's
 * box and every note's drawn x — so clicks can be mapped back to model
 * positions (see lib/staffGeometry.js). That keeps the one-way rule honest:
 * the renderer reports where it drew things; nobody reaches into VexFlow.
 * A selected note is passed in as a render option and drawn in brass —
 * selection is view state, never written into the model.
 */
import {
  Renderer,
  Stave,
  TabStave,
  StaveNote,
  TabNote,
  Voice,
  Formatter,
  Dot,
  StaveConnector
} from 'vexflow'

import { toVexflowDuration } from '@/lib/durations'
import { noteHasTab } from '@/lib/scoreModel'

/* ---- Layout constants (all in px on VexFlow's canvas) ---------------------
 * These shape the "tidy paper" look: measures grow with their contents but
 * never below a readable minimum or past a crowded maximum.
 */
const PAGE_MARGIN = 10 // gutter around the whole system
const MIN_MEASURE_WIDTH = 120 // a one-note measure still needs room to breathe
const MAX_MEASURE_WIDTH = 520 // stop a dense measure from stretching forever
const CONTENT_PADDING = 30 // breathing room added to the notes' minimum width
const CLEF_ALLOWANCE = 40 // extra width when a measure re-states the clef (line start)
const TIME_ALLOWANCE = 26 // extra width for the time signature (very first measure)
const BARLINE_ALLOWANCE = 16 // slack for the opening barline on interior measures
const TRAILING_SPACE = 16 // gap left between the last note and the closing barline
const TAB_OFFSET = 96 // vertical drop from the notation stave to the tab stave

/**
 * Height of one system (row of measures), which depends on what's stacked in it.
 * "both" carries a notation stave and a tab stave; the single modes carry one.
 */
function systemHeight(showNotation, showTab) {
  if (showNotation && showTab) return 220
  return 130
}

/** Parse "4/4" into VexFlow's { num_beats, beat_value }, defaulting to 4/4. */
function parseTimeSignature(timeSignature) {
  const [num, den] = String(timeSignature || '4/4').split('/').map(Number)
  return {
    num_beats: Number.isFinite(num) && num > 0 ? num : 4,
    beat_value: Number.isFinite(den) && den > 0 ? den : 4
  }
}

/** A fresh soft-mode voice — the only kind Cadenza uses (see file header). */
function makeSoftVoice(timeSignature) {
  const voice = new Voice(parseTimeSignature(timeSignature))
  voice.setStrict(false)
  voice.setMode(Voice.Mode.SOFT)
  return voice
}

/** One note event → a VexFlow StaveNote for the notation stave. */
function toStaveNote(note) {
  // A rest is drawn mid-staff ('b/4'); a pitched note uses its own keys. An
  // empty pitch list (bad data) falls back to a mid-staff notehead so it still
  // draws instead of throwing.
  const keys = note.isRest || !note.pitches?.length ? ['b/4'] : note.pitches
  const staveNote = new StaveNote({
    keys,
    duration: toVexflowDuration(note.duration, note.isRest),
    clef: 'treble'
  })
  // Dots are attached as modifiers (not baked into the duration string) so the
  // glyph draws AND the note reports the right tick count for spacing.
  if (note.dotted) Dot.buildAndAttach([staveNote], { all: true })
  return staveNote
}

/**
 * One note event → a VexFlow TabNote, or null if it carries no tab data.
 * Tabs are manual: only the pitches with BOTH a string and a fret appear, and a
 * note with none is simply omitted from the tab stave (never auto-derived).
 */
function toTabNote(note) {
  if (!noteHasTab(note)) return null
  const positions = []
  note.pitches.forEach((_pitch, i) => {
    const str = note.strings?.[i]
    const fret = note.frets?.[i]
    if (str != null && fret != null) positions.push({ str, fret })
  })
  if (!positions.length) return null

  const tabNote = new TabNote({
    positions,
    duration: toVexflowDuration(note.duration, note.isRest)
  })
  if (note.dotted) Dot.buildAndAttach([tabNote], { all: true })
  return tabNote
}

/**
 * The minimum width the notes in a measure need, measured by VexFlow itself.
 * This is what makes measures density-driven: crowded measures report a larger
 * minimum and end up wider; sparse ones report less and shrink. Empty measures
 * report 0. Returns 0 when there is nothing to format.
 */
function contentMinWidth(voices) {
  if (!voices.length) return 0
  const formatter = new Formatter()
  voices.forEach((voice) => formatter.joinVoices([voice]))
  return formatter.preCalculateMinTotalWidth(voices)
}

/**
 * Final drawn width of a measure: its content minimum plus padding and whatever
 * leading glyphs it carries (clef at a line start, time signature on the very
 * first measure), clamped so every measure stays tidy.
 */
function measureWidth(minContent, { isLineStart, isFirstOverall }) {
  let width = minContent + CONTENT_PADDING + BARLINE_ALLOWANCE
  if (isLineStart) width += CLEF_ALLOWANCE
  if (isFirstOverall) width += TIME_ALLOWANCE
  return Math.max(MIN_MEASURE_WIDTH, Math.min(MAX_MEASURE_WIDTH, width))
}

/**
 * Build the per-measure plan: the VexFlow notes for each stave and the measure's
 * content minimum width. No positioning yet — that happens once we know how the
 * measures pack into rows.
 */
function planMeasures(score, { showNotation, showTab, selection, selectionInk }) {
  return (score.measures || []).map((measure, measureIndex) => {
    const notes = measure.notes || []
    const staveNotes = showNotation ? notes.map(toStaveNote) : []

    // Only notes with tab data reach the tab stave. Each entry keeps its source
    // noteIndex so a click on a tab digit can find the model note behind it.
    const tabEntries = []
    if (showTab) {
      notes.forEach((note, noteIndex) => {
        const tabNote = toTabNote(note)
        if (tabNote) tabEntries.push({ tabNote, noteIndex })
      })
    }
    const tabNotes = tabEntries.map((entry) => entry.tabNote)

    // The selected note wears brass on every stave it appears on.
    const isSelectedMeasure =
      selectionInk && selection && selection.measureIndex === measureIndex
    if (isSelectedMeasure && selection.noteIndex != null) {
      const brass = { fillStyle: selectionInk, strokeStyle: selectionInk }
      const selectedStaveNote = staveNotes[selection.noteIndex]
      if (selectedStaveNote) selectedStaveNote.setStyle(brass)
      const selectedTabEntry = tabEntries.find((entry) => entry.noteIndex === selection.noteIndex)
      if (selectedTabEntry) selectedTabEntry.tabNote.setStyle(brass)
    }

    // Measure the content with throwaway voices so we can size the measure.
    const measuringVoices = []
    if (staveNotes.length) {
      measuringVoices.push(makeSoftVoice(score.timeSignature).addTickables(staveNotes))
    }
    if (tabNotes.length) {
      measuringVoices.push(makeSoftVoice(score.timeSignature).addTickables(tabNotes))
    }

    return { measureIndex, staveNotes, tabNotes, tabEntries, minContent: contentMinWidth(measuringVoices) }
  })
}

/**
 * Pack the planned measures into rows (systems) that fit the page width, giving
 * each its x, width, and whether it starts a line. Standard engraving: every
 * line restates the clef; only the very first measure shows the time signature.
 */
function layoutRows(plans, pageWidth) {
  const usable = pageWidth - PAGE_MARGIN
  const rows = []
  let row = []
  let x = PAGE_MARGIN

  plans.forEach((plan, index) => {
    const isFirstOverall = index === 0
    const startsRow = row.length === 0
    let width = measureWidth(plan.minContent, { isLineStart: startsRow, isFirstOverall })

    // If an interior measure would overflow the line, wrap it to a new row —
    // where it becomes a line start and re-states the clef (hence re-measured).
    if (!startsRow && x + width > usable) {
      rows.push(row)
      row = []
      x = PAGE_MARGIN
      width = measureWidth(plan.minContent, { isLineStart: true, isFirstOverall })
    }

    plan.x = x
    plan.width = width
    plan.isLineStart = row.length === 0
    plan.showTimeSignature = isFirstOverall
    row.push(plan)
    x += width
  })

  if (row.length) rows.push(row)
  return rows
}

/**
 * Draw one measure's staves and voices at its planned position. Returns what
 * the editor needs for hit detection: where the notation staff's top line sits
 * (for pitch snapping) and where each note ended up (for selection).
 */
function drawMeasure(context, plan, y, score, { showNotation, showTab }) {
  let notationStave = null
  let tabStave = null

  if (showNotation) {
    notationStave = new Stave(plan.x, y, plan.width)
    if (plan.isLineStart) notationStave.addClef('treble')
    if (plan.showTimeSignature) notationStave.addTimeSignature(score.timeSignature)
    notationStave.setContext(context).draw()
  }

  if (showTab) {
    const tabY = showNotation ? y + TAB_OFFSET : y
    tabStave = new TabStave(plan.x, tabY, plan.width)
    if (plan.isLineStart) tabStave.addTabGlyph() // the "TAB" clef
    tabStave.setContext(context).draw()
  }

  // In "both" mode, tie the two staves together at the line start, the way an
  // engraver brackets a notation+tab system.
  if (notationStave && tabStave && plan.isLineStart) {
    new StaveConnector(notationStave, tabStave)
      .setType('singleLeft')
      .setContext(context)
      .draw()
  }

  // The measure's layout report. Line spacing on a VexFlow stave is 10px, and
  // the top line's y comes off the drawn stave itself.
  const layout = {
    topLineY: notationStave ? notationStave.getYForLine(0) : null,
    lineSpacing: notationStave ? notationStave.getSpacingBetweenLines() : 0,
    notes: []
  }

  // Build the real voices to draw. An empty measure has no voices — it stays an
  // empty stave, exactly as written (no auto-fill).
  const voices = []
  if (notationStave && plan.staveNotes.length) {
    voices.push({ voice: makeSoftVoice(score.timeSignature).addTickables(plan.staveNotes), stave: notationStave })
  }
  if (tabStave && plan.tabNotes.length) {
    voices.push({ voice: makeSoftVoice(score.timeSignature).addTickables(plan.tabNotes), stave: tabStave })
  }
  if (!voices.length) return layout

  // Format all of a measure's voices to the same note area so the tab frets sit
  // under their notes. Formatting is joined per-voice (not as one aligned group)
  // so a note missing from the tab stave doesn't distort the notation spacing.
  const reference = notationStave || tabStave
  // Format into the note area MINUS a trailing gap, so the last note doesn't sit
  // flush against the closing barline. Applies to both staves (they share this
  // width), so notation and tab both get the same neat right margin.
  const noteArea = reference.getNoteEndX() - reference.getNoteStartX()
  const formatWidth = Math.max(MIN_MEASURE_WIDTH / 2, noteArea - TRAILING_SPACE)
  const formatter = new Formatter()
  voices.forEach(({ voice }) => formatter.joinVoices([voice]))
  formatter.format(voices.map((v) => v.voice), formatWidth)

  voices.forEach(({ voice, stave }) => voice.draw(context, stave))

  // Note positions are only known after drawing. Prefer the notation stave
  // (every note event is on it); in tab-only mode fall back to the tab entries,
  // where a note without tab data simply has no clickable spot.
  if (plan.staveNotes.length) {
    layout.notes = plan.staveNotes.map((staveNote, noteIndex) => ({
      noteIndex,
      x: staveNote.getAbsoluteX()
    }))
  } else {
    layout.notes = plan.tabEntries.map(({ tabNote, noteIndex }) => ({
      noteIndex,
      x: tabNote.getAbsoluteX()
    }))
  }
  return layout
}

/**
 * Read a CSS custom property off the container's computed style, trying each
 * name until one resolves to a literal value. Needed because some tokens are
 * aliases (var → var → hex) and a browser may hand the var() text back
 * unresolved — the later names are the alias's plain-hex targets.
 */
function resolveToken(styles, ...names) {
  for (const name of names) {
    const value = styles.getPropertyValue(name).trim()
    if (value && !value.startsWith('var(')) return value
  }
  return ''
}

/**
 * The composable. Returns `renderScore(container, score, options)`.
 *   container — a DOM element to draw into (its contents are replaced)
 *   score     — the score model (source of truth)
 *   options.pageWidth — width to wrap systems at (default 680)
 *   options.selection — { measureIndex, noteIndex } to draw in brass, or null
 *
 * Returns the layout report: { pageWidth, measures: [{ measureIndex, x, width,
 * hitTop, hitBottom, topLineY, lineSpacing, notes: [{ noteIndex, x }] }] }.
 */
export function useScoreRenderer() {
  function renderScore(container, score, options = {}) {
    if (!container || !score) return null

    // One direction only: wipe the previous SVG before drawing the new state.
    container.innerHTML = ''

    const mode = score.displayMode || 'both'
    const showNotation = mode === 'notation' || mode === 'both'
    const showTab = mode === 'tab' || mode === 'both'
    const pageWidth = options.pageWidth || 680

    // Resolve the page's colours up front — the ink for drawing, and the brass
    // for the selected note (applied while planning, before anything draws).
    const styles = getComputedStyle(container)
    const ink = styles.color
    const paper = resolveToken(styles, '--surface-card', '--paper-white')
    const selectionInk = resolveToken(styles, '--accent-brass', '--brass-600')

    const plans = planMeasures(score, {
      showNotation,
      showTab,
      selection: options.selection || null,
      selectionInk
    })
    const rows = layoutRows(plans, pageWidth)

    const rowHeight = systemHeight(showNotation, showTab)
    const totalHeight = PAGE_MARGIN * 2 + Math.max(1, rows.length) * rowHeight

    const renderer = new Renderer(container, Renderer.Backends.SVG)
    renderer.resize(pageWidth, totalHeight)
    const context = renderer.getContext()

    // Draw in the page's engraving ink rather than VexFlow's default black. We
    // read the resolved colour off the container (ScoreCanvas pins it to
    // --text-primary) so glyphs stay filled and staff lines stroked correctly —
    // no blunt CSS override needed.
    if (ink) {
      context.setFillStyle(ink)
      context.setStrokeStyle(ink)
    }

    // Tab fret numbers clear a little rectangle behind themselves so the string
    // line doesn't run through the digit. VexFlow fills that with white by
    // default, which reads as a white box on the ivory paper — set it to the
    // paper colour instead so the break is invisible but still there.
    if (paper) context.setBackgroundFillStyle(paper)

    // Draw, collecting each measure's layout for the editor's hit detection.
    // hitTop/hitBottom span the whole system band so a click on the tab stave
    // still lands in the right measure.
    const layout = { pageWidth, measures: [] }
    rows.forEach((row, rowIndex) => {
      const y = PAGE_MARGIN + rowIndex * rowHeight
      row.forEach((plan) => {
        const drawn = drawMeasure(context, plan, y, score, { showNotation, showTab })
        layout.measures.push({
          measureIndex: plan.measureIndex,
          x: plan.x,
          width: plan.width,
          hitTop: y,
          hitBottom: y + rowHeight,
          topLineY: drawn.topLineY,
          lineSpacing: drawn.lineSpacing,
          notes: drawn.notes
        })
      })
    })
    return layout
  }

  return { renderScore }
}
