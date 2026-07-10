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
import { pitchAt, findMeasureAt, findNoteAt, insertIndexForX } from '@/lib/staffGeometry'

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

const emit = defineEmits(['select', 'add-note', 'background-click'])

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
 */
function buildQuietMarks() {
  if (!layout || !props.showMarks) return []
  const timeSignature = props.score.timeSignature
  const marks = []
  for (const drawn of layout.measures) {
    const measure = props.score.measures[drawn.measureIndex]
    const { state } = measureFullness(measure, timeSignature)
    if (state !== 'partial' && state !== 'over') continue
    marks.push({
      measureIndex: drawn.measureIndex,
      // Tucked into the measure's top-right corner, above the staff lines.
      left: drawn.x + drawn.width - 20,
      top: drawn.hitTop + 2,
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

// The browser only allows a drop where dragover is cancelled — so we cancel it
// exactly when the drag carries a toolbar figure, and nowhere else. (The
// payload itself is read in onDrop; during dragover only the types are
// visible, by drag-and-drop design.)
function onDragOver(event) {
  if (!props.interactive) return
  if (!event.dataTransfer.types.includes(FIGURE_DRAG_TYPE)) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

/**
 * A dropped figure, mapped against the layout report: inside a measure's
 * writable band → 'add-note' with the figure's duration, at the snapped pitch
 * and x-position. Anywhere else (the tab stave, the margins) the drop quietly
 * does nothing — no note appears where none was aimed.
 */
function onDrop(event) {
  if (!props.interactive || !layout) return
  const duration = event.dataTransfer.getData(FIGURE_DRAG_TYPE)
  if (!duration) return
  event.preventDefault()

  const point = pointFrom(event)
  if (!point) return
  const measure = findMeasureAt(layout, point.x, point.y)
  if (!measure) return

  const pitch = pitchAt(point.y, measure)
  if (!pitch) return
  emit('add-note', {
    measureIndex: measure.measureIndex,
    insertIndex: insertIndexForX(measure, point.x),
    pitch,
    duration
  })
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
</style>
