<script setup>
// PrintPage — the score as it leaves the desk: title, description and the
// engraved music on a white sheet, nothing else. On screen the sheet sits
// under a row of quiet actions (print, download PDF, back); when printing,
// everything marked .no-print disappears and only the sheet remains (see
// assets/styles/print.css). The PDF download copies the same sheet — the
// rendered SVG plus the header — via usePdfExport.
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getScore } from '@/api/scores'
import AppButton from '@/components/AppButton.vue'
import QuietMark from '@/components/QuietMark.vue'
import ScoreCanvas from '@/components/editor/ScoreCanvas.vue'
import { usePdfExport } from '@/composables/usePdfExport'
// The same fixed page width the editor uses, so this sheet shows exactly the
// systems and line breaks you saw while writing.
import { SHEET_WIDTH } from '@/lib/printSheet'

const route = useRoute()

const score = ref(null)
const loading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    const data = await getScore(route.params.id)
    score.value = data.score
  } catch (err) {
    // 404 and 403 read the same from this side of the desk: there is no such
    // score in your library. Anything else is a passing failure.
    loadError.value =
      err.status === 404 || err.status === 403
        ? "This score isn't in your library — it may have been deleted."
        : err.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
})

// The sheet element: the PDF export reads the rendered SVG and the resolved
// ink colour straight off it, so PDF and sheet can't drift apart.
const sheet = ref(null)
const { exporting, exportError, downloadPdf } = usePdfExport()

function onDownloadPdf() {
  downloadPdf(sheet.value, score.value)
}

function onPrint() {
  window.print()
}
</script>

<template>
  <section class="print-page">
    <!-- A score that isn't here — a quiet dead end with a way forward. -->
    <template v-if="loadError">
      <header class="print-page__head">
        <p class="cadenza-eyebrow">Print</p>
      </header>
      <QuietMark :message="loadError" />
      <div class="print-page__error-actions">
        <AppButton variant="secondary" :to="{ name: 'library' }">Back to your library</AppButton>
      </div>
    </template>

    <p v-else-if="loading" class="print-page__loading">Fetching your score…</p>

    <template v-else>
      <!-- Everything above the sheet is screen chrome — none of it prints. -->
      <header class="print-page__head no-print">
        <p class="cadenza-eyebrow">Print</p>
        <div class="print-page__bar">
          <p class="print-page__note">The sheet below is exactly what prints and downloads.</p>
          <div class="print-page__actions">
            <AppButton variant="primary" @click="onPrint">Print</AppButton>
            <AppButton variant="secondary" :loading="exporting" @click="onDownloadPdf">
              {{ exporting ? 'Preparing…' : 'Download PDF' }}
            </AppButton>
            <AppButton variant="ghost" :to="{ name: 'editor', params: { id: score.id } }">
              Open in the editor
            </AppButton>
            <AppButton variant="ghost" :to="{ name: 'library' }">Back to your library</AppButton>
          </div>
        </div>
        <QuietMark v-if="exportError" :message="exportError" />
      </header>

      <!-- The sheet. White paper (see print.css), engraved header, the score
           rendered read-only with the editor's quiet marks switched off. -->
      <div ref="sheet" class="print-sheet">
        <h1 class="print-sheet__title">{{ score.title || 'Untitled score' }}</h1>
        <p v-if="score.description" class="print-sheet__description">{{ score.description }}</p>
        <ScoreCanvas :score="score" :page-width="SHEET_WIDTH" :show-marks="false" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.print-page__head {
  margin-bottom: var(--space-6);
}

/* The note on the left, the actions on the right; wraps quietly when narrow. */
.print-page__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  flex-wrap: wrap;
  margin-top: var(--space-2);
}

.print-page__note {
  font-family: var(--font-serif);
  font-style: italic;
  color: var(--text-muted);
  margin: 0;
}

.print-page__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.print-page__loading {
  font-family: var(--font-serif);
  font-style: italic;
  color: var(--text-muted);
}

.print-page__error-actions {
  margin-top: var(--space-4);
}

/* The sheet's shape and dress. Its white paper and print behaviour live in
   print.css (the one place raw white is allowed); here is only layout. The
   width is the engraving plus its padding, so the sheet hugs the score. */
.print-sheet {
  width: fit-content;
  max-width: 100%;
  padding: var(--space-8) var(--space-7);
  border: var(--border-hair) solid var(--border-hairline);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-paper);
}

/* The engraved header: centered, all in ink, the classical title plate.
   Kept to --text-primary on purpose — the PDF draws its header in the same
   single ink, so sheet and download stay twins. */
.print-sheet__title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--fw-medium);
  color: var(--text-primary);
  text-align: center;
  margin: 0;
  overflow-wrap: anywhere;
}

.print-sheet__description {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--text-md);
  color: var(--text-primary);
  text-align: center;
  margin: var(--space-2) 0 0;
  overflow-wrap: anywhere;
}

/* Air between the header and the engraving (the SVG only carries 10px of its
   own top margin). */
.print-sheet :deep(.score-canvas__frame) {
  margin-top: var(--space-4);
}
</style>
