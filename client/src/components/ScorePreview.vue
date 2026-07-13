<script setup>
// A little manuscript for the library folio: the score's engraved title above
// the opening two systems of music, so a shelf of cards reads like a shelf of
// miniature sheets.
//
// It renders through the shared renderer (useScoreRenderer — the same one the
// editor and print sheet use), so the drawing and its line breaks match the
// real sheet; nothing new is drawn and VexFlow is never touched here. Two view
// tweaks make it a thumbnail: the score is drawn at the full sheet width and
// then scaled down to the card by giving the SVG a viewBox (CSS width:100%),
// and that viewBox is cropped to the first couple of systems so only the
// opening shows. Both are presentation only — the model is never changed.
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useScoreRenderer } from '@/composables/useScoreRenderer'
import { SHEET_WIDTH } from '@/lib/printSheet'

const props = defineProps({
  score: { type: Object, required: true }
})

const host = ref(null)
const { renderScore } = useScoreRenderer()

// Draw at the real sheet width so the preview's line breaks are the sheet's,
// then let the viewBox scale it down to the card — that scaling IS the "zoomed
// out" look.
const PREVIEW_PAGE_WIDTH = SHEET_WIDTH

// How much of the opening to show.
const PREVIEW_LINES = 2 // the first two systems
// Enough measures to fill two lines at the sheet width; more would only build
// VexFlow objects the crop hides. A safe upper bound, not an exact count.
const PREVIEW_MEASURES = 16

// These mirror useScoreRenderer's own layout: its systems are 130px (notation)
// or 264px (notation over tab) tall, drawn below a 10px top page margin. We use
// them to crop the viewBox to exactly PREVIEW_LINES systems.
const PAGE_MARGIN = 10
const systemHeight = computed(() =>
  props.score.displayMode === 'notation' ? 130 : 264
)

// Something to draw? Emptiness is "no notes anywhere". A note of ANY kind counts
// — a tab-only note has no pitches but is still content — so we look at
// notes.length, not measureFullness (which ignores tab-only notes and would
// read a pure-tab piece as empty).
const hasContent = computed(() =>
  (props.score.measures || []).some((measure) => measure.notes?.length)
)

// The opening handed to the renderer: the score's OWN display mode is kept (a
// tab piece previews with its tab; nothing is hidden or derived), sliced to
// just the opening measures. A shallow clone — the measure objects are shared
// and never mutated, the render is read-only.
const previewScore = computed(() => ({
  ...props.score,
  measures: (props.score.measures || []).slice(0, PREVIEW_MEASURES)
}))

function draw() {
  const el = host.value
  if (!el) return
  if (!hasContent.value) {
    el.innerHTML = ''
    return
  }
  renderScore(el, previewScore.value, { pageWidth: PREVIEW_PAGE_WIDTH })

  const svg = el.querySelector('svg')
  if (!svg) return
  // Crop to the opening lines and hand sizing to CSS. A viewBox lets the SVG
  // scale to the card (width:100%, height:auto), and a viewBox height shorter
  // than the full drawing hides everything past the first PREVIEW_LINES systems
  // — the SVG viewport clips it, so no extra overflow box is needed.
  const fullHeight = Number(svg.getAttribute('height')) || 0
  const cropHeight = Math.min(fullHeight, PAGE_MARGIN + PREVIEW_LINES * systemHeight.value)
  svg.setAttribute('viewBox', `0 0 ${PREVIEW_PAGE_WIDTH} ${cropHeight}`)
  svg.setAttribute('preserveAspectRatio', 'xMinYMin meet')
  // VexFlow writes a fixed pixel width/height as an INLINE style (which beats a
  // stylesheet rule), so override it here: width:100% + height:auto lets the
  // viewBox scale the drawing down to the card.
  svg.style.width = '100%'
  svg.style.height = 'auto'
  svg.removeAttribute('width')
  svg.removeAttribute('height')
}

onMounted(draw)

// Redraw when the score changes (a rename hands us a fresh object). deep because
// edits live inside measures[]/notes[]; nextTick so the host exists if the
// empty ↔ content branch just flipped.
watch(
  () => props.score,
  () => nextTick(draw),
  { deep: true }
)
</script>

<template>
  <RouterLink
    class="score-preview"
    :to="{ name: 'editor', params: { id: score.id } }"
    :aria-label="`Open ${score.title}`"
  >
    <!-- The engraved plate title, the way a real sheet carries its name. -->
    <p class="score-preview__title">{{ score.title }}</p>

    <!-- The music, or a calm placeholder when nothing is written yet. -->
    <div v-if="hasContent" ref="host" class="score-preview__canvas"></div>
    <span v-else class="score-preview__empty">Empty score</span>
  </RouterLink>
</template>

<style scoped>
/* Warm paper, hairline border, small radius — the same surfaces as PaperCard.
   A block RouterLink: the whole miniature is a second way into the editor. */
.score-preview {
  display: block;
  overflow: hidden;
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background: var(--surface-card);
  border: var(--border-hair) solid var(--border-hairline);
  border-radius: var(--radius-md);
  transition: var(--t-control);
}
.score-preview:hover {
  border-color: var(--border-strong);
}
/* Brass focus ring, always visible. */
.score-preview:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

/* The plate title — engraved display face, one tidy line that trims if long. */
.score-preview__title {
  margin: 0 0 var(--space-2);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--text-primary);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* The canvas holds the renderer's SVG. It never intercepts the link's clicks
   (it's non-interactive), and the SVG scales to the card via its viewBox. */
.score-preview__canvas {
  pointer-events: none;
}
.score-preview__canvas :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

/* A calm placeholder for a score with nothing written yet — an aged-cream well,
   quiet muted words, never a blank or broken box. */
.score-preview__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88px;
  background: var(--surface-recess);
  border-radius: var(--radius-sm);
  font-family: var(--font-serif);
  color: var(--text-muted);
}
</style>
