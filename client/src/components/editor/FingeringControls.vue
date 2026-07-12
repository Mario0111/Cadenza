<script setup>
// FingeringControls — the tab and fingering panel for the SELECTED note.
// Deliberately dumb, like NoteToolbar: it renders the note it is given and
// emits intents; the score store applies them.
//
// Everything here is optional and manual, per the core philosophy: string and
// fret are per-pitch, nullable fields the user types in — never derived from
// the pitch. A pitch without both simply does not appear on the tab stave.
// A TAB-ONLY note (no pitches at all) gets one row of its own: its string and
// fret aren't optional extras but the note itself, so they can't be cleared —
// only edited, or removed along with the note.
import { computed } from 'vue'
import { isTabOnly } from '@/lib/scoreModel'

const props = defineProps({
  // The selected note event, or null when nothing is selected.
  note: { type: Object, default: null }
})

const emit = defineEmits([
  'set-string', // { pitchIndex, value } — value 1–6 or null
  'set-fret', // { pitchIndex, value } — value 0–24 or null
  'set-left-finger', // 1–4 or null
  'set-right-finger' // 'p' | 'i' | 'm' | 'a' or null
])

// Guitar strings, high e (1) to low E (6) — the numbering tab readers expect.
const STRINGS = [1, 2, 3, 4, 5, 6]
const LEFT_FINGERS = [1, 2, 3, 4]
const RIGHT_FINGERS = ['p', 'i', 'm', 'a']

// "e/4" → "E4" — just for the row labels; the model always keeps "e/4".
function pitchLabel(pitch) {
  const [letter, octave] = String(pitch).split('/')
  return `${letter.toUpperCase()}${octave}`
}

const tabOnly = computed(() => isTabOnly(props.note))

// The rows to edit: one per pitch (chords get several), or — for a tab-only
// note — the single string/fret slot the note consists of. `index` is what the
// store's per-pitch actions expect either way.
const rows = computed(() => {
  if (!props.note || props.note.isRest) return []
  if (tabOnly.value) {
    return [{ key: 'tab-only', label: 'Tab', index: 0 }]
  }
  return props.note.pitches.map((pitch, index) => ({
    key: `${index}-${pitch}`,
    label: pitchLabel(pitch),
    index
  }))
})

// A <select> hands us strings; the model wants an integer or null (the empty
// "none" option). Same parse for both the string select and the fret input.
function parseOrNull(raw) {
  if (raw === '' || raw == null) return null
  const number = Number(raw)
  return Number.isInteger(number) ? number : null
}

function onStringChange(pitchIndex, event) {
  emit('set-string', { pitchIndex, value: parseOrNull(event.target.value) })
}

function onFretChange(pitchIndex, event) {
  emit('set-fret', { pitchIndex, value: parseOrNull(event.target.value) })
}

// The finger buttons toggle: pressing the active one clears it back to none.
function onLeftFinger(finger) {
  emit('set-left-finger', props.note?.leftFinger === finger ? null : finger)
}

function onRightFinger(finger) {
  emit('set-right-finger', props.note?.rightFinger === finger ? null : finger)
}
</script>

<template>
  <aside class="fingering" aria-label="Tab and fingering">
    <h2 class="fingering__title">Tab and fingering</h2>

    <!-- Nothing selected: a quiet invitation, not an error. -->
    <p v-if="!note" class="fingering__quiet">
      Pick up a note on the manuscript to give it a string, a fret, or a
      fingering.
    </p>

    <p v-else-if="note.isRest" class="fingering__quiet">
      A rest carries no tab or fingering.
    </p>

    <template v-else>
      <!-- One row per pitch (chords get several); a tab-only note gets its
           single string/fret row instead. -->
      <div class="fingering__section">
        <p class="fingering__label">
          {{ tabOnly ? 'Where it sits on the neck' : 'Where it sits on the neck — optional' }}
        </p>
        <div v-for="row in rows" :key="row.key" class="fingering__row">
          <span class="fingering__pitch">{{ row.label }}</span>

          <label class="fingering__field">
            <span class="fingering__field-name">String</span>
            <select
              class="fingering__select"
              :value="note.strings?.[row.index] ?? ''"
              @change="onStringChange(row.index, $event)"
            >
              <!-- A tab-only note IS its string — there is no "none" for it. -->
              <option v-if="!tabOnly" value="">none</option>
              <option v-for="string in STRINGS" :key="string" :value="string">
                {{ string }}
              </option>
            </select>
          </label>

          <label class="fingering__field">
            <span class="fingering__field-name">Fret</span>
            <input
              class="fingering__input"
              type="number"
              min="0"
              max="24"
              placeholder="—"
              :value="note.frets?.[row.index] ?? ''"
              @change="onFretChange(row.index, $event)"
            />
          </label>
        </div>
        <p class="fingering__hint">
          {{
            tabOnly
              ? 'This note lives on the tab stave only — 0 is the open string. To take it off the page, delete the note.'
              : 'A pitch joins the tab stave once it has both a string and a fret.'
          }}
        </p>
      </div>

      <!-- Fingering draws around the notation notehead, which a tab-only note
           doesn't have — so these controls step aside for it. -->
      <div v-if="!tabOnly" class="fingering__section" role="group" aria-label="Left-hand finger">
        <p class="fingering__label">Left hand</p>
        <div class="fingering__choices">
          <button
            v-for="finger in LEFT_FINGERS"
            :key="finger"
            type="button"
            class="fingering__choice"
            :class="{ 'fingering__choice--active': note.leftFinger === finger }"
            :aria-pressed="note.leftFinger === finger"
            :title="`Left-hand finger ${finger} — press again for none`"
            @click="onLeftFinger(finger)"
          >
            {{ finger }}
          </button>
        </div>
      </div>

      <div v-if="!tabOnly" class="fingering__section" role="group" aria-label="Right-hand finger">
        <p class="fingering__label">Right hand</p>
        <div class="fingering__choices">
          <button
            v-for="finger in RIGHT_FINGERS"
            :key="finger"
            type="button"
            class="fingering__choice fingering__choice--italic"
            :class="{ 'fingering__choice--active': note.rightFinger === finger }"
            :aria-pressed="note.rightFinger === finger"
            :title="`Right-hand finger ${finger} — press again for none`"
            @click="onRightFinger(finger)"
          >
            {{ finger }}
          </button>
        </div>
      </div>
    </template>
  </aside>
</template>

<style scoped>
/* A quiet paper panel beside the manuscript, in the toolbar's manner. */
.fingering {
  padding: var(--space-4);
  background: var(--surface-recess);
  border: var(--border-hair) solid var(--border-strong);
  border-radius: var(--radius-sm);
}

.fingering__title {
  margin: 0 0 var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  letter-spacing: var(--tracking-wide);
  color: var(--text-secondary);
}

.fingering__quiet {
  margin: 0;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.fingering__section {
  margin-top: var(--space-4);
}

.fingering__section:first-of-type {
  margin-top: 0;
}

.fingering__label {
  margin: 0 0 var(--space-2);
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.fingering__row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.fingering__pitch {
  min-width: 3ch;
  padding-bottom: 7px;
  font-family: var(--font-serif);
  font-size: var(--text-md);
  color: var(--text-primary);
}

.fingering__field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fingering__field-name {
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.fingering__select,
.fingering__input {
  width: 72px;
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

/* Brass focus ring, always visible. */
.fingering__select:focus-visible,
.fingering__input:focus-visible,
.fingering__choice:focus-visible {
  outline: none;
  border-color: var(--accent-brass);
  box-shadow: var(--shadow-focus);
}

.fingering__hint {
  margin: var(--space-2) 0 0;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.fingering__choices {
  display: flex;
  gap: var(--space-2);
}

.fingering__choice {
  min-width: 32px;
  height: 32px;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  background: var(--surface-card);
  border: var(--border-hair) solid var(--border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--t-control);
}

/* p/i/m/a reads as classical fingering in italic serif. */
.fingering__choice--italic {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--text-md);
}

.fingering__choice:hover {
  border-color: var(--accent-brass);
  color: var(--text-primary);
}

/* The active finger wears the brass wash, like the toolbar's active tool. */
.fingering__choice--active {
  background: var(--brass-100);
  border-color: var(--accent-brass);
  color: var(--text-primary);
}
</style>
