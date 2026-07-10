<script setup>
// Your library — the folio of saved scores. Fetches the signed-in user's
// scores (newest first, per the API) and renders them as ScoreCards; each card
// handles its own rename/delete and reports back so the list stays in step.
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listScores } from '@/api/scores'
import ScoreCard from '@/components/ScoreCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import AppButton from '@/components/AppButton.vue'
import QuietMark from '@/components/QuietMark.vue'
import PaperCard from '@/components/PaperCard.vue'

const auth = useAuthStore()

const scores = ref([])
const loading = ref(true)
const loadError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await listScores()
    scores.value = data.scores
  } catch (err) {
    loadError.value = err.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// A rename bumps updatedAt, but we update the card in place rather than
// re-sorting — reshuffling the folio under your hands would be jarring. The
// order settles on the next visit.
function onRenamed(fresh) {
  const index = scores.value.findIndex((s) => s.id === fresh.id)
  if (index !== -1) {
    scores.value[index] = fresh
  }
}

function onDeleted(id) {
  scores.value = scores.value.filter((s) => s.id !== id)
}
</script>

<template>
  <section>
    <header class="library-head">
      <div class="library-head__words">
        <p class="cadenza-eyebrow">Your library</p>
        <h1 class="library-head__title">Welcome back, {{ auth.user?.name }}.</h1>
        <p class="library-head__lede">This is your folio — every score you save gathers here.</p>
      </div>
      <!-- The header action only appears once there is a folio to add to;
           the empty state carries its own "New score". -->
      <AppButton
        v-if="!loading && !loadError && scores.length"
        variant="primary"
        :to="{ name: 'editor' }"
      >
        New score
      </AppButton>
    </header>

    <!-- Loading -->
    <p v-if="loading" class="library-status" role="status">Opening your folio…</p>

    <!-- Load failed -->
    <PaperCard v-else-if="loadError">
      <div class="library-error">
        <QuietMark :message="loadError" />
        <AppButton variant="secondary" @click="load">Try again</AppButton>
      </div>
    </PaperCard>

    <!-- Empty folio -->
    <PaperCard v-else-if="!scores.length">
      <EmptyState
        title="Nothing on the desk yet"
        description="Your saved scores will gather here. Start your first — it will be waiting when you come back."
      >
        <AppButton variant="primary" :to="{ name: 'editor' }">New score</AppButton>
      </EmptyState>
    </PaperCard>

    <!-- The folio -->
    <div v-else class="library-grid">
      <ScoreCard
        v-for="score in scores"
        :key="score.id"
        :score="score"
        @renamed="onRenamed"
        @deleted="onDeleted"
      />
    </div>
  </section>
</template>

<style scoped>
.library-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-6);
  flex-wrap: wrap;
  margin-bottom: var(--space-8);
}

.library-head__title {
  font-size: var(--text-xl);
  margin-bottom: var(--space-3);
}

.library-head__lede {
  font-family: var(--font-serif);
  color: var(--text-secondary);
  max-width: 56ch;
  margin: 0;
}

.library-status {
  font-family: var(--font-serif);
  color: var(--text-muted);
}

.library-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-5);
}

/* Cards flow into columns as space allows; each stays a readable width. */
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: var(--space-6);
  align-items: stretch;
}
</style>
