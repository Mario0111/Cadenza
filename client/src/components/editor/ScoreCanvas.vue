<script setup>
// ScoreCanvas — the rendering of one score model. It owns a plain container
// element and hands it to the VexFlow renderer; when the score, the selection
// or the displayMode changes, it re-renders. The component never mutates the
// model: in interactive mode it only TRANSLATES gestures into events (a click
// selects a note; a figure dragged from the toolbar and dropped on the staff
// adds one) and lets the owner decide what to do, keeping data → render
// strictly one-way.
import { ref, watch, onMounted } from 'vue'
import { useScoreRenderer } from '@/composables/useScoreRenderer'
import { measureFullness } from '@/lib/scoreModel'
import { FIGURE_DRAG_TYPE } from '@/lib/durations'
import { pitchAt, stringAt, yForPitch, ledgerLineYs, findMeasureAt, findNoteAt, insertIndexForX, PITCH_BAND_SPACINGS } from '@/lib/staffGeometry'

const props = defineProps({
  // The score model to render (source of truth).
  score: { type: Object, required: true },
  // Width to wrap systems at. Defaults to the renderer's own default.
  pageWidth: { type: Number, default: 680 },
  // The selected note, drawn in brass: { measureIndex, noteIndex } | null.
  selection: { type: Object, default: null },
  // When true, clicks and figure drops on the score emit the events below.
  interactive: { type: Boolean, default: false },
  // The measure quiet marks are editor feedback, not part of the engraved
  // sheet — the print/PDF view turns them off.
  showMarks: { type: Boolean, default: true }
})

const emit = defineEmits(['select', 'add-note', 'add-tab-note', 'background-click'])

const host = ref(null)
const { renderScore } = useScoreRenderer()

// The renderer's report of where everything was drawn — plain data, kept
// outside Vue reactivity (it is derived output, not state).
let layout = null

// The quiet marks: one per measure whose durations don't add up to the time
// signature. Reactive (unlike `layout`) because the template renders them as
// small overlays pinned to each measure's drawn position.
const quietMarks = ref([])

/*
 * Where a measure's quiet mark sits and what it says. Only 'partial' and
 * 'over' get a mark: an EMPTY measure is plainly intentional (you just haven't
 * written there yet), so marking it would be noise, not observation. The mark
 * never blocks or corrects — it only points, in words, at what it noticed.
 *
 * The mark observes the NOTATION stave (tab-only notes don't enter its
 * arithmetic — see measureTicks), so it pins itself to that stave: centred
 * over the measure, just above the top line. No notation stave drawn means
 * nothing to point at, and no mark.
 */
function buildQuietMarks() {
  if (!layout || !props.showMarks) return []
  const timeSignature = props.score.timeSignature
  const marks = []
  for (const drawn of layout.measures) {
    if (drawn.topLineY == null) continue
    const measure = props.score.measures[drawn.measureIndex]
    const { state } = measureFullness(measure, timeSignature)
    if (state !== 'partial' && state !== 'over') continue

    // The mark hangs above the whole writable band — higher than the highest
    // note a drop could possibly write — so it never obstructs a notehead or
    // the drag preview, and all marks sit on one tidy height.
    const bandTopY = drawn.topLineY - PITCH_BAND_SPACINGS * drawn.lineSpacing

    marks.push({
      measureIndex: drawn.measureIndex,
      // Centred on the measure (the icon is 13px wide); 22px above the band's
      // top clears the highest notehead (half a head, the 13px icon, a small
      // breath of air).
      left: drawn.x + drawn.width / 2 - 7,
      top: bandTopY - 22,
      message:
        state === 'partial'
          ? `Measure ${drawn.measureIndex + 1} is a little short of ${timeSignature} — no rush, fix it whenever.`
          : `Measure ${drawn.measureIndex + 1} runs past ${timeSignature} — that's allowed; trim it if you like.`
    })
  }
  return marks
}

function draw() {
  if (host.value) {
    layout = renderScore(host.value, props.score, {
      pageWidth: props.pageWidth,
      selection: props.selection
    })
    quietMarks.value = buildQuietMarks()
  }
}

onMounted(draw)

// Re-render whenever the model, the selection or the page width changes.
// `deep` because edits happen inside measures[]/notes[]; VexFlow needs a full
// redraw regardless.
watch(() => props.score, draw, { deep: true })
watch(() => props.selection, draw)
watch(() => props.pageWidth, draw)

/**
 * A pointer event's coordinates in the SVG's own space. The SVG is drawn 1:1
 * (no viewBox scaling), so the offset from its top-left corner is the VexFlow
 * coordinate. Returns null when nothing is rendered yet.
 */
function pointFrom(event) {
  const svg = host.value ? host.value.querySelector('svg') : null
  if (!svg) return null
  const rect = svg.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

/**
 * A click, mapped against the layout report:
 *   on a drawn note  → 'select' that note
 *   anywhere else    → 'background-click' (the owner clears selection)
 * Writing happens by dropping a figure (see onDrop), not by clicking.
 */
function onClick(event) {
  if (!props.interactive || !layout) return
  const point = pointFrom(event)
  if (!point) return

  const measure = findMeasureAt(layout, point.x, point.y)
  const hit = measure ? findNoteAt(measure, point.x) : null
  if (hit) {
    emit('select', { measureIndex: measure.measureIndex, noteIndex: hit.noteIndex })
  } else {
    emit('background-click')
  }
}

// The drag preview: where the dragged figure would land if dropped right now
// — a circle on the snapped notehead spot, plus its ledger strokes when it
// climbs outside the five lines. View state like the selection, never part of
// the model; reactive (like the quiet marks) because the template pins it
// over the manuscript. Null when no drag is over a writable spot.
const dragPreview = ref(null)

/**
 * The preview for a drag hovering at this point — the same
 * findMeasureAt/pitchAt/stringAt path onDrop takes, so the circle never lies
 * about where the note will land. A string preview needs no ledger strokes:
 * the six string lines are real. Null when the point snaps to nothing (a drop
 * there would write nothing).
 */
function previewAt(point) {
  if (!point || !layout) return null
  const measure = findMeasureAt(layout, point.x, point.y)
  if (!measure) return null

  const pitch = pitchAt(point.y, measure)
  if (pitch) {
    const y = yForPitch(pitch, measure)
    return { x: point.x, y, size: measure.lineSpacing, ledgerYs: ledgerLineYs(y, measure) }
  }

  const string = stringAt(point.y, measure)
  if (string) {
    // String n is the tab stave's (n − 1)th line from the top.
    const y = measure.tabTopLineY + (string - 1) * measure.tabLineSpacing
    return { x: point.x, y, size: measure.tabLineSpacing, ledgerYs: [] }
  }

  return null
}

// The browser only allows a drop where dragover is cancelled — so we cancel it
// exactly when the drag carries a toolbar figure, and nowhere else. (The
// payload itself is read in onDrop; during dragover only the types are
// visible, by drag-and-drop design — the preview therefore depends on the
// position alone.)
function onDragOver(event) {
  if (!props.interactive) return
  if (!event.dataTransfer.types.includes(FIGURE_DRAG_TYPE)) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  dragPreview.value = previewAt(pointFrom(event))
}

// The preview leaves with the drag. dragleave also fires when the pointer
// merely crosses onto a child inside the canvas, so only a true exit — the
// pointer's destination outside the host — clears it.
function onDragLeave(event) {
  if (host.value && host.value.contains(event.relatedTarget)) return
  dragPreview.value = null
}

/**
 * A dropped figure, mapped against the layout report:
 *   in the notation staff's writable band → 'add-note' at the snapped pitch
 *   on a tab string line                  → 'add-tab-note' on that string
 * Both carry the figure's duration and x-position. Anywhere else (the margins,
 * the gap between staves) the drop quietly does nothing — no note appears
 * where none was aimed.
 */
function onDrop(event) {
  dragPreview.value = null
  if (!props.interactive || !layout) return
  const duration = event.dataTransfer.getData(FIGURE_DRAG_TYPE)
  if (!duration) return
  event.preventDefault()

  const point = pointFrom(event)
  if (!point) return
  const measure = findMeasureAt(layout, point.x, point.y)
  if (!measure) return
  const insertIndex = insertIndexForX(measure, point.x)

  const pitch = pitchAt(point.y, measure)
  if (pitch) {
    emit('add-note', { measureIndex: measure.measureIndex, insertIndex, pitch, duration })
    return
  }

  const string = stringAt(point.y, measure)
  if (string) {
    emit('add-tab-note', { measureIndex: measure.measureIndex, insertIndex, string, duration })
  }
}
</script>

<template>
  <div class="score-canvas__frame">
    <!-- The renderer replaces the contents of this element with an <svg>. -->
    <div
      ref="host"
      class="score-canvas"
      :class="{ 'score-canvas--interactive': interactive }"
      aria-label="Rendered score"
      @click="onClick"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    ></div>

    <!-- Quiet marks, pinned over the measures they observe. The icon is
         decorative (never colour alone): the words live in the title tooltip
         here and, for the editor, in the summary line under the manuscript.
         click.stop so a click on the mark doesn't write a note beneath it. -->
    <span
      v-for="mark in quietMarks"
      :key="mark.measureIndex"
      class="score-canvas__mark"
      :title="mark.message"
      :style="{ left: `${mark.left}px`, top: `${mark.top}px` }"
      @click.stop
    >
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <!-- Lucide alert-circle — the same soft mark QuietMark uses. -->
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    </span>

    <!-- The drag preview: a brass circle on the snapped landing spot, with
         temporary ledger strokes when the spot sits outside the five lines.
         pointer-events: none in the CSS keeps the overlay invisible to the
         very dragover events that drive it. -->
    <template v-if="dragPreview">
      <span
        v-for="y in dragPreview.ledgerYs"
        :key="y"
        class="score-canvas__preview-ledger"
        :style="{ left: `${dragPreview.x}px`, top: `${y}px` }"
      ></span>
      <span
        class="score-canvas__preview-note"
        :style="{
          left: `${dragPreview.x}px`,
          top: `${dragPreview.y}px`,
          width: `${dragPreview.size}px`,
          height: `${dragPreview.size}px`
        }"
      ></span>
    </template>
  </div>
</template>

<style scoped>
/* The positioning context for the quiet-mark overlays: the SVG and the marks
   share this box's coordinate space, so the layout report's px map directly.
   Scrolling lives here too, so the marks scroll along with the drawing. */
.score-canvas__frame {
  position: relative;
  overflow-x: auto;
}

/* The measure's quiet mark — a small oxblood observation, never a red alarm. */
.score-canvas__mark {
  position: absolute;
  display: inline-flex;
  color: var(--state-mark-line);
  cursor: help;
}

.score-canvas {
  /* The renderer reads this resolved colour and draws the score in it, so the
     notation sits in engraving ink on the warm page instead of stark black. */
  color: var(--text-primary);
}

/* A crosshair quietly signals the manuscript is live — figures dropped here
   become notes, and the notes themselves can be picked up with a click. */
.score-canvas--interactive {
  cursor: crosshair;
}

/* The drag preview's circle — a thin brass outline about notehead size,
   centred on the snapped spot. Brass is the selection colour: a suggestion,
   not an observation (that's the quiet mark's oxblood). */
.score-canvas__preview-note {
  position: absolute;
  transform: translate(-50%, -50%);
  border: 1px solid var(--accent-brass);
  border-radius: 50%;
  pointer-events: none;
}

/* Temporary ledger strokes — hairlines a little wider than the circle, like
   the real ledger lines the written note will get. */
.score-canvas__preview-ledger {
  position: absolute;
  width: 18px;
  height: 1px;
  transform: translateX(-50%);
  background: var(--accent-brass);
  pointer-events: none;
}
</style>
