<script setup>
// Create-account page. Validates client-side (mirroring the backend rules) and,
// on success, the auth store saves the session and we land on the library —
// honouring a ?redirect= if the guard sent us here from a protected route.
import { reactive, ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { nameError, emailError, passwordError, confirmError } from '@/lib/formValidation'
import PaperCard from '@/components/PaperCard.vue'
import AppButton from '@/components/AppButton.vue'
import FormField from '@/components/FormField.vue'
import QuietMark from '@/components/QuietMark.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ name: '', email: '', password: '', confirm: '' })
const errors = reactive({ name: '', email: '', password: '', confirm: '' })
const formError = ref('') // server / form-level message (not tied to one field)
const submitting = ref(false)

function validate() {
  errors.name = nameError(form.name)
  errors.email = emailError(form.email)
  errors.password = passwordError(form.password)
  errors.confirm = confirmError(form.password, form.confirm)
  return !errors.name && !errors.email && !errors.password && !errors.confirm
}

async function onSubmit() {
  formError.value = ''
  if (!validate()) return

  submitting.value = true
  try {
    await auth.register({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password
    })
    const { redirect } = route.query
    router.push(typeof redirect === 'string' ? redirect : { name: 'library' })
  } catch (err) {
    applyServerError(err)
  } finally {
    submitting.value = false
  }
}

// Fold a server error back into the form: field-level validation details land
// on their field; anything else (e.g. 409 email taken) becomes a form-level mark.
function applyServerError(err) {
  if (err.details?.length) {
    for (const detail of err.details) {
      if (detail.field in errors) errors[detail.field] = detail.message
    }
    return
  }
  formError.value = err.message || 'Something went wrong. Please try again.'
}
</script>

<template>
  <div class="auth-page">
    <PaperCard class="auth-card">
      <p class="cadenza-eyebrow">Cadenza</p>
      <h1 class="auth-card__title">Set up your desk</h1>
      <p class="auth-card__lede">A folio of your own — create scores, save them, and come back to them.</p>

      <form class="auth-form" novalidate @submit.prevent="onSubmit">
        <FormField
          v-model="form.name"
          label="Your name"
          autocomplete="name"
          :error="errors.name"
          @update:model-value="errors.name = ''"
        />
        <FormField
          v-model="form.email"
          label="Email"
          type="email"
          autocomplete="email"
          :error="errors.email"
          @update:model-value="errors.email = ''"
        />
        <FormField
          v-model="form.password"
          label="Password"
          type="password"
          autocomplete="new-password"
          hint="At least 8 characters."
          :error="errors.password"
          @update:model-value="errors.password = ''"
        />
        <FormField
          v-model="form.confirm"
          label="Confirm password"
          type="password"
          autocomplete="new-password"
          :error="errors.confirm"
          @update:model-value="errors.confirm = ''"
        />

        <QuietMark v-if="formError" :message="formError" />

        <AppButton type="submit" variant="primary" block :loading="submitting">
          {{ submitting ? 'Setting up…' : 'Create account' }}
        </AppButton>
      </form>

      <p class="auth-switch">
        Already have a desk here?
        <RouterLink :to="{ name: 'login' }">Sign in</RouterLink>
      </p>
    </PaperCard>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  padding: var(--space-8) 0;
}

.auth-card {
  width: 100%;
  max-width: 30rem;
}

.auth-card__title {
  font-size: var(--text-xl);
  margin-bottom: var(--space-2);
}

.auth-card__lede {
  font-family: var(--font-serif);
  color: var(--text-secondary);
  margin-bottom: var(--space-8);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.auth-switch {
  margin: var(--space-8) 0 0;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
