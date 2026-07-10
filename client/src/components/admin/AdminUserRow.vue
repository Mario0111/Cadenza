<script setup>
// One account in the admin users table. Follows the ScoreCard pattern: the row
// runs its own update/delete requests and manages its own small lifecycle
// (edit mode, inline confirm, pending flags, quiet error), then reports back
// via `updated` / `deleted` so the page keeps its lists in step.
//
// Guardrails mirror the backend: the signed-in admin's own row (isSelf) offers
// no delete and cannot change its role — the desk is never left without a key.
import { ref, nextTick, computed } from 'vue'
import { updateUser, deleteUser } from '@/api/admin'
import AppButton from '@/components/AppButton.vue'
import QuietMark from '@/components/QuietMark.vue'

const props = defineProps({
  user: { type: Object, required: true },
  // True when this row is the signed-in admin themselves.
  isSelf: { type: Boolean, default: false },
  // How many scores this account owns — quoted in the delete confirm, since
  // deleting the account deletes them too.
  scoreCount: { type: Number, default: 0 }
})
const emit = defineEmits(['updated', 'deleted'])

const joined = computed(() =>
  new Date(props.user.createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
)

// One quiet error slot for whichever action last failed.
const error = ref('')

// --- inline edit (name / email / role) --------------------------------------

const editing = ref(false)
const draft = ref({ name: '', email: '', role: 'user' })
const nameInput = ref(null)
const saving = ref(false)

async function startEdit() {
  error.value = ''
  draft.value = {
    name: props.user.name,
    email: props.user.email,
    role: props.user.role
  }
  editing.value = true
  // The input only exists after this render, so focus it a tick later.
  await nextTick()
  nameInput.value?.focus()
  nameInput.value?.select()
}

function cancelEdit() {
  editing.value = false
  error.value = ''
}

async function saveEdit() {
  // Send only what actually changed, like the profile page does.
  const changes = {}
  const name = draft.value.name.trim()
  const email = draft.value.email.trim()
  if (name !== props.user.name) changes.name = name
  if (email !== props.user.email) changes.email = email
  if (draft.value.role !== props.user.role) changes.role = draft.value.role

  if (Object.keys(changes).length === 0) {
    // Nothing changed — just close quietly.
    editing.value = false
    return
  }

  saving.value = true
  error.value = ''
  try {
    const { user } = await updateUser(props.user.id, changes)
    editing.value = false
    emit('updated', user)
  } catch (err) {
    // Field-level validation details read fine as one line here; take the
    // first message so the row stays a row.
    error.value = err.details?.[0]?.message || err.message || 'Something went wrong. Please try again.'
  } finally {
    saving.value = false
  }
}

// --- inline delete confirm ---------------------------------------------------

const confirmingDelete = ref(false)
const deleting = ref(false)

const confirmText = computed(() => {
  const scores =
    props.scoreCount === 0
      ? 'They have no scores.'
      : props.scoreCount === 1
        ? 'Their 1 score goes with them.'
        : `Their ${props.scoreCount} scores go with them.`
  return `Delete ${props.user.name}'s account? ${scores} It can't be brought back.`
})

function askDelete() {
  error.value = ''
  confirmingDelete.value = true
}

function keepUser() {
  confirmingDelete.value = false
}

async function confirmDelete() {
  deleting.value = true
  error.value = ''
  try {
    await deleteUser(props.user.id)
    emit('deleted', props.user.id)
  } catch (err) {
    deleting.value = false
    confirmingDelete.value = false
    error.value = err.message || 'Something went wrong. Please try again.'
  }
}
</script>

<template>
  <!-- Display row, or the same cells as inputs while editing. -->
  <tr v-if="!editing" class="user-row">
    <td class="cell cell--name">
      {{ user.name }}
      <span v-if="isSelf" class="you-tag">you</span>
    </td>
    <td class="cell">{{ user.email }}</td>
    <td class="cell">{{ user.role }}</td>
    <td class="cell cell--muted">{{ joined }}</td>
    <td class="cell cell--actions">
      <div class="actions">
        <AppButton variant="ghost" @click="startEdit">Edit</AppButton>
        <AppButton v-if="!isSelf" variant="ghost" @click="askDelete">Delete</AppButton>
      </div>
    </td>
  </tr>

  <tr v-else class="user-row user-row--editing">
    <td class="cell">
      <label class="sr-only" :for="`name-${user.id}`">Name</label>
      <input
        :id="`name-${user.id}`"
        ref="nameInput"
        v-model="draft.name"
        class="row-input"
        type="text"
        @keydown.esc="cancelEdit"
        @keydown.enter.prevent="saveEdit"
      />
    </td>
    <td class="cell">
      <label class="sr-only" :for="`email-${user.id}`">Email</label>
      <input
        :id="`email-${user.id}`"
        v-model="draft.email"
        class="row-input"
        type="email"
        @keydown.esc="cancelEdit"
        @keydown.enter.prevent="saveEdit"
      />
    </td>
    <td class="cell">
      <label class="sr-only" :for="`role-${user.id}`">Role</label>
      <!-- Your own role stays put: someone else has to demote you. -->
      <select
        :id="`role-${user.id}`"
        v-model="draft.role"
        class="row-input row-input--select"
        :disabled="isSelf"
        :title="isSelf ? 'You cannot step down from your own admin role.' : undefined"
        @keydown.esc="cancelEdit"
      >
        <option value="user">user</option>
        <option value="admin">admin</option>
      </select>
    </td>
    <td class="cell cell--muted">{{ joined }}</td>
    <td class="cell cell--actions">
      <div class="actions">
        <AppButton variant="secondary" :loading="saving" @click="saveEdit">
          {{ saving ? 'Saving…' : 'Save' }}
        </AppButton>
        <AppButton variant="ghost" @click="cancelEdit">Cancel</AppButton>
      </div>
    </td>
  </tr>

  <!-- The inline delete confirm gets its own full-width line under the row. -->
  <tr v-if="confirmingDelete" class="follow-row">
    <td class="cell cell--follow" colspan="5">
      <div class="confirm">
        <p class="confirm__text">{{ confirmText }}</p>
        <div class="actions">
          <AppButton variant="secondary" :loading="deleting" @click="confirmDelete">
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </AppButton>
          <AppButton variant="ghost" @click="keepUser">Keep it</AppButton>
        </div>
      </div>
    </td>
  </tr>

  <!-- A quiet error, when an action last failed. -->
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

.cell--name {
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

/* Follow rows (confirm / error) belong to the row above, so no divider. */
.cell--follow {
  border-top: none;
  padding-top: 0;
}

.you-tag {
  white-space: nowrap;
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  color: var(--text-muted);
  border: var(--border-hair) solid var(--border-hairline);
  border-radius: var(--radius-xs);
  padding: 1px var(--space-2);
  margin-left: var(--space-2);
}

.actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: flex-end;
}

.row-input {
  width: 100%;
  min-width: 12ch;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--surface-card);
  border: var(--border-hair) solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  box-shadow: var(--shadow-inset);
  transition: var(--t-control);
}
.row-input:focus-visible {
  outline: none;
  border-color: var(--accent-brass);
  box-shadow: var(--shadow-focus);
}
.row-input--select {
  min-width: 9ch;
}
.row-input:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
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

/* Visually hidden but read by screen readers (the edit inputs' labels). */
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
