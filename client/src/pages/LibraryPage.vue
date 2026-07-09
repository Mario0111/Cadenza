<script setup>
// Your library — where saved scores gather. The full listing (open, rename,
// delete, download) arrives in Phase 5; for now it confirms you're signed in and
// shows the empty state, so the register → land here flow can be tested.
import { useAuthStore } from '@/stores/auth'
import PaperCard from '@/components/PaperCard.vue'
import AppButton from '@/components/AppButton.vue'

const auth = useAuthStore()
</script>

<template>
  <section>
    <header class="library-head">
      <p class="cadenza-eyebrow">Your library</p>
      <h1 class="library-head__title">Welcome back, {{ auth.user?.name }}.</h1>
      <p class="library-head__lede">
        This is your folio. Saved scores will gather here — the editor and the full
        library arrive in the phases ahead.
      </p>
    </header>

    <PaperCard class="library-empty">
      <p class="library-empty__text">No scores yet — this is where they'll live.</p>
      <!-- Disabled until the editor exists (Phase 4). -->
      <AppButton variant="secondary" disabled>New score</AppButton>
    </PaperCard>
  </section>
</template>

<style scoped>
.library-head {
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
}

.library-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-6);
}
.library-empty__text {
  margin: 0;
  font-family: var(--font-serif);
  color: var(--text-muted);
}
</style>
