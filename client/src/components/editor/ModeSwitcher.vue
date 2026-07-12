<script setup>
// ModeSwitcher — a quiet segmented control for the score's display mode.
// The same measures render in any mode at any time; switching only changes
// which staves are drawn, never the data (displayMode is a score field, so
// the store action behind this marks the score unsaved like any other edit).
defineProps({
  modelValue: { type: String, required: true } // 'notation' | 'both'
})

defineEmits(['update:modelValue'])

// Two modes only: notation alone, or notation with tabs underneath. A
// tab-only view existed once and was cut (Mario, Phase 9 review) — the
// notation stave is the manuscript's anchor and always shows.
const MODES = [
  { value: 'notation', label: 'Notation' },
  { value: 'both', label: 'Both' }
]
</script>

<template>
  <div class="mode-switcher" role="group" aria-label="Display mode">
    <button
      v-for="mode in MODES"
      :key="mode.value"
      type="button"
      class="mode-switcher__option"
      :class="{ 'mode-switcher__option--active': modelValue === mode.value }"
      :aria-pressed="modelValue === mode.value"
      @click="$emit('update:modelValue', mode.value)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>

<style scoped>
/* One recessed strip; the chosen segment sits proud on card paper. */
.mode-switcher {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--surface-recess);
  border: var(--border-hair) solid var(--border-strong);
  border-radius: var(--radius-sm);
}

.mode-switcher__option {
  height: 28px;
  padding: 0 var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  background: transparent;
  border: var(--border-hair) solid transparent;
  border-radius: var(--radius-xs, 2px);
  cursor: pointer;
  transition: var(--t-control);
}

.mode-switcher__option:hover {
  color: var(--text-primary);
}

/* Brass focus ring, always visible. */
.mode-switcher__option:focus-visible {
  outline: none;
  border-color: var(--accent-brass);
  box-shadow: var(--shadow-focus);
}

.mode-switcher__option--active {
  background: var(--surface-card);
  border-color: var(--accent-brass);
  color: var(--text-primary);
}
</style>
