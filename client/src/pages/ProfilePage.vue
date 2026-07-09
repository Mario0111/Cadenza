<script setup>
// Placeholder for the profile page (Phase 5 — update name, email, password).
// Protected route; shows the signed-in account so the shell reads as real.
import { useAuthStore } from '@/stores/auth'
import PaperCard from '@/components/PaperCard.vue'

const auth = useAuthStore()
</script>

<template>
  <PaperCard class="stub">
    <p class="cadenza-eyebrow">Your account</p>
    <h1 class="stub__title">{{ auth.user?.name }}</h1>
    <p class="stub__meta">{{ auth.user?.email }}</p>
    <p class="stub__text">
      Editing your name, email and password lives here — it arrives in Phase 5.
    </p>
  </PaperCard>
</template>

<style scoped>
.stub {
  max-width: 52ch;
}
.stub__title {
  font-size: var(--text-xl);
  margin: var(--space-2) 0 var(--space-1);
}
.stub__meta {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin: 0 0 var(--space-5);
}
.stub__text {
  font-family: var(--font-serif);
  color: var(--text-secondary);
  margin: 0;
}
</style>
