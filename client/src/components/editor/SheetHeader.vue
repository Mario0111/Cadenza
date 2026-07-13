<script setup>
// SheetHeader — the engraved plate header, editable. It sits ON the manuscript
// plate and mirrors the printed sheet exactly: title centred in the display
// face, description centred in italic serif, and the credits line just above
// the music — tempo on the left, composer on the right — the classical
// engraved layout. Each field is an input dressed as the printed text: what
// you write here is what the sheet prints.
//
// A dumb props/emits component (like FingeringControls): it renders the fields
// and reports edits; the store owns the score and does any validating.
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  bpm: { type: Number, default: null },
  composer: { type: String, default: '' }
})

const emit = defineEmits([
  'update:title',
  'update:description',
  'update:bpm',
  'update:composer'
])

// The tempo input gives us a string; the model keeps a number or null (an
// emptied field clears the tempo). A non-number simply never reaches the
// store — its guard would drop it anyway.
function onBpmInput(value) {
  const trimmed = value.trim()
  if (trimmed === '') {
    emit('update:bpm', null)
    return
  }
  const parsed = Number(trimmed)
  if (Number.isInteger(parsed)) emit('update:bpm', parsed)
}
</script>

<template>
  <header class="sheet-header">
    <input
      class="sheet-header__title"
      type="text"
      aria-label="Score title"
      placeholder="Untitled score"
      :value="title"
      @input="emit('update:title', $event.target.value)"
    />
    <input
      class="sheet-header__description"
      type="text"
      aria-label="Score description"
      placeholder="Add a description — optional"
      :value="description"
      @input="emit('update:description', $event.target.value)"
    />

    <!-- The credits line, the way an engraver sets it: tempo left, composer
         right, just above the first system. -->
    <div class="sheet-header__credits">
      <label class="sheet-header__tempo">
        <input
          class="sheet-header__tempo-input"
          type="text"
          inputmode="numeric"
          aria-label="Tempo in beats per minute"
          placeholder="Tempo"
          :value="bpm ?? ''"
          @input="onBpmInput($event.target.value)"
        />
        <span class="sheet-header__tempo-unit" aria-hidden="true">bpm</span>
      </label>
      <input
        class="sheet-header__composer"
        type="text"
        aria-label="Composer"
        placeholder="Composer — optional"
        :value="composer"
        @input="emit('update:composer', $event.target.value)"
      />
    </div>
  </header>
</template>

<style scoped>
.sheet-header {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-3);
}

/* Every field is written directly on the paper: transparent, no chrome, a
   hairline underneath only while you're actually writing in it — the same
   dress the editor's old title input wore, now in the printed text's own
   type. */
.sheet-header__title,
.sheet-header__description,
.sheet-header__tempo-input,
.sheet-header__composer {
  padding: 0;
  color: var(--text-primary);
  background: transparent;
  border: none;
  border-bottom: var(--border-hair) solid transparent;
  transition: var(--t-control);
}
.sheet-header__title:hover,
.sheet-header__description:hover,
.sheet-header__tempo-input:hover,
.sheet-header__composer:hover {
  border-bottom-color: var(--border-strong);
}
.sheet-header__title:focus-visible,
.sheet-header__description:focus-visible,
.sheet-header__tempo-input:focus-visible,
.sheet-header__composer:focus-visible {
  outline: none;
  border-bottom-color: var(--accent-brass);
}
.sheet-header__title::placeholder,
.sheet-header__description::placeholder,
.sheet-header__tempo-input::placeholder,
.sheet-header__composer::placeholder {
  color: var(--text-placeholder);
}

/* The printed title plate: centred, display face — print-sheet__title's twin. */
.sheet-header__title {
  width: 100%;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--fw-medium);
  text-align: center;
}

/* The printed description: centred italic serif — print-sheet__description's twin. */
.sheet-header__description {
  width: 100%;
  margin-top: var(--space-2);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--text-md);
  text-align: center;
}

/* Tempo left, composer right — the corners of the credits line. */
.sheet-header__credits {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-5);
  margin-top: var(--space-3);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--text-sm);
}

.sheet-header__tempo {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
}

.sheet-header__tempo-input {
  width: 4.5ch;
  font: inherit;
}

.sheet-header__tempo-unit {
  color: var(--text-muted);
}

.sheet-header__composer {
  width: 20ch;
  font: inherit;
  text-align: right;
}
</style>
