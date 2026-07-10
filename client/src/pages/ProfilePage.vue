<script setup>
// Your account — update name, email, and password in one quiet form.
//
// Only the fields that actually changed are sent (PUT /api/users/me is a
// partial update); the password travels only when you type a new one. On
// success the auth store adopts the fresh user, so the stored session and the
// name in the chrome stay in step.
import { reactive, ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { updateMe } from '@/api/users'
import { nameError, emailError, passwordError, confirmError } from '@/lib/formValidation'
import PaperCard from '@/components/PaperCard.vue'
import AppButton from '@/components/AppButton.vue'
import FormField from '@/components/FormField.vue'
import QuietMark from '@/components/QuietMark.vue'

const auth = useAuthStore()

const form = reactive({
  name: auth.user?.name ?? '',
  email: auth.user?.email ?? '',
  password: '',
  confirm: ''
})
const errors = reactive({ name: '', email: '', password: '', confirm: '' })
const formError = ref('')
const saved = ref(false)
const submitting = ref(false)

// The password is optional here (blank = keep the current one), so its rules
// only apply once something is typed in either field.
function validate() {
  errors.name = nameError(form.name)
  errors.email = emailError(form.email)
  errors.password = ''
  errors.confirm = ''
  if (form.password || form.confirm) {
    errors.password = passwordError(form.password)
    errors.confirm = confirmError(form.password, form.confirm)
  }
  return !errors.name && !errors.email && !errors.password && !errors.confirm
}

// Only what differs from the signed-in user goes into the request body.
const changes = computed(() => {
  const body = {}
  if (form.name.trim() !== auth.user?.name) body.name = form.name.trim()
  // The backend stores emails lowercased; compare the same way so retyping
  // your own address in different case doesn't count as a change.
  if (form.email.trim().toLowerCase() !== auth.user?.email) {
    body.email = form.email.trim()
  }
  if (form.password) body.password = form.password
  return body
})

// Any edit clears the stale outcome messages so they never outlive the truth.
function onEdit(field) {
  errors[field] = ''
  formError.value = ''
  saved.value = false
}

async function onSubmit() {
  formError.value = ''
  saved.value = false
  if (!validate()) return

  if (Object.keys(changes.value).length === 0) {
    formError.value = 'Nothing to save yet — everything is as you left it.'
    return
  }

  submitting.value = true
  try {
    const { user } = await updateMe(changes.value)
    auth.setUser(user)
    // Fresh fields, cleared passwords, quiet confirmation.
    form.name = user.name
    form.email = user.email
    form.password = ''
    form.confirm = ''
    saved.value = true
  } catch (err) {
    applyApiError(err)
  } finally {
    submitting.value = false
  }
}

// Put server-side feedback where it belongs: a duplicate email lands on the
// email field, per-field validation details land on their fields, and anything
// else becomes the quiet line under the form.
function applyApiError(err) {
  if (err.status === 409) {
    errors.email = err.message
    return
  }
  if (err.details?.length) {
    for (const detail of err.details) {
      if (detail.field in errors) {
        errors[detail.field] = detail.message
      }
    }
    return
  }
  formError.value = err.message || 'Something went wrong. Please try again.'
}
</script>

<template>
  <div class="profile-page">
    <PaperCard class="profile-card">
      <p class="cadenza-eyebrow">Your account</p>
      <h1 class="profile-card__title">Your details</h1>
      <p class="profile-card__lede">
        Change what you like — leave the password fields blank to keep your current one.
      </p>

      <form class="profile-form" novalidate @submit.prevent="onSubmit">
        <FormField
          v-model="form.name"
          label="Name"
          autocomplete="name"
          :error="errors.name"
          @update:model-value="onEdit('name')"
        />
        <FormField
          v-model="form.email"
          label="Email"
          type="email"
          autocomplete="email"
          :error="errors.email"
          @update:model-value="onEdit('email')"
        />
        <FormField
          v-model="form.password"
          label="New password"
          type="password"
          autocomplete="new-password"
          hint="At least 8 characters."
          :error="errors.password"
          @update:model-value="onEdit('password')"
        />
        <FormField
          v-model="form.confirm"
          label="Confirm new password"
          type="password"
          autocomplete="new-password"
          :error="errors.confirm"
          @update:model-value="onEdit('confirm')"
        />

        <QuietMark v-if="formError" :message="formError" />
        <QuietMark v-if="saved" tone="ok" message="Saved — your details are up to date." />

        <div>
          <AppButton type="submit" variant="primary" :loading="submitting">
            {{ submitting ? 'Saving…' : 'Save changes' }}
          </AppButton>
        </div>
      </form>
    </PaperCard>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
}

.profile-card {
  width: 100%;
  max-width: 34rem;
}

.profile-card__title {
  font-size: var(--text-xl);
  margin: var(--space-2) 0 var(--space-2);
}

.profile-card__lede {
  font-family: var(--font-serif);
  color: var(--text-secondary);
  margin-bottom: var(--space-8);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
</style>
