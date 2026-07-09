<script setup>
// A sheet of warm paper: hairline border, small radius, soft warm shadow, and
// the faint foxing texture from the design system (.cadenza-paper). Pass `tilt`
// for the design system's controlled asymmetry — a barely-there lean, as if the
// sheet were set down on a desk.
defineProps({
  tilt: { type: Boolean, default: false },
  flush: { type: Boolean, default: false } // drop inner padding for custom layouts
})
</script>

<template>
  <section
    class="paper-card cadenza-paper"
    :class="{ 'paper-card--tilt': tilt, 'paper-card--flush': flush }"
  >
    <div class="paper-card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.paper-card {
  background: var(--surface-card);
  border: var(--border-hair) solid var(--border-hairline);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-paper);
}

/* Keep content above the foxing overlay that .cadenza-paper paints via ::after. */
.paper-card__body {
  position: relative;
  z-index: 1;
  padding: var(--pad-card);
}

.paper-card--flush .paper-card__body {
  padding: 0;
}

.paper-card--tilt {
  transform: rotate(-0.5deg);
}
</style>
