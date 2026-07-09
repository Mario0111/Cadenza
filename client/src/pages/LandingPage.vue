<script setup>
// Temporary Phase 1 placeholder. It exists to confirm the design tokens and
// fonts are wired correctly; Phase 3 replaces it with the real landing page.
</script>

<template>
  <main class="min-h-screen bg-page text-ink flex items-center justify-center p-8">
    <div class="max-w-xl w-full bg-card border border-hairline rounded-md shadow-lift p-10">
      <p class="cadenza-eyebrow mb-3">Cadenza — engraver's desk</p>
      <p class="font-script text-4xl text-brass leading-none mb-2">Cadenza</p>
      <h1 class="font-blackletter text-ink mb-4">The desk is set.</h1>
      <p class="font-serif text-muted mb-6">
        Scaffolding is in place. Write on paper, with quality of life — the editor
        and your library arrive in the phases ahead.
      </p>

      <!-- Swatch row so the ported DS tokens are visible at a glance. -->
      <div class="flex gap-3 mb-7">
        <span class="w-10 h-10 rounded-sm border border-hairline bg-page" title="page"></span>
        <span class="w-10 h-10 rounded-sm border border-hairline bg-recess" title="recess"></span>
        <span class="w-10 h-10 rounded-sm border border-hairline bg-brass" title="brass"></span>
        <span class="w-10 h-10 rounded-sm border border-hairline bg-oxblood" title="oxblood"></span>
        <span class="w-10 h-10 rounded-sm border border-hairline bg-wood" title="walnut"></span>
      </div>

      <button
        class="font-sans font-medium bg-oxblood text-inverse px-5 py-2.5 rounded-sm shadow-paper hover:bg-brass-hi"
        style="transition: var(--t-control)"
      >
        New score
      </button>
    </div>
  </main>
</template>
