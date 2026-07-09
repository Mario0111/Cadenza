<script setup>
// Placeholder for the admin dashboard (Phase 6). This route is admin-only: the
// router guard sends non-admins back to their library before they get here, so
// reaching this page at all means you're an admin.
import PaperCard from '@/components/PaperCard.vue'
</script>

<template>
  <PaperCard class="stub">
    <p class="cadenza-eyebrow">Admin</p>
    <h1 class="stub__title">The admin desk.</h1>
    <p class="stub__text">
      Managing all users and all scores lives here — it arrives in Phase 6. If you
      can read this, your account has the admin role.
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
