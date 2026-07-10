<script setup>
// One score in the library folio: title (opens the editor), description, a
// quiet meta line, and the three card actions — open, rename, delete.
//
// The card runs its own rename/delete requests so each card manages its own
// small lifecycle (editing state, inline confirm, pending flags, quiet error),
// then tells the library what changed via `renamed` / `deleted` so the list
// stays in step. Rename is inline (no browser prompt) and delete asks with an
// inline confirm step (no popup), per the design philosophy.
import { ref, nextTick, computed } from 'vue'
import { updateScore, deleteScore } from '@/api/scores'
import PaperCard from './PaperCard.vue'
import AppButton from './AppButton.vue'
import QuietMark from './QuietMark.vue'

const props = defineProps({
  score: { type: Object, required: true }
})
const emit = defineEmits(['renamed', 'deleted'])

// --- meta line -------------------------------------------------------------

const metaLine = computed(() => {
  const count = props.score.measures?.length ?? 0
  const measures = count === 1 ? '1 measure' : `${count} measures`
  return `${measures} · ${props.score.timeSignature} · updated ${formatDate(props.score.updatedAt)}`
})

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// --- rename ----------------------------------------------------------------

const renaming = ref(false)
const draftTitle = ref('')
const renameInput = ref(null)
const savingRename = ref(false)

async function startRename() {
  error.value = ''
  draftTitle.value = props.score.title
  renaming.value = true
  // The input only exists after this render, so focus it a tick later.
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
}

function cancelRename() {
  renaming.value = false
  error.value = ''
}

async function saveRename() {
  const title = draftTitle.value.trim()
  if (!title) {
    error.value = 'A score needs a title.'
    return
  }
  if (title === props.score.title) {
    // Nothing changed — just close quietly.
    renaming.value = false
    return
  }

  savingRename.value = true
  error.value = ''
  try {
    const { score } = await updateScore(props.score.id, { title })
    renaming.value = false
    emit('renamed', score)
  } catch (err) {
    error.value = err.message || 'Something went wrong. Please try again.'
  } finally {
    savingRename.value = false
  }
}

// --- delete ----------------------------------------------------------------

const confirmingDelete = ref(false)
const deleting = ref(false)

function askDelete() {
  error.value = ''
  confirmingDelete.value = true
}

function keepScore() {
  confirmingDelete.value = false
}

async function confirmDelete() {
  deleting.value = true
  error.value = ''
  try {
    await deleteScore(props.score.id)
    emit('deleted', props.score.id)
  } catch (err) {
    deleting.value = false
    confirmingDelete.value = false
    error.value = err.message || 'Something went wrong. Please try again.'
  }
}

// One quiet error slot for whichever action last failed.
const error = ref('')
</script>

<template>
  <PaperCard class="score-card">
    <!-- Title, or the inline rename field while renaming. -->
    <form v-if="renaming" class="score-card__rename" @submit.prevent="saveRename">
      <label class="sr-only" :for="`rename-${score.id}`">New title</label>
      <input
        :id="`rename-${score.id}`"
        ref="renameInput"
        v-model="draftTitle"
        class="score-card__rename-input"
        type="text"
        @keydown.esc="cancelRename"
      />
      <div class="score-card__rename-actions">
        <AppButton type="submit" variant="secondary" :loading="savingRename">
          {{ savingRename ? 'Saving…' : 'Save' }}
        </AppButton>
        <AppButton variant="ghost" @click="cancelRename">Cancel</AppButton>
      </div>
    </form>

    <template v-else>
      <h2 class="score-card__title">
        <RouterLink class="score-card__title-link" :to="{ name: 'editor', params: { id: score.id } }">
          {{ score.title }}
        </RouterLink>
      </h2>
    </template>

    <p v-if="score.description" class="score-card__description">{{ score.description }}</p>
    <p class="score-card__meta">{{ metaLine }}</p>

    <QuietMark v-if="error" :message="error" />

    <!-- Actions, or the inline confirm step while deciding on a delete. -->
    <div v-if="confirmingDelete" class="score-card__confirm">
      <p class="score-card__confirm-text">Delete this score? It can't be brought back.</p>
      <div class="score-card__actions">
        <AppButton variant="secondary" :loading="deleting" @click="confirmDelete">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </AppButton>
        <AppButton variant="ghost" @click="keepScore">Keep it</AppButton>
      </div>
    </div>

    <div v-else-if="!renaming" class="score-card__actions">
      <AppButton variant="secondary" :to="{ name: 'editor', params: { id: score.id } }">
        Open
      </AppButton>
      <AppButton variant="ghost" @click="startRename">Rename</AppButton>
      <AppButton variant="ghost" @click="askDelete">Delete</AppButton>
    </div>
  </PaperCard>
</template>

<style scoped>
.score-card {
  display: flex;
  flex-direction: column;
}

/* PaperCard wraps its slot in an inner body div; stretch it so the actions'
   margin-top: auto can pin them to the card's bottom edge in the grid. */
.score-card :deep(.paper-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.score-card__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--fw-medium);
  margin: 0 0 var(--space-2);
  overflow-wrap: anywhere;
}

.score-card__title-link {
  color: var(--text-primary);
  text-decoration: none;
  transition: var(--t-control);
  border-radius: var(--radius-xs);
}
.score-card__title-link:hover {
  color: var(--accent-oxblood);
}
/* Brass focus ring, always visible. */
.score-card__title-link:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.score-card__description {
  font-family: var(--font-serif);
  color: var(--text-secondary);
  margin: 0 0 var(--space-3);
  overflow-wrap: anywhere;
}

.score-card__meta {
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  color: var(--text-muted);
  margin: 0 0 var(--space-5);
}

.score-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: auto;
}

/* Inline rename */
.score-card__rename {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.score-card__rename-input {
  width: 100%;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--fw-medium);
  color: var(--text-primary);
  background: var(--surface-card);
  border: var(--border-hair) solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  box-shadow: var(--shadow-inset);
  transition: var(--t-control);
}
.score-card__rename-input:focus-visible {
  outline: none;
  border-color: var(--accent-brass);
  box-shadow: var(--shadow-focus);
}

.score-card__rename-actions {
  display: flex;
  gap: var(--space-3);
}

/* Inline delete confirm */
.score-card__confirm {
  margin-top: auto;
}
.score-card__confirm-text {
  font-family: var(--font-serif);
  color: var(--text-secondary);
  margin: 0 0 var(--space-3);
}

/* Visually hidden but read by screen readers (the rename input's label). */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
</style>
