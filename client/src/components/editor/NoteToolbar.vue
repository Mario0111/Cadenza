<script setup>
// NoteToolbar — the writing tools above the manuscript: duration, dot, rest,
// delete, and the measure controls. Deliberately dumb: it renders the settings
// it is given and emits intents; the score store decides what they mean
// (edit the selected note, or set the pen for the next one).
// The duration figures are also draggable: dragging one onto the manuscript is
// how a note is written (the drop lands in ScoreCanvas).
import { DURATIONS, FIGURE_DRAG_TYPE } from '@/lib/durations'

defineProps({
  // The settings on display — the selected note's, or the pen's.
  duration: { type: String, required: true },
  dotted: { type: Boolean, required: true },
  isRest: { type: Boolean, required: true },
  // Whether a note is selected (the toolbar edits it instead of the pen).
  hasSelection: { type: Boolean, default: false },
  // The selected note's beam flag, and whether it can carry one at all
  // (an eighth or shorter with a stem — see isBeamable in scoreModel).
  beamed: { type: Boolean, default: false },
  canBeam: { type: Boolean, default: false },
  // The selected note's slur flag, and whether it can carry one (any pitched
  // note — see isSlurrable in scoreModel).
  slurred: { type: Boolean, default: false },
  canSlur: { type: Boolean, default: false },
  // The selected note's harmonic flag, and whether it can carry one (anything
  // that sounds — see isHarmonicable in scoreModel).
  harmonic: { type: Boolean, default: false },
  canHarmonic: { type: Boolean, default: false },
  canRemoveMeasure: { type: Boolean, default: false },
  // Quiet status line: "Measure 2, note 3 — editing" / "Writing quarters", …
  status: { type: String, default: '' }
})

defineEmits([
  'set-duration',
  'toggle-dot',
  'toggle-rest',
  'toggle-beam',
  'toggle-slur',
  'toggle-harmonic',
  'delete-note',
  'add-measure',
  'remove-measure'
])

// Bravura (SMuFL) glyphs for each duration code, plus the quarter rest used on
// the rest toggle. Codepoints are the SMuFL standard "individual notes" range.
const DURATION_GLYPHS = {
  w: '',
  h: '',
  q: '',
  8: '',
  16: '',
  32: ''
}
const REST_GLYPH = ''

// Keyboard hints for the tooltips: 1–6 mirror the durations' order.
const durationTitle = (option, index) =>
  `${option.label} note — drag onto the staff to write it, or key ${index + 1}`

// Dragging a figure carries its duration code; the manuscript's drop handler
// reads it back and writes the note there. The drag ghost is the bare glyph —
// snapshotting the whole button would drag its paper square along too.
function onFigureDragStart(event, code) {
  event.dataTransfer.setData(FIGURE_DRAG_TYPE, code)
  event.dataTransfer.effectAllowed = 'copy'
  const glyph = event.currentTarget.querySelector('.note-toolbar__glyph')
  if (glyph) {
    event.dataTransfer.setDragImage(glyph, glyph.offsetWidth / 2, glyph.offsetHeight / 2)
  }
}
</script>

<template>
  <div class="note-toolbar" role="toolbar" aria-label="Writing tools">
    <!-- Durations: a segmented control; the active value wears a brass wash. -->
    <div class="note-toolbar__group" role="group" aria-label="Duration">
      <button
        v-for="(option, index) in DURATIONS"
        :key="option.code"
        type="button"
        class="note-toolbar__button note-toolbar__button--glyph"
        :class="{ 'note-toolbar__button--active': duration === option.code }"
        :title="durationTitle(option, index)"
        :aria-label="durationTitle(option, index)"
        :aria-pressed="duration === option.code"
        draggable="true"
        @dragstart="onFigureDragStart($event, option.code)"
        @click="$emit('set-duration', option.code)"
      >
        <span class="note-toolbar__glyph" aria-hidden="true">{{ DURATION_GLYPHS[option.code] }}</span>
      </button>
    </div>

    <span class="note-toolbar__rule" aria-hidden="true"></span>

    <div class="note-toolbar__group" role="group" aria-label="Note kind">
      <button
        type="button"
        class="note-toolbar__button note-toolbar__button--labelled"
        :class="{ 'note-toolbar__button--active': dotted }"
        title="Dotted — key ."
        :aria-pressed="dotted"
        @click="$emit('toggle-dot')"
      >
        Dot
      </button>
      <button
        type="button"
        class="note-toolbar__button note-toolbar__button--labelled"
        :class="{ 'note-toolbar__button--active': isRest }"
        title="Rest — key r"
        :aria-pressed="isRest"
        @click="$emit('toggle-rest')"
      >
        <span class="note-toolbar__glyph note-toolbar__glyph--small" aria-hidden="true">{{ REST_GLYPH }}</span>
        Rest
      </button>
      <button
        type="button"
        class="note-toolbar__button note-toolbar__button--labelled"
        :class="{ 'note-toolbar__button--active': beamed }"
        title="Beam — an eighth or shorter joins its beamed neighbours"
        :aria-pressed="beamed"
        :disabled="!canBeam"
        @click="$emit('toggle-beam')"
      >
        Beam
      </button>
      <button
        type="button"
        class="note-toolbar__button note-toolbar__button--labelled"
        :class="{ 'note-toolbar__button--active': slurred }"
        title="Slur — a note joins its slurred neighbours under one curve"
        :aria-pressed="slurred"
        :disabled="!canSlur"
        @click="$emit('toggle-slur')"
      >
        Slur
      </button>
      <button
        type="button"
        class="note-toolbar__button note-toolbar__button--labelled"
        :class="{ 'note-toolbar__button--active': harmonic }"
        title="Harmonic — a circle above the note, brackets round the fret; key h"
        :aria-pressed="harmonic"
        :disabled="!canHarmonic"
        @click="$emit('toggle-harmonic')"
      >
        Harmonic
      </button>
    </div>

    <span class="note-toolbar__rule" aria-hidden="true"></span>

    <button
      type="button"
      class="note-toolbar__button note-toolbar__button--labelled"
      title="Delete note — Delete"
      :disabled="!hasSelection"
      @click="$emit('delete-note')"
    >
      <!-- Lucide trash-2 -->
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
      Delete note
    </button>

    <p class="note-toolbar__status">{{ status }}</p>

    <div class="note-toolbar__group" role="group" aria-label="Measures">
      <button
        type="button"
        class="note-toolbar__button note-toolbar__button--labelled"
        title="Add an empty measure after the selected one"
        @click="$emit('add-measure')"
      >
        <!-- Lucide plus -->
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        Add measure
      </button>
      <button
        type="button"
        class="note-toolbar__button note-toolbar__button--labelled"
        title="Remove the selected measure"
        :disabled="!canRemoveMeasure"
        @click="$emit('remove-measure')"
      >
        <!-- Lucide minus -->
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
        Remove measure
      </button>
    </div>
  </div>
</template>

<style scoped>
/* A paper strip above the manuscript, in the DS's toolbar manner. */
.note-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--surface-recess);
  border: var(--border-hair) solid var(--border-strong);
  border-radius: var(--radius-sm);
}

.note-toolbar__group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Hairline separator between tool groups, like the rail's dividers. */
.note-toolbar__rule {
  width: 1px;
  height: 22px;
  background: var(--line-300);
}

.note-toolbar__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 34px;
  height: 34px;
  padding: 0 var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  background: var(--surface-card);
  border: var(--border-hair) solid var(--border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--t-control);
}

.note-toolbar__button:hover:not([disabled]) {
  border-color: var(--accent-brass);
  color: var(--text-primary);
}

/* Brass focus ring, always visible. */
.note-toolbar__button:focus-visible {
  outline: none;
  border-color: var(--accent-brass);
  box-shadow: var(--shadow-focus);
}

.note-toolbar__button[disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}

/* The active tool wears a brass wash. */
.note-toolbar__button--active {
  background: var(--brass-100);
  border-color: var(--accent-brass);
  color: var(--text-primary);
}

/* Bravura note glyphs sit on the text baseline with their stems rising above
   it, so the glyph is dropped toward the button's lower third to look centred. */
.note-toolbar__glyph {
  font-family: var(--font-music);
  font-size: 22px;
  line-height: 1;
  transform: translateY(7px);
}

.note-toolbar__glyph--small {
  font-size: 16px;
  transform: translateY(4px);
}

/* The quiet status line takes the leftover room in the middle. */
.note-toolbar__status {
  flex: 1;
  min-width: 12ch;
  margin: 0;
  text-align: right;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
