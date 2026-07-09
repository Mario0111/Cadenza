<script setup>
// Placeholder for the score editor (Phase 4 — the VexFlow render + input work).
// It exists now as a real, protected route so the shell and auth guards are
// testable end to end.
import PaperCard from '@/components/PaperCard.vue'
</script>

<template>
  <PaperCard class="stub">
    <p class="cadenza-eyebrow">The desk</p>
    <h1 class="stub__title">The editor is coming.</h1>
    <p class="stub__text">
      This is where you'll write on the stave and the tab. It arrives in Phase 4,
      with VexFlow rendering, note input, tablature and fingering.
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
