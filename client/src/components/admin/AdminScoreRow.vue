<script setup>
// One score in the admin scores table: title, whose it is, a little meta, and
// a delete with the usual inline confirm step. Same pattern as AdminUserRow —
// the row runs its own request and reports back via `deleted`.
import { ref, computed } from 'vue'
import { deleteAnyScore } from '@/api/admin'
import AppButton from '@/components/AppButton.vue'
import QuietMark from '@/components/QuietMark.vue'

const props = defineProps({
  score: { type: Object, required: true }
})
const emit = defineEmits(['deleted'])

// The owner arrives populated ({ id, name, email }); a missing owner should
// never happen (deleting a user deletes their scores), but render quietly if
// it ever does.
const ownerName = computed(() => props.score.owner?.name || 'unknown')
const ownerEmail = computed(() => props.score.owner?.email || '')

const measures = computed(() => {
  const count = props.score.measures?.length ?? 0
  return count === 1 ? '1 measure' : `${count} measures`
})

const updated = computed(() =>
  new Date(props.score.updatedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
)

const error = ref('')

// --- inline delete confirm ---------------------------------------------------

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
    await deleteAnyScore(props.score.id)
    emit('deleted', props.score.id)
  } catch (err) {
    deleting.value = false
    confirmingDelete.value = false
    error.value = err.message || 'Something went wrong. Please try again.'
  }
}
</script>

<template>
  <tr class="score-row">
    <td class="cell cell--title">{{ score.title }}</td>
    <td class="cell">
      {{ ownerName }}
      <span v-if="ownerEmail" class="owner-email">{{ ownerEmail }}</span>
    </td>
    <td class="cell cell--muted">{{ measures }}</td>
    <td class="cell cell--muted">{{ updated }}</td>
    <td class="cell cell--actions">
      <div class="actions">
        <AppButton variant="ghost" @click="askDelete">Delete</AppButton>
      </div>
    </td>
  </tr>

  <!-- The inline delete confirm gets its own full-width line under the row. -->
  <tr v-if="confirmingDelete" class="follow-row">
    <td class="cell cell--follow" colspan="5">
      <div class="confirm">
        <p class="confirm__text">
          Delete "{{ score.title }}" from {{ ownerName }}'s library? It can't be brought back.
        </p>
        <div class="actions">
          <AppButton variant="secondary" :loading="deleting" @click="confirmDelete">
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </AppButton>
          <AppButton variant="ghost" @click="keepScore">Keep it</AppButton>
        </div>
      </div>
    </td>
  </tr>

  <tr v-if="error" class="follow-row">
    <td class="cell cell--follow" colspan="5">
      <QuietMark :message="error" />
    </td>
  </tr>
</template>

<style scoped>
.cell {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  padding: var(--space-3) var(--space-4);
  border-top: var(--border-hair) solid var(--border-hairline);
  vertical-align: middle;
  text-align: left;
}

.cell--title {
  font-weight: var(--fw-medium);
  overflow-wrap: anywhere;
}

.cell--muted {
  color: var(--text-muted);
  white-space: nowrap;
}

.cell--actions {
  text-align: right;
}

.cell--follow {
  border-top: none;
  padding-top: 0;
}

.owner-email {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-muted);
  overflow-wrap: anywhere;
}

.actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: flex-end;
}

.confirm {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.confirm__text {
  font-family: var(--font-serif);
  color: var(--text-secondary);
  margin: 0;
}
</style>
