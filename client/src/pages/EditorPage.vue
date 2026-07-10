<script setup>
// EditorPage — the desk. Composes the writing tools (NoteToolbar), the
// manuscript (ScoreCanvas, interactive) and the keyboard path, all over the
// score store. The page itself holds no score state: every edit is a store
// action, and the canvas redraws from the model — one direction, always.
//
// Phase 4b: the score is still the seeded sample (see stores/score.js);
// loading and saving through the API arrive in 4c.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import PaperCard from '@/components/PaperCard.vue'
import NoteToolbar from '@/components/editor/NoteToolbar.vue'
import ScoreCanvas from '@/components/editor/ScoreCanvas.vue'
import { useScoreStore } from '@/stores/score'
import { DURATIONS } from '@/lib/durations'

const store = useScoreStore()

/* ---- Quiet status line for the toolbar ---------------------------------- */

const durationLabel = computed(() => {
  const option = DURATIONS.find((d) => d.code === store.activeSettings.duration)
  return option ? option.label.toLowerCase() : ''
})

const status = computed(() => {
  if (store.selectedNote) {
    return `Measure ${store.selection.measureIndex + 1}, note ${store.selection.noteIndex + 1} — editing`
  }
  if (store.selection) {
    return `Measure ${store.selection.measureIndex + 1} — selected`
  }
  const dotted = store.pen.dotted ? 'dotted ' : ''
  const kind = store.pen.isRest ? 'rests' : 'notes'
  return `Writing ${dotted}${durationLabel.value} ${kind}`
})

/* ---- Keyboard input ------------------------------------------------------
 * Active while the manuscript region has focus (Tab reaches it; clicking it
 * focuses it). Plain keys only — anything with a modifier is left to the
 * browser, except Shift+arrows which transpose by octaves.
 */

const DURATION_KEYS = { 1: 'w', 2: 'h', 3: 'q', 4: '8', 5: '16', 6: '32' }
const PITCH_LETTER_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g']

function onKeydown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const key = event.key
  const lower = key.toLowerCase()
  let handled = true

  if (key === 'ArrowUp') store.transposeSelected(event.shiftKey ? 7 : 1)
  else if (key === 'ArrowDown') store.transposeSelected(event.shiftKey ? -7 : -1)
  else if (key === 'ArrowLeft') store.moveSelection(-1)
  else if (key === 'ArrowRight') store.moveSelection(1)
  else if (key === 'Delete' || key === 'Backspace') store.deleteSelectedNote()
  else if (key === 'Escape') store.clearSelection()
  else if (key === 'Enter' || lower === 'n') store.addNoteAfterSelection()
  else if (key === '.') store.toggleDot()
  else if (lower === 'r') store.toggleRest()
  else if (DURATION_KEYS[key]) store.setDuration(DURATION_KEYS[key])
  else if (PITCH_LETTER_KEYS.includes(lower)) store.setSelectedLetter(lower)
  else handled = false

  // Stop handled keys from also scrolling the page or navigating.
  if (handled) event.preventDefault()
}

/* ---- Page width ----------------------------------------------------------
 * The manuscript wraps its systems to the space it actually has, so the score
 * re-flows tidily when the window is resized.
 */

const page = ref(null)
const pageWidth = ref(680)

function measurePage() {
  if (page.value) {
    pageWidth.value = Math.max(360, page.value.clientWidth)
  }
}

onMounted(() => {
  measurePage()
  window.addEventListener('resize', measurePage)
})
onBeforeUnmount(() => window.removeEventListener('resize', measurePage))
</script>

<template>
  <section class="editor">
    <header class="editor__head">
      <p class="cadenza-eyebrow">The desk</p>
      <h1 class="editor__title">{{ store.score.title }}</h1>
    </header>

    <NoteToolbar
      :duration="store.activeSettings.duration"
      :dotted="store.activeSettings.dotted"
      :is-rest="store.activeSettings.isRest"
      :has-selection="Boolean(store.selectedNote)"
      :can-remove-measure="store.canRemoveMeasure"
      :status="status"
      @set-duration="store.setDuration"
      @toggle-dot="store.toggleDot"
      @toggle-rest="store.toggleRest"
      @delete-note="store.deleteSelectedNote"
      @add-measure="store.addMeasure"
      @remove-measure="store.removeSelectedMeasure"
    />

    <PaperCard class="editor__plate">
      <div
        ref="page"
        class="editor__page"
        tabindex="0"
        aria-label="Manuscript. Click a line or space to write a note, or use the
          keyboard: arrows move and transpose, letters a to g set the pitch,
          digits one to six set the duration, n writes the next note."
        @keydown="onKeydown"
      >
        <ScoreCanvas
          :score="store.score"
          :selection="store.selection"
          :page-width="pageWidth"
          interactive
          @select="({ measureIndex, noteIndex }) => store.selectNote(measureIndex, noteIndex)"
          @add-note="store.addNote"
          @background-click="store.clearSelection"
        />
      </div>
    </PaperCard>

    <p class="editor__hint">
      Click a line or space to write a note; click a note to pick it up again.
      With the manuscript focused: arrows move and transpose, a–g re-letter,
      1–6 set the duration, period dots it, r writes rests, n adds the next
      note, Delete removes, Escape puts the pen down.
    </p>
  </section>
</template>

<style scoped>
.editor__head {
  margin-bottom: var(--space-5);
}

.editor__title {
  font-size: var(--text-xl);
}

.editor__plate {
  margin-top: var(--space-4);
}

.editor__page {
  border-radius: var(--radius-sm);
}

/* Brass focus ring on the manuscript itself — the keyboard path is visible. */
.editor__page:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.editor__hint {
  margin-top: var(--space-4);
  max-width: 72ch;
  font-family: var(--font-serif);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
