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
import { beatGlyph } from '@/lib/durations'

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

/*
 * Cropping paddings, in the drawing's own px. The sheet reserves generous
 * ledger territory above and below every staff (30px+ of headroom for notes up
 * to c/7); a thumbnail cropped that loosely floats its music in blank paper.
 * So the crop hugs the staves instead, keeping just a couple of ledger lines'
 * room — an extreme high or low note may clip in the miniature, which is a
 * fair trade for a preview that sits close to its header.
 */
const CROP_PAD = 25 // above the top staff line / below the bottom one (2.5 spacings)

/*
 * Every card shows the music at the SAME zoom (Mario's call): the crop is
 * always a full engraving line wide, whatever the score holds, so a shelf of
 * cards reads at one scale — a short piece simply shows less ink. The line
 * runs from the measures' left edge (the page margin) to where the renderer
 * wraps rows (pageWidth minus the margin).
 */
const CROP_WIDTH = PREVIEW_PAGE_WIDTH - 2 * PAGE_MARGIN

function draw() {
  const el = host.value
  if (!el) return
  if (!hasContent.value) {
    el.innerHTML = ''
    return
  }
  const layout = renderScore(el, previewScore.value, { pageWidth: PREVIEW_PAGE_WIDTH })

  const svg = el.querySelector('svg')
  if (!svg || !layout) return

  /*
   * Crop the viewBox VERTICALLY to the music's own box, read from the
   * renderer's layout report, and hand sizing to CSS (width:100%,
   * height:auto). The width stays the fixed CROP_WIDTH — that constant is
   * what keeps every card at one zoom — while the vertical crop trims the
   * sheet's empty ledger headroom so the music tucks up under the credits
   * line. Everything past the first PREVIEW_LINES systems falls outside the
   * viewBox, so no extra overflow box is needed.
   */
  const cut = PAGE_MARGIN + PREVIEW_LINES * systemHeight.value
  const visible = layout.measures.filter((m) => m.hitTop < cut)
  if (!visible.length) return

  // Vertical: a little above the first row's top staff line, a little below
  // the last visible row's bottom line (the tab stave's, when there is one —
  // it hangs lower). Staves have 5 lines, tab staves 6.
  const top = Math.min(...visible.map((m) => m.topLineY ?? m.tabTopLineY)) - CROP_PAD
  const bottom =
    Math.max(
      ...visible.map((m) =>
        m.tabTopLineY != null
          ? m.tabTopLineY + 5 * m.tabLineSpacing
          : m.topLineY + 4 * m.lineSpacing
      )
    ) + CROP_PAD

  svg.setAttribute('viewBox', `${PAGE_MARGIN} ${top} ${CROP_WIDTH} ${bottom - top}`)
  svg.setAttribute('preserveAspectRatio', 'xMinYMin meet')
  // VexFlow writes a fixed pixel width/height as an INLINE style (which beats a
  // stylesheet rule), so override it here: width:100% + height:auto lets the
  // viewBox scale the drawing to the card.
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
    <!-- The printed sheet's header at miniature scale: title, description and
         the credits line — the same pieces, under the same conditions, as
         PrintPage shows them. -->
    <p class="score-preview__title">{{ score.title }}</p>
    <p v-if="score.description" class="score-preview__description">{{ score.description }}</p>
    <div v-if="score.bpm || score.composer" class="score-preview__credits">
      <span v-if="score.bpm" class="score-preview__tempo">
        <span class="score-preview__tempo-figure" aria-hidden="true">{{
          beatGlyph(score.beatUnit, score.beatDotted)
        }}</span>
        = {{ score.bpm }}
      </span>
      <span v-if="score.composer" class="score-preview__composer">{{ score.composer }}</span>
    </div>

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

/* The printed description, miniature: centred italic serif, one trimmed line
   so a long note never squeezes the music out of the card. */
.score-preview__description {
  margin: 0 0 var(--space-2);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--text-xs);
  color: var(--text-primary);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* The credits line, miniature: tempo left, composer right, like the sheet. */
.score-preview__credits {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  margin: 0 0 var(--space-2);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--text-xs);
  color: var(--text-primary);
}

/* The beat figure keeps the music face upright — an italic would slant the
   little note sideways. */
.score-preview__tempo-figure {
  font-family: var(--font-music);
  font-style: normal;
}

.score-preview__composer {
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The canvas holds the renderer's SVG. It never intercepts the link's clicks
   (it's non-interactive), and the SVG scales to the card via its viewBox.
   The colour matters: the renderer draws in the ink it reads off this
   element, and without a pin the RouterLink's oxblood leaks in (links wear
   --accent-oxblood in base.css) — the whole engraving went red. */
.score-preview__canvas {
  pointer-events: none;
  color: var(--text-primary);
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
