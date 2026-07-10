<script setup>
// ScoreCanvas — the rendering of one score model. It owns a plain container
// element and hands it to the VexFlow renderer; when the score, the selection
// or the displayMode changes, it re-renders. The component never mutates the
// model: in interactive mode it only TRANSLATES clicks into events (select a
// note, add a note at a staff position) and lets the owner decide what to do,
// keeping data → render strictly one-way.
import { ref, watch, onMounted } from 'vue'
import { useScoreRenderer } from '@/composables/useScoreRenderer'
import { pitchAt, findMeasureAt, findNoteAt, insertIndexForX } from '@/lib/staffGeometry'

const props = defineProps({
  // The score model to render (source of truth).
  score: { type: Object, required: true },
  // Width to wrap systems at. Defaults to the renderer's own default.
  pageWidth: { type: Number, default: 680 },
  // The selected note, drawn in brass: { measureIndex, noteIndex } | null.
  selection: { type: Object, default: null },
  // When true, clicks on the score emit the events below.
  interactive: { type: Boolean, default: false }
})

const emit = defineEmits(['select', 'add-note', 'background-click'])

const host = ref(null)
const { renderScore } = useScoreRenderer()

// The renderer's report of where everything was drawn — plain data, kept
// outside Vue reactivity (it is derived output, not state).
let layout = null

function draw() {
  if (host.value) {
    layout = renderScore(host.value, props.score, {
      pageWidth: props.pageWidth,
      selection: props.selection
    })
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
 * A click, mapped against the layout report:
 *   on a drawn note        → 'select' that note
 *   on a writable spot     → 'add-note' at the snapped pitch and x-position
 *   anywhere else          → 'background-click' (the owner clears selection)
 */
function onClick(event) {
  if (!props.interactive || !layout) return

  // Click coordinates in the SVG's own space. The SVG is drawn 1:1 (no viewBox
  // scaling), so the offset from its top-left corner is the VexFlow coordinate.
  const svg = host.value ? host.value.querySelector('svg') : null
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const measure = findMeasureAt(layout, x, y)
  if (!measure) {
    emit('background-click')
    return
  }

  const hit = findNoteAt(measure, x)
  if (hit) {
    emit('select', { measureIndex: measure.measureIndex, noteIndex: hit.noteIndex })
    return
  }

  // Not on a note: if the click is inside the staff's writable band this is
  // note input; otherwise (e.g. on the tab stave) it is just a stray click.
  const pitch = pitchAt(y, measure)
  if (pitch) {
    emit('add-note', {
      measureIndex: measure.measureIndex,
      insertIndex: insertIndexForX(measure, x),
      pitch
    })
  } else {
    emit('background-click')
  }
}
</script>

<template>
  <!-- The renderer replaces the contents of this element with an <svg>. -->
  <div
    ref="host"
    class="score-canvas"
    :class="{ 'score-canvas--interactive': interactive }"
    aria-label="Rendered score"
    @click="onClick"
  ></div>
</template>

<style scoped>
.score-canvas {
  /* The renderer reads this resolved colour and draws the score in it, so the
     notation sits in engraving ink on the warm page instead of stark black. */
  color: var(--text-primary);
  overflow-x: auto;
}

/* A crosshair quietly signals "you can write here" without any chrome. */
.score-canvas--interactive {
  cursor: crosshair;
}
</style>
