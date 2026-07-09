<script setup>
// Sign-in page. Light client validation (email shape + password present); the
// server decides whether they actually match. On success the store saves the
// session and we go to the library, or back to a ?redirect= target if a guard
// sent us here.
import { reactive, ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { emailError, requiredPasswordError } from '@/lib/formValidation'
import PaperCard from '@/components/PaperCard.vue'
import AppButton from '@/components/AppButton.vue'
import FormField from '@/components/FormField.vue'
import QuietMark from '@/components/QuietMark.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const formError = ref('')
const submitting = ref(false)

function validate() {
  errors.email = emailError(form.email)
  errors.password = requiredPasswordError(form.password)
  return !errors.email && !errors.password
}

async function onSubmit() {
  formError.value = ''
  if (!validate()) return

  submitting.value = true
  try {
    await auth.login({ email: form.email.trim(), password: form.password })
    const { redirect } = route.query
    router.push(typeof redirect === 'string' ? redirect : { name: 'library' })
  } catch (err) {
    // Login failures come back as a single 401 message, by design (the backend
    // doesn't reveal whether it was the email or the password).
    formError.value = err.message || 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <PaperCard class="auth-card">
      <p class="cadenza-eyebrow">Cadenza</p>
      <h1 class="auth-card__title">Back to your desk</h1>
      <p class="auth-card__lede">Sign in to open your library and pick up where you left off.</p>

      <form class="auth-form" novalidate @submit.prevent="onSubmit">
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
          autocomplete="current-password"
          :error="errors.password"
          @update:model-value="errors.password = ''"
        />

        <QuietMark v-if="formError" :message="formError" />

        <AppButton type="submit" variant="primary" block :loading="submitting">
          {{ submitting ? 'Signing in…' : 'Sign in' }}
        </AppButton>
      </form>

      <p class="auth-switch">
        New here?
        <RouterLink :to="{ name: 'register' }">Set up a desk</RouterLink>
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
