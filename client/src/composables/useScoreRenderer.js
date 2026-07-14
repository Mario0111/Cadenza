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
  GhostNote,
  Voice,
  Formatter,
  Beam,
  Curve,
  Dot,
  StaveConnector,
  FretHandFinger,
  Annotation,
  Articulation,
  Modifier
} from 'vexflow'

import { toVexflowDuration } from '@/lib/durations'
import { noteHasTab, isTabOnly, isBeamable, isSlurrable } from '@/lib/scoreModel'
import { spacingPlan } from '@/lib/noteSpacing'

/* ---- Layout constants (all in px on VexFlow's canvas) ---------------------
 * These shape the "tidy paper" look: measures grow with their contents but
 * never below a readable minimum or past a crowded maximum.
 */
const PAGE_MARGIN = 10 // gutter around the whole system
const MIN_MEASURE_WIDTH = 60 // an empty measure still keeps a droppable spot
const MAX_MEASURE_WIDTH = 520 // stop a dense measure from stretching forever
const CLEF_ALLOWANCE = 36 // extra width when a measure re-states the clef (line start)
const TIME_ALLOWANCE = 25 // extra width for the time signature (very first measure)
const BARLINE_ALLOWANCE = 16 // room the opening barline takes before the first note
const TRAILING_SPACE = 16 // gap after the last figure — the same as the lead-in,
// so the last figure sits as far from its barline as the first does from its own
const TAB_OFFSET = 110 // vertical drop from the notation stave to the tab stave

/*
 * Extra room above every notation stave for ledger-line territory. VexFlow
 * itself only reserves 4 line spacings (40px) above the top line, but the
 * editor's writable range goes up to c/7 — 11 staff steps above the top line,
 * i.e. 55px — so without this the highest notes are drawn off the top of the
 * row. 30px of headroom brings the total to 70px, enough for c/7's notehead.
 * The floor needs room too: c/3 sits 45px below the bottom line, and a
 * right-hand fingering annotation can hang another ~25px under that — the
 * row heights below leave space for both.
 */
const STAFF_HEADROOM = 30

/**
 * Height of one system (row of measures), which depends on what's stacked in it.
 * "both" carries a notation stave and a tab stave; the single modes carry one.
 * Rows with a notation stave include its ledger headroom.
 *
 * Notation-only rows sit as tight as the tab rows (Mario's call — anything
 * more read as too airy). That spends the whole safety margin: an extreme low
 * note (or one wearing a right-hand annotation) will reach into the next
 * system's ledger territory, colliding only if that system climbs high at the
 * same spot. A deliberate trade of margin for a page that reads like a page.
 */
function systemHeight(showNotation, showTab) {
  if (showNotation && showTab) return 264
  if (showNotation) return 130
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
    clef: 'treble',
    // Standard engraving: notes above the middle line take a down-stem.
    // Without this VexFlow stems everything up, and a high note's stem
    // climbs past the row's headroom.
    auto_stem: true
  })
  // Dots are attached as modifiers (not baked into the duration string) so the
  // glyph draws AND the note reports the right tick count for spacing.
  if (note.dotted) Dot.buildAndAttach([staveNote], { all: true })

  // Fingering, classical-guitar style — both optional, both manual, rests
  // carry none. Left hand (1–4) sits beside the notehead as a FretHandFinger;
  // right hand (p/i/m/a) hangs below the note as an italic Annotation.
  if (!note.isRest && note.leftFinger != null) {
    staveNote.addModifier(
      new FretHandFinger(String(note.leftFinger)).setPosition(Modifier.Position.LEFT),
      0
    )
  }
  if (!note.isRest && note.rightFinger) {
    const annotation = new Annotation(note.rightFinger)
      .setFont('EB Garamond', 12, 'normal', 'italic')
      .setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
    staveNote.addModifier(annotation, 0)
  }

  // A harmonic wears the engraved mark: a small circle above the note —
  // VexFlow's 'ah' articulation, the standard natural-harmonic sign. Manual,
  // like beams and slurs: only the flag draws it.
  if (!note.isRest && note.harmonic) {
    staveNote.addModifier(
      new Articulation('ah').setPosition(Modifier.Position.ABOVE),
      0
    )
  }
  return staveNote
}

/**
 * One note event → a VexFlow TabNote, or null if it carries no tab data.
 * Tabs are manual: only the entries with BOTH a string and a fret appear, and a
 * note with none is simply omitted from the tab stave (never auto-derived).
 * Built from strings[] (not pitches[]) so a tab-only note — which has no
 * pitches at all — still gets its digit.
 */
function toTabNote(note) {
  if (!noteHasTab(note)) return null
  const positions = []
  ;(note.strings || []).forEach((str, i) => {
    const fret = note.frets?.[i]
    if (str != null && fret != null) {
      // A harmonic's fret wears the conventional angle brackets — "<12>".
      // TabNote draws whatever text it's given, so the brackets are pure
      // presentation; the model keeps the plain number.
      positions.push({ str, fret: note.harmonic ? `<${fret}>` : fret })
    }
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
 * An invisible tickable holding one event's time on a stave where it has
 * nothing to draw. Both staves' voices must run on the same clock for an
 * event's notehead and tab digit to land in the same column — a skipped event
 * would shift everything after it, so its time is held instead.
 */
function makeGhost(note) {
  const ghost = new GhostNote({ duration: toVexflowDuration(note.duration, false) })
  // Same dot handling as the visible notes, so the tick math stays identical
  // across voices (the ghost never draws, dot included).
  if (note.dotted) Dot.buildAndAttach([ghost], { all: true })
  return ghost
}

/**
 * Final drawn width of a measure: exactly what its figures need under the
 * engraving rule (see lib/noteSpacing.js), plus whatever leading glyphs it
 * carries (clef at a line start, time signature on the very first measure)
 * and the trailing gap before the closing barline. Measures hug their
 * figures — no room is added for them to spread into.
 */
function measureWidth(contentWidth, { isLineStart, isFirstOverall }) {
  let width = contentWidth + BARLINE_ALLOWANCE + TRAILING_SPACE
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

    // Each stave's voice covers EVERY event: drawable ones as real notes,
    // the rest as invisible ghosts holding their time (a tab-only note on the
    // notation stave; a tab-less note or a rest on the tab stave). The voices
    // therefore share one clock, and the formatter puts an event's notehead
    // and tab digit in the same column. The entries lists keep only the drawn
    // notes, with their source noteIndex, for selection and hit reporting.
    const staveEntries = []
    const staveNotes = []
    if (showNotation) {
      notes.forEach((note, noteIndex) => {
        if (isTabOnly(note)) {
          staveNotes.push(makeGhost(note))
          return
        }
        const staveNote = toStaveNote(note)
        staveEntries.push({ staveNote, noteIndex })
        staveNotes.push(staveNote)
      })
    }

    const tabEntries = []
    const tabNotes = []
    if (showTab) {
      notes.forEach((note, noteIndex) => {
        const tabNote = toTabNote(note)
        if (!tabNote) {
          tabNotes.push(makeGhost(note))
          return
        }
        tabEntries.push({ tabNote, noteIndex })
        tabNotes.push(tabNote)
      })
    }

    // The selected note wears brass on every stave it appears on.
    const isSelectedMeasure =
      selectionInk && selection && selection.measureIndex === measureIndex
    if (isSelectedMeasure && selection.noteIndex != null) {
      const brass = { fillStyle: selectionInk, strokeStyle: selectionInk }
      const selectedStaveEntry = staveEntries.find((entry) => entry.noteIndex === selection.noteIndex)
      if (selectedStaveEntry) selectedStaveEntry.staveNote.setStyle(brass)
      const selectedTabEntry = tabEntries.find((entry) => entry.noteIndex === selection.noteIndex)
      if (selectedTabEntry) selectedTabEntry.tabNote.setStyle(brass)
    }

    return {
      measureIndex,
      staveEntries,
      staveNotes,
      tabEntries,
      tabNotes,
      // The engraving rule's plan: each event's fixed offset and the total
      // width the figures need (see lib/noteSpacing.js).
      spacing: spacingPlan(notes)
    }
  })
}

/**
 * Pack the planned measures into rows (systems) that fit the page width, giving
 * each its x, width, and whether it starts a line. Standard engraving: every
 * line restates the clef; only the very first measure shows the time signature.
 *
 * Rows keep their natural width — measures hug their figures, and a line ends
 * where its music ends (Mario's call, replacing the earlier justified right
 * edge: stretching rows to the margin put blank space back between the
 * figures, which is exactly what measure-hugging is for).
 */
function layoutRows(plans, pageWidth) {
  const usable = pageWidth - PAGE_MARGIN
  const rows = []
  let row = []
  let x = PAGE_MARGIN

  plans.forEach((plan, index) => {
    const isFirstOverall = index === 0
    const startsRow = row.length === 0
    let width = measureWidth(plan.spacing.contentWidth, { isLineStart: startsRow, isFirstOverall })

    // If an interior measure would overflow the line, wrap it to a new row —
    // where it becomes a line start and re-states the clef (hence re-measured).
    if (!startsRow && x + width > usable) {
      rows.push(row)
      row = []
      x = PAGE_MARGIN
      width = measureWidth(plan.spacing.contentWidth, { isLineStart: true, isFirstOverall })
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
 * Group a measure's drawn notation notes into maximal runs of ADJACENT notes
 * that all pass `flagged` — the shape both beams and slurs need. "Adjacent"
 * means consecutive noteIndexes, so anything between two flagged notes that
 * has no notehead here — a rest, an unflagged note, a tab-only event (which
 * isn't a staveEntry at all) — breaks the run. Each run is an array of
 * StaveNotes in written order; runs shorter than two are dropped, since a beam
 * or a slur needs at least two notes.
 */
function adjacentRuns(staveEntries, notes, flagged) {
  const runs = []
  let run = []
  let lastIndex = null
  const close = () => {
    if (run.length > 1) runs.push(run)
    run = []
  }
  for (const { staveNote, noteIndex } of staveEntries) {
    const note = notes[noteIndex]
    if (!note || !flagged(note)) {
      close()
    } else {
      if (run.length && noteIndex !== lastIndex + 1) close()
      run.push(staveNote)
    }
    lastIndex = noteIndex
  }
  close()
  return runs
}

/**
 * Pull every augmentation dot back onto its notehead's own line. VexFlow's
 * format pass lifts a dot half a space when the note sits ON a line (so the
 * staff line doesn't run through the dot), which reads as the dot floating
 * above the note. Mario's call: keep the dot centred on the note — on the line
 * when the note is on a line, in the space otherwise. dot_shiftY is written
 * during formatting, so this runs after format and before draw, zeroing the
 * vertical shift the formatter added.
 */
function centerDots(staveNotes) {
  for (const staveNote of staveNotes) {
    for (const dot of staveNote.getModifiersByType('Dot')) {
      dot.setDotShiftY(0)
    }
  }
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
    // The stave sits below its ledger headroom so high notes stay on the page.
    notationStave = new Stave(plan.x, y + STAFF_HEADROOM, plan.width)
    if (plan.isLineStart) notationStave.addClef('treble')
    if (plan.showTimeSignature) notationStave.addTimeSignature(score.timeSignature)
    notationStave.setContext(context).draw()
  }

  if (showTab) {
    // Tab has no ledger territory of its own; alone it needs no headroom.
    const tabY = showNotation ? y + STAFF_HEADROOM + TAB_OFFSET : y
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

  // A note's drawn x is its column PLUS its own stave's note-start x — and the
  // two staves' starts differ (treble clef and time signature take more room
  // than the TAB badge). Give both staves the later start, or every tab digit
  // sits left of its notehead by exactly that difference.
  if (notationStave && tabStave) {
    const sharedStart = Math.max(notationStave.getNoteStartX(), tabStave.getNoteStartX())
    notationStave.setNoteStartX(sharedStart)
    tabStave.setNoteStartX(sharedStart)
  }

  // The measure's layout report. Line spacing on a VexFlow stave is 10px, and
  // the top line's y comes off the drawn stave itself. The tab stave's line
  // geometry rides along too: its six lines ARE the strings, so a drop can be
  // snapped to one (see stringAt in staffGeometry.js).
  const layout = {
    topLineY: notationStave ? notationStave.getYForLine(0) : null,
    lineSpacing: notationStave ? notationStave.getSpacingBetweenLines() : 0,
    tabTopLineY: tabStave ? tabStave.getYForLine(0) : null,
    tabLineSpacing: tabStave ? tabStave.getSpacingBetweenLines() : 0,
    notes: []
  }

  // Build the real voices to draw. An empty measure has no voices — it stays an
  // empty stave, exactly as written (no auto-fill) — and a stave with nothing
  // visible on it (only ghosts) is skipped the same way.
  const voices = []
  if (notationStave && plan.staveEntries.length) {
    voices.push({ voice: makeSoftVoice(score.timeSignature).addTickables(plan.staveNotes), stave: notationStave })
  }
  if (tabStave && plan.tabEntries.length) {
    voices.push({ voice: makeSoftVoice(score.timeSignature).addTickables(plan.tabNotes), stave: tabStave })
  }
  if (!voices.length) return layout

  // Format all of a measure's voices to the same note area so the tab frets sit
  // under their notes. Because ghosts keep both voices on one clock (see
  // planMeasures), the formatter lands every event's notehead and tab digit in
  // the same column — a note absent from one stave leaves a gap there instead
  // of letting the columns drift apart.
  // Beams and slurs — both manual, both read straight from the notes' flags,
  // both drawn over a maximal run of ADJACENT flagged notes (see adjacentRuns).
  // A beam joins the stems of eighths-or-shorter; a slur arcs one curve from
  // the first note of its run to the last. Built here; drawn after the voices,
  // the way VexFlow wants. Nothing is ever beamed or slurred automatically.
  const measureNotes = score.measures[plan.measureIndex]?.notes || []
  const beams = adjacentRuns(
    plan.staveEntries,
    measureNotes,
    (note) => note.beamed && isBeamable(note)
  ).map((notes) => new Beam(notes, true))
  const slurs = adjacentRuns(
    plan.staveEntries,
    measureNotes,
    (note) => note.slurred && isSlurrable(note)
  ).map((notes) => new Curve(notes[0], notes[notes.length - 1]))

  const formatter = new Formatter()
  voices.forEach(({ voice }) => formatter.joinVoices([voice]))
  formatter.format(voices.map((v) => v.voice), Math.max(10, plan.spacing.contentWidth))

  // Formatting decided the dots' vertical shift; re-centre them on their notes.
  centerDots(plan.staveEntries.map((entry) => entry.staveNote))

  /*
   * The engraving rule takes over the horizontal. The formatter above did two
   * jobs we keep — aligning both staves' voices onto shared tick contexts and
   * laying out each note's modifiers — but its spacing is proportional and
   * context-dependent, and the rule wants FIXED room per figure (see
   * lib/noteSpacing.js). So each event's tick context is moved to its planned
   * offset from the first event, which stays where the formatter put it, just
   * after the barline (or clef). A context is shared by an event's notehead
   * and tab digit, so both staves move together and stay in column. If the
   * measure hit the width cap, the offsets squeeze proportionally — figures
   * keep their relative spacing.
   */
  const tickables = voices[0].voice.getTickables()
  if (tickables.length) {
    const leading =
      BARLINE_ALLOWANCE +
      (plan.isLineStart ? CLEF_ALLOWANCE : 0) +
      (plan.showTimeSignature ? TIME_ALLOWANCE : 0)
    const budget = plan.width - leading - TRAILING_SPACE
    const scale =
      plan.spacing.contentWidth > budget ? budget / plan.spacing.contentWidth : 1
    const baseX = tickables[0].getTickContext().getX()
    tickables.forEach((tickable, i) => {
      tickable.getTickContext().setX(baseX + plan.spacing.offsets[i] * scale)
    })
  }

  voices.forEach(({ voice, stave }) => voice.draw(context, stave))
  beams.forEach((beam) => beam.setContext(context).draw())
  slurs.forEach((slur) => slur.setContext(context).draw())

  // Note positions are only known after drawing. Each note's x comes from
  // whichever stave drew it, preferring the notation stave when it is on both
  // (writing the stave entries second lets them overwrite the tab x). A note
  // on neither visible stave simply has no clickable spot.
  const xByNoteIndex = new Map()
  plan.tabEntries.forEach(({ tabNote, noteIndex }) => {
    xByNoteIndex.set(noteIndex, tabNote.getAbsoluteX())
  })
  plan.staveEntries.forEach(({ staveNote, noteIndex }) => {
    xByNoteIndex.set(noteIndex, staveNote.getAbsoluteX())
  })
  layout.notes = [...xByNoteIndex.entries()]
    .map(([noteIndex, x]) => ({ noteIndex, x }))
    .sort((a, b) => a.noteIndex - b.noteIndex)
  return layout
}

/*
 * How much air is left between a tab string line and the digit sitting on it.
 * VexFlow's own masking box is a generous 2px per side; this brings the line
 * up so it just touches the number without running through it.
 */
const TAB_DIGIT_GAP = 0.5

/**
 * Tighten the masking boxes behind the tab digits. VexFlow clears a box in
 * the background colour behind every fret number so the string line doesn't
 * strike through it, but makes it 2px wider than the glyph on each side —
 * which reads as a hole in the line rather than a digit resting on it. The
 * digits' drawn widths are only known after rendering, so this is a small
 * post-draw pass: find each mask (the only rects carrying the background
 * fill; each sits right before its digit's <text>) and shrink it to the digit
 * plus TAB_DIGIT_GAP. Presentation polish only — the model is never touched.
 */
function tightenTabMasks(container, paper) {
  if (!paper) return
  const svg = container.querySelector('svg')
  if (!svg) return
  for (const mask of svg.querySelectorAll(`rect[fill="${paper}"]`)) {
    const text = mask.nextElementSibling
    if (!text || text.tagName !== 'text') continue
    const digitBox = text.getBBox()
    mask.setAttribute('x', digitBox.x - TAB_DIGIT_GAP)
    mask.setAttribute('width', digitBox.width + TAB_DIGIT_GAP * 2)
  }
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
 * hitTop, hitBottom, topLineY, lineSpacing, tabTopLineY, tabLineSpacing,
 * notes: [{ noteIndex, x }] }] }.
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
          tabTopLineY: drawn.tabTopLineY,
          tabLineSpacing: drawn.tabLineSpacing,
          notes: drawn.notes
        })
      })
    })

    // With everything drawn (digit widths are only known now), pull the tab
    // string lines up to their numbers.
    if (showTab) tightenTabMasks(container, paper)

    return layout
  }

  return { renderScore }
}
