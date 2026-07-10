<script setup>
// The admin desk: every account and every score in the system, each in its
// own table. The rows (AdminUserRow / AdminScoreRow) run their own edit and
// delete requests, ScoreCard-style; this page loads the two lists, keeps them
// in step when a row reports a change, and owns the quiet loading/error/empty
// states.
//
// The router guard already keeps non-admins out, and the backend answers 403
// to them regardless — the page can assume you belong here.
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listUsers, listAllScores } from '@/api/admin'
import AdminUserRow from '@/components/admin/AdminUserRow.vue'
import AdminScoreRow from '@/components/admin/AdminScoreRow.vue'
import PaperCard from '@/components/PaperCard.vue'
import AppButton from '@/components/AppButton.vue'
import QuietMark from '@/components/QuietMark.vue'

const auth = useAuthStore()

const users = ref([])
const scores = ref([])
const loading = ref(true)
const loadError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    // Both tables belong to one view, so load them together.
    const [usersData, scoresData] = await Promise.all([listUsers(), listAllScores()])
    users.value = usersData.users
    scores.value = scoresData.scores
  } catch (err) {
    loadError.value = err.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Scores per account, counted from the scores we already have — quoted in a
// user row's delete confirm, since deleting an account deletes its scores.
const scoreCountByOwner = computed(() => {
  const counts = {}
  for (const score of scores.value) {
    const ownerId = score.owner?.id
    if (ownerId) {
      counts[ownerId] = (counts[ownerId] || 0) + 1
    }
  }
  return counts
})

function onUserUpdated(fresh) {
  const index = users.value.findIndex((u) => u.id === fresh.id)
  if (index !== -1) {
    users.value[index] = fresh
  }
  // Owner names in the scores table come from the load-time populate; keep
  // them in step with a rename without another round trip.
  for (const score of scores.value) {
    if (score.owner?.id === fresh.id) {
      score.owner = { id: fresh.id, name: fresh.name, email: fresh.email }
    }
  }
  // Editing your own row (name/email) should follow you into the chrome.
  if (fresh.id === auth.user?.id) {
    auth.setUser(fresh)
  }
}

function onUserDeleted(id) {
  users.value = users.value.filter((u) => u.id !== id)
  // Their scores were deleted with the account; drop them from the table too.
  scores.value = scores.value.filter((s) => s.owner?.id !== id)
}

function onScoreDeleted(id) {
  scores.value = scores.value.filter((s) => s.id !== id)
}
</script>

<template>
  <section>
    <header class="admin-head">
      <p class="cadenza-eyebrow">Admin</p>
      <h1 class="admin-head__title">The admin desk.</h1>
      <p class="admin-head__lede">
        Every account and every score in Cadenza gathers here. Changes take effect
        right away — deleting an account also deletes its scores.
      </p>
    </header>

    <!-- Loading -->
    <p v-if="loading" class="admin-status" role="status">Opening the ledgers…</p>

    <!-- Load failed -->
    <PaperCard v-else-if="loadError">
      <div class="admin-error">
        <QuietMark :message="loadError" />
        <AppButton variant="secondary" @click="load">Try again</AppButton>
      </div>
    </PaperCard>

    <template v-else>
      <!-- Accounts -->
      <PaperCard class="admin-card">
        <h2 class="admin-card__title">Accounts</h2>
        <p class="admin-card__count">
          {{ users.length === 1 ? '1 account' : `${users.length} accounts` }}
        </p>
        <div class="table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="head-cell" scope="col">Name</th>
                <th class="head-cell" scope="col">Email</th>
                <th class="head-cell" scope="col">Role</th>
                <th class="head-cell" scope="col">Joined</th>
                <th class="head-cell head-cell--actions" scope="col">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <AdminUserRow
                v-for="user in users"
                :key="user.id"
                :user="user"
                :is-self="user.id === auth.user?.id"
                :score-count="scoreCountByOwner[user.id] || 0"
                @updated="onUserUpdated"
                @deleted="onUserDeleted"
              />
            </tbody>
          </table>
        </div>
      </PaperCard>

      <!-- Scores -->
      <PaperCard class="admin-card">
        <h2 class="admin-card__title">Scores</h2>
        <p class="admin-card__count">
          {{ scores.length === 1 ? '1 score' : `${scores.length} scores` }}
        </p>
        <p v-if="!scores.length" class="admin-empty">
          No scores on anyone's desk yet.
        </p>
        <div v-else class="table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="head-cell" scope="col">Title</th>
                <th class="head-cell" scope="col">Owner</th>
                <th class="head-cell" scope="col">Measures</th>
                <th class="head-cell" scope="col">Updated</th>
                <th class="head-cell head-cell--actions" scope="col">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <AdminScoreRow
                v-for="score in scores"
                :key="score.id"
                :score="score"
                @deleted="onScoreDeleted"
              />
            </tbody>
          </table>
        </div>
      </PaperCard>
    </template>
  </section>
</template>

<style scoped>
.admin-head {
  margin-bottom: var(--space-8);
}

.admin-head__title {
  font-size: var(--text-xl);
  margin: var(--space-2) 0 var(--space-3);
}

.admin-head__lede {
  font-family: var(--font-serif);
  color: var(--text-secondary);
  max-width: 64ch;
  margin: 0;
}

.admin-status {
  font-family: var(--font-serif);
  color: var(--text-muted);
}

.admin-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-5);
}

.admin-card {
  margin-bottom: var(--space-7);
}

.admin-card__title {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: var(--fw-medium);
  margin: 0 0 var(--space-1);
}

.admin-card__count {
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  color: var(--text-muted);
  margin: 0 0 var(--space-4);
}

.admin-empty {
  font-family: var(--font-serif);
  color: var(--text-muted);
  margin: 0;
}

/* The tables stay readable on narrow windows by scrolling inside the card. */
.table-scroll {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  /* Below this the columns crush each other; let the wrapper scroll instead. */
  min-width: 640px;
  border-collapse: collapse;
}

.head-cell {
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  font-weight: var(--fw-medium);
  letter-spacing: var(--tracking-wide);
  text-align: left;
  color: var(--text-muted);
  padding: var(--space-2) var(--space-4);
}

.head-cell--actions {
  text-align: right;
}

/* Visually hidden but read by screen readers (the actions column header). */
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
