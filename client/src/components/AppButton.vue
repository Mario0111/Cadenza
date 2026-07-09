<script setup>
// The one button in the app. Three quiet variants:
//   primary   — the rare, deliberate action (oxblood on paper)
//   secondary — the common action (paper with a hairline)
//   ghost     — tertiary / nav actions (no chrome until hovered)
//
// Pass `to` to render it as a <router-link> instead of a <button> (same look),
// so "New score" links and real submit buttons share one style.
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  variant: { type: String, default: 'primary' },
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  to: { type: [String, Object], default: null }
})

const tag = computed(() => (props.to ? RouterLink : 'button'))
const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <component
    :is="tag"
    :to="to || undefined"
    :type="to ? undefined : type"
    :disabled="!to ? isDisabled : undefined"
    :aria-disabled="isDisabled || undefined"
    class="app-button"
    :class="[`app-button--${variant}`, { 'app-button--block': block }]"
  >
    <slot />
  </component>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  letter-spacing: var(--tracking-wide);
  line-height: 1;
  padding: 10px var(--space-6);
  border-radius: var(--radius-sm);
  border: var(--border-hair) solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: var(--t-control);
  user-select: none;
}

.app-button--block {
  width: 100%;
}

.app-button[disabled],
.app-button[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.55;
}

/* Primary — deliberate action. */
.app-button--primary {
  background: var(--accent-oxblood);
  color: var(--text-inverse);
  box-shadow: var(--shadow-paper);
}
.app-button--primary:hover:not([disabled]):not([aria-disabled='true']) {
  background: var(--oxblood-700);
}

/* Secondary — common action. */
.app-button--secondary {
  background: var(--surface-card);
  color: var(--text-primary);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}
.app-button--secondary:hover:not([disabled]):not([aria-disabled='true']) {
  border-color: var(--accent-brass);
  color: var(--accent-oxblood);
}

/* Ghost — tertiary / nav. */
.app-button--ghost {
  background: transparent;
  color: var(--text-secondary);
}
.app-button--ghost:hover:not([disabled]):not([aria-disabled='true']) {
  background: var(--surface-recess);
  color: var(--text-primary);
}
</style>
