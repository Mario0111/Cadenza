<script setup>
// The quiet mark — Cadenza's one way of flagging something.
//
// It is never colour alone: a small line icon always rides with the words, in
// oxblood (never harsh red). Used for form errors now, and for the measure
// "beat is short" mark later. `tone` is 'mark' (an observation) or 'ok' (the
// rare confirm). Pass `id` so an input can point at it with aria-describedby.
defineProps({
  message: { type: String, default: '' },
  tone: { type: String, default: 'mark' },
  id: { type: String, default: null }
})
</script>

<template>
  <p
    v-if="message || $slots.default"
    :id="id"
    class="quiet-mark"
    :class="`quiet-mark--${tone}`"
    role="status"
    aria-live="polite"
  >
    <svg
      class="quiet-mark__icon"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <!-- ok → a check; mark → a soft alert-circle. Lucide line style. -->
      <path v-if="tone === 'ok'" d="M20 6 9 17l-5-5" />
      <template v-else>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </template>
    </svg>
    <span class="quiet-mark__text"><slot>{{ message }}</slot></span>
  </p>
</template>

<style scoped>
.quiet-mark {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin: var(--space-3) 0 0;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: var(--leading-snug);
}

.quiet-mark--mark {
  color: var(--state-mark-line);
}

.quiet-mark--ok {
  color: var(--state-ok);
}

.quiet-mark__icon {
  flex: none;
  margin-top: 1px;
}
</style>
