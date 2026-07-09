<script setup>
// Placeholder for the print / PDF view (Phase 7 — score only, on white paper,
// with the PDF export). Protected route so a signed-out visit redirects to login.
import PaperCard from '@/components/PaperCard.vue'
</script>

<template>
  <PaperCard class="stub">
    <p class="cadenza-eyebrow">Print</p>
    <h1 class="stub__title">The print sheet.</h1>
    <p class="stub__text">
      A clean print view and PDF download of a score arrive in Phase 7.
    </p>
  </PaperCard>
</template>

<style scoped>
.stub {
  max-width: 52ch;
}
.stub__title {
  font-size: var(--text-xl);
  margin: var(--space-2) 0 var(--space-3);
}
.stub__text {
  font-family: var(--font-serif);
  color: var(--text-secondary);
  margin: 0;
}
</style>
