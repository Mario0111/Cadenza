<script setup>
// EmptyState — a calm, encouraging blank slate (empty library, no results).
// Ported from the Cadenza-DS reference: a large engraved music glyph in
// Bravura, an editorial title, a line of quiet copy, and an optional action
// via the default slot. Never a dead end.

// SMuFL glyphs for the few marks we need (Bravura maps these). The characters
// live in Unicode's private-use area (gClef U+E050, fClef U+E062, quarter note
// U+E1D5, quarter rest U+E4E5), so they look blank in most editors — they only
// take shape once Bravura renders them.
const GLYPHS = {
  gClef: '',
  fClef: '',
  quarter: '',
  restQuarter: ''
}

defineProps({
  glyph: { type: String, default: 'gClef' },
  title: { type: String, default: '' },
  description: { type: String, default: '' }
})
</script>

<template>
  <div class="empty-state">
    <span class="empty-state__glyph" aria-hidden="true">{{ GLYPHS[glyph] || GLYPHS.gClef }}</span>
    <h3 v-if="title" class="empty-state__title">{{ title }}</h3>
    <p v-if="description" class="empty-state__description">{{ description }}</p>
    <div v-if="$slots.default" class="empty-state__action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-10) var(--space-7);
  gap: var(--space-2);
}

.empty-state__glyph {
  font-family: 'Bravura', 'EB Garamond', serif;
  font-size: 72px;
  line-height: 1;
  color: var(--line-300);
  margin-bottom: var(--space-3);
}

.empty-state__title {
  font-family: var(--font-display);
  font-weight: var(--fw-medium);
  font-size: var(--text-lg);
  color: var(--ink-800);
  margin: 0;
}

.empty-state__description {
  font-family: var(--font-serif);
  font-size: var(--text-md);
  color: var(--text-muted);
  max-width: 42ch;
  margin: var(--space-1) 0 0;
  line-height: var(--leading-normal);
}

.empty-state__action {
  margin-top: var(--space-5);
}
</style>
