<script setup>
// ScoreCanvas — a read-only rendering of one score model. It owns a plain
// container element and hands it to the VexFlow renderer; when the score (or its
// displayMode) changes, it re-renders. This component draws only — it never
// mutates the model, matching the one-way data → render rule.
import { ref, watch, onMounted } from 'vue'
import { useScoreRenderer } from '@/composables/useScoreRenderer'

const props = defineProps({
  // The score model to render (source of truth).
  score: { type: Object, required: true },
  // Width to wrap systems at. Defaults to the renderer's own default.
  pageWidth: { type: Number, default: 680 }
})

const host = ref(null)
const { renderScore } = useScoreRenderer()

function draw() {
  if (host.value) {
    renderScore(host.value, props.score, { pageWidth: props.pageWidth })
  }
}

onMounted(draw)

// Re-render whenever the model or the page width changes. `deep` because edits
// happen inside measures[]/notes[]; VexFlow needs a full redraw regardless.
watch(() => props.score, draw, { deep: true })
watch(() => props.pageWidth, draw)
</script>

<template>
  <!-- The renderer replaces the contents of this element with an <svg>. -->
  <div ref="host" class="score-canvas" aria-label="Rendered score"></div>
</template>

<style scoped>
.score-canvas {
  /* The renderer reads this resolved colour and draws the score in it, so the
     notation sits in engraving ink on the warm page instead of stark black. */
  color: var(--text-primary);
  overflow-x: auto;
}
</style>
