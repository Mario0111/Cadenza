<script setup>
// A labelled text input with an optional hint and an inline quiet-mark error.
// Works with v-model. When `error` is set the input gets a quiet-mark border and
// is wired to the error text via aria-describedby + aria-invalid for a11y.
import { computed } from 'vue'
import QuietMark from './QuietMark.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  autocomplete: { type: String, default: 'off' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' }
})
defineEmits(['update:modelValue'])

// A stable, unique id per field instance so <label>, <input> and the error
// message can reference each other. A simple module counter avoids depending on
// Vue's useId() (only added in 3.5).
const uid = `field-${nextId()}`
const errorId = computed(() => `${uid}-error`)
</script>

<script>
let counter = 0
function nextId() {
  counter += 1
  return counter
}
</script>

<template>
  <div class="form-field">
    <label class="form-field__label" :for="uid">{{ label }}</label>

    <input
      :id="uid"
      class="form-field__input"
      :class="{ 'form-field__input--mark': error }"
      :type="type"
      :value="modelValue"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? errorId : undefined"
      @input="$emit('update:modelValue', $event.target.value)"
    />

    <p v-if="hint && !error" class="form-field__hint">{{ hint }}</p>
    <QuietMark v-if="error" :id="errorId" :message="error" />
  </div>
</template>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-field__label {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--fw-medium);
  letter-spacing: var(--tracking-wide);
  color: var(--text-secondary);
}

.form-field__input {
  width: 100%;
  font-family: var(--font-serif);
  font-size: var(--text-md);
  color: var(--text-primary);
  background: var(--surface-card);
  border: var(--border-hair) solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 10px var(--space-4);
  box-shadow: var(--shadow-inset);
  transition: var(--t-control);
}

.form-field__input::placeholder {
  color: var(--text-placeholder);
}

/* Brass focus ring, always visible — the design system's accessibility rule. */
.form-field__input:focus-visible {
  outline: none;
  border-color: var(--accent-brass);
  box-shadow: var(--shadow-focus);
}

.form-field__input--mark {
  border-color: var(--state-mark-line);
}

.form-field__hint {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-xs);
  color: var(--text-muted);
}
</style>
