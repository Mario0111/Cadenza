<script setup>
// Phase 4a — read-only proof of the render pipeline. There is no input or API
// wiring yet: we render one hard-coded sample score three times, once in each
// display mode, so the notation stave, the tab stave, and the linked "both"
// view can all be seen working on the same data.
//
// The mode switcher, note input, and load/save arrive in 4b / 4c.
import { computed } from 'vue'
import PaperCard from '@/components/PaperCard.vue'
import ScoreCanvas from '@/components/editor/ScoreCanvas.vue'
import { makeSampleScore } from '@/lib/sampleScore'

// The same notes rendered under each display mode. Building three copies keeps
// the demo honest: each ScoreCanvas gets a score whose displayMode differs.
const modes = [
  { key: 'notation', label: 'Notation', note: 'Standard stave only.' },
  { key: 'tab', label: 'Tablature', note: 'Tab stave only — notes without fret data are left off.' },
  { key: 'both', label: 'Notation and tab', note: 'Tab under notation, linked at the line start.' }
]

const samples = computed(() => modes.map((mode) => ({ ...mode, score: makeSampleScore(mode.key) })))
</script>

<template>
  <section class="editor">
    <header class="editor__head">
      <p class="cadenza-eyebrow">The desk</p>
      <h1 class="editor__title">Render pipeline</h1>
      <p class="editor__lede">
        A sample score, shown in each display mode. Note input and editing arrive
        next — for now this proves the notation, tablature and combined views draw
        from the same data.
      </p>
    </header>

    <div class="editor__stack">
      <PaperCard v-for="sample in samples" :key="sample.key" class="editor__plate">
        <p class="cadenza-eyebrow">{{ sample.label }}</p>
        <p class="editor__plate-note">{{ sample.note }}</p>
        <ScoreCanvas :score="sample.score" />
      </PaperCard>
    </div>
  </section>
</template>

<style scoped>
.editor__head {
  margin-bottom: var(--space-8);
}
.editor__title {
  font-size: var(--text-xl);
  margin-bottom: var(--space-3);
}
.editor__lede {
  font-family: var(--font-serif);
  color: var(--text-secondary);
  max-width: 60ch;
}

.editor__stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.editor__plate-note {
  margin: var(--space-2) 0 var(--space-5);
  font-family: var(--font-serif);
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
