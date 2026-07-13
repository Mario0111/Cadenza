<script setup>
// EditorPage — the desk. Composes the writing tools (NoteToolbar), the
// manuscript (ScoreCanvas, interactive), the tab and fingering panel, and the
// keyboard path, all over the score store. The page itself holds no score
// state: every edit is a store action, and the canvas redraws from the model —
// one direction, always.
//
// The page also owns the route side of load/save: /editor starts a blank
// score, /editor/:id loads a saved one, and the first successful save settles
// the URL onto the new id.
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PaperCard from '@/components/PaperCard.vue'
import QuietMark from '@/components/QuietMark.vue'
import AppButton from '@/components/AppButton.vue'
import NoteToolbar from '@/components/editor/NoteToolbar.vue'
import ScoreCanvas from '@/components/editor/ScoreCanvas.vue'
import FingeringControls from '@/components/editor/FingeringControls.vue'
import ModeSwitcher from '@/components/editor/ModeSwitcher.vue'
import SheetHeader from '@/components/editor/SheetHeader.vue'
import { useScoreStore } from '@/stores/score'
import { DURATIONS } from '@/lib/durations'
import { measureFullness, isBeamable, isSlurrable } from '@/lib/scoreModel'
import { SHEET_WIDTH } from '@/lib/printSheet'

const store = useScoreStore()
const route = useRoute()
const router = useRouter()

/* ---- Load from the route -------------------------------------------------
 * /editor/:id opens a saved score; /editor (no id) opens a blank one. The
 * watch also covers in-app navigation between the two forms of the route —
 * except right after the first save, when WE moved the URL onto the id the
 * server just assigned and the working copy is already the right one.
 */

function openFromRoute() {
  const id = route.params.id || null
  if (id === store.scoreId) return
  if (id) store.loadScore(id)
  else store.startNewScore()
}

onMounted(openFromRoute)
watch(() => route.params.id, openFromRoute)

/* ---- Saving ---------------------------------------------------------------
 * One path for the button and Ctrl+S. After the save that CREATES the score,
 * the URL moves to /editor/:id so a refresh reopens the same score.
 */

async function saveNow() {
  const wasNew = !store.scoreId
  await store.saveScore()
  if (wasNew && store.scoreId) {
    router.replace({ name: 'editor', params: { id: store.scoreId } })
  }
}

// The quiet saved/unsaved line next to the save button.
const saveStatus = computed(() => {
  if (store.saving) return 'Saving…'
  if (store.dirty) return 'Unsaved changes'
  return store.scoreId ? 'Saved' : 'Not saved yet'
})

function onGlobalKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault() // the browser's "save page" dialog is never useful here
    saveNow()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))

/* ---- Score details --------------------------------------------------------
 * Common guitar-friendly time signatures. The model stores any "n/d" string;
 * offering a list just keeps the input tidy and typo-free.
 */
const TIME_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '9/8', '12/8', '2/2']

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

/* ---- The quiet marks' words -----------------------------------------------
 * The canvas pins a small icon on each measure that doesn't add up; the words
 * live here, nearby, so the observation is never colour (or hover) alone.
 */

const fullnessSummary = computed(() => {
  const timeSignature = store.score.timeSignature
  const marked = []
  store.score.measures.forEach((measure, index) => {
    const { state } = measureFullness(measure, timeSignature)
    if (state === 'partial' || state === 'over') marked.push(index + 1)
  })
  if (!marked.length) return ''

  if (marked.length === 1) {
    return `Measure ${marked[0]} doesn't add up to ${timeSignature} — that's allowed; the small mark shows where.`
  }
  const listed = `${marked.slice(0, -1).join(', ')} and ${marked[marked.length - 1]}`
  return `Measures ${listed} don't add up to ${timeSignature} — that's allowed; the small marks show where.`
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
 * The manuscript is the SAME fixed-width page the print sheet uses, so what
 * you write is what prints: identical line breaks, identical justified
 * systems. On a narrow window the manuscript scrolls sideways instead of
 * re-flowing (ScoreCanvas's frame owns that scroll).
 */
</script>

<template>
  <section class="editor">
    <!-- A score that isn't here anymore (or failed to load) — a quiet dead end
         with a way forward, never a bare error. -->
    <template v-if="store.loadError">
      <header class="editor__head">
        <p class="cadenza-eyebrow">The desk</p>
      </header>
      <QuietMark :message="store.loadError" />
      <div class="editor__error-actions">
        <AppButton variant="secondary" :to="{ name: 'library' }">Back to your library</AppButton>
      </div>
    </template>

    <p v-else-if="store.loading" class="editor__loading">Fetching your score…</p>

    <template v-else>
      <header class="editor__head">
        <p class="cadenza-eyebrow">The desk</p>

        <!-- The head keeps only the working controls — the title, description,
             tempo and composer are written on the sheet itself (SheetHeader),
             exactly where they print. -->
        <div class="editor__meta">
          <div class="editor__controls">
            <label class="editor__time">
              <span class="editor__time-label">Time</span>
              <select
                class="editor__time-select"
                :value="store.score.timeSignature"
                @change="store.setTimeSignature($event.target.value)"
              >
                <option v-for="ts in TIME_SIGNATURES" :key="ts" :value="ts">{{ ts }}</option>
              </select>
            </label>

            <ModeSwitcher
              :model-value="store.score.displayMode"
              @update:model-value="store.setDisplayMode"
            />

            <div class="editor__save">
              <AppButton variant="primary" :loading="store.saving" @click="saveNow">
                Save
              </AppButton>
              <!-- Only a saved score can be printed; the print view reads the
                   saved version, so save first if the status says unsaved. -->
              <AppButton
                v-if="store.scoreId"
                variant="ghost"
                :to="{ name: 'print', params: { id: store.scoreId } }"
              >
                Print or download
              </AppButton>
              <span class="editor__save-status" role="status">{{ saveStatus }}</span>
            </div>
          </div>
        </div>

        <QuietMark v-if="store.saveError" :message="store.saveError" />
      </header>

      <NoteToolbar
        :duration="store.activeSettings.duration"
        :dotted="store.activeSettings.dotted"
        :is-rest="store.activeSettings.isRest"
        :has-selection="Boolean(store.selectedNote)"
        :beamed="Boolean(store.selectedNote?.beamed)"
        :can-beam="isBeamable(store.selectedNote)"
        :slurred="Boolean(store.selectedNote?.slurred)"
        :can-slur="isSlurrable(store.selectedNote)"
        :can-remove-measure="store.canRemoveMeasure"
        :status="status"
        @set-duration="store.setDuration"
        @toggle-dot="store.toggleDot"
        @toggle-rest="store.toggleRest"
        @toggle-beam="store.toggleBeam"
        @toggle-slur="store.toggleSlur"
        @delete-note="store.deleteSelectedNote"
        @add-measure="store.addMeasure"
        @remove-measure="store.removeSelectedMeasure"
      />

      <div class="editor__body">
        <PaperCard class="editor__plate">
          <!-- The engraved header lives on the plate, above the music, and
               OUTSIDE .editor__page — so typing a title never trips the
               manuscript's keyboard shortcuts. -->
          <SheetHeader
            :title="store.score.title"
            :description="store.score.description"
            :bpm="store.score.bpm"
            :composer="store.score.composer"
            @update:title="store.setTitle"
            @update:description="store.setDescription"
            @update:bpm="store.setBpm"
            @update:composer="store.setComposer"
          />
          <div
            class="editor__page"
            tabindex="0"
            aria-label="Manuscript. Drag a figure from the toolbar onto a line or
              space to write a note, or use the keyboard: arrows move and
              transpose, letters a to g set the pitch, digits one to six set
              the duration, n writes the next note."
            @keydown="onKeydown"
          >
            <ScoreCanvas
              :score="store.score"
              :selection="store.selection"
              :page-width="SHEET_WIDTH"
              interactive
              @select="({ measureIndex, noteIndex }) => store.selectNote(measureIndex, noteIndex)"
              @add-note="store.addNote"
              @add-tab-note="store.addTabNote"
              @background-click="store.clearSelection"
            />
          </div>
        </PaperCard>

        <FingeringControls
          class="editor__fingering"
          :note="store.selectedNote"
          @set-string="({ pitchIndex, value }) => store.setSelectedString(pitchIndex, value)"
          @set-fret="({ pitchIndex, value }) => store.setSelectedFret(pitchIndex, value)"
          @set-left-finger="store.setSelectedLeftFinger"
          @set-right-finger="store.setSelectedRightFinger"
        />
      </div>

      <QuietMark v-if="fullnessSummary" :message="fullnessSummary" />

      <p class="editor__hint">
        Drag a figure from the toolbar onto a line or space to write a note —
        or onto a tab string line to write a tab-only note (it lives on the tab
        stave alone; set its fret in the panel). Click a note to pick it up
        again. With the manuscript focused: arrows move and transpose, a–g
        re-letter, 1–6 set the duration, period dots it, r writes rests, n adds
        the next note, Delete removes, Escape puts the pen down. Ctrl+S saves.
        Beam joins a selected eighth (or shorter) to its beamed neighbours —
        flag each note you want under the same beam. Slur works the same over
        any notes: flag each one to arc a single curve across them.
      </p>
    </template>
  </section>
</template>

<style scoped>
.editor__head {
  margin-bottom: var(--space-5);
}

/* The head is working controls only now — the sheet's words live on the plate. */
.editor__meta {
  display: flex;
  align-items: flex-start;
  gap: var(--space-5);
  flex-wrap: wrap;
}

.editor__controls {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.editor__time {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.editor__time-label {
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.editor__time-select {
  height: 32px;
  padding: 0 var(--space-2);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--surface-card);
  border: var(--border-hair) solid var(--border-strong);
  border-radius: var(--radius-sm);
  transition: var(--t-control);
}

.editor__time-select:focus-visible {
  outline: none;
  border-color: var(--accent-brass);
  box-shadow: var(--shadow-focus);
}

.editor__save {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/* The quiet saved/unsaved line — an observation, not a nag. */
.editor__save-status {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.editor__loading {
  font-family: var(--font-serif);
  font-style: italic;
  color: var(--text-muted);
}

.editor__error-actions {
  margin-top: var(--space-4);
}

/* Manuscript proud on the left, fingering panel in the margin on the right;
   the panel drops below on narrow screens. */
.editor__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: var(--space-4);
  align-items: start;
  margin-top: var(--space-4);
}

@media (max-width: 860px) {
  .editor__body {
    grid-template-columns: minmax(0, 1fr);
  }
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
