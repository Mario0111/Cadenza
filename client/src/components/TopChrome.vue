<script setup>
// The app's top chrome: a strip of dark walnut with the Cadenza wordmark, the
// main navigation, and the session actions. It reads the auth store directly, so
// it shows the signed-in nav (Library / Profile / Admin) or the signed-out
// actions (Sign in / New account) automatically.
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppButton from './AppButton.vue'

const auth = useAuthStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="top-chrome">
    <div class="top-chrome__inner">
      <RouterLink
        class="top-chrome__brand"
        :to="auth.isAuthenticated ? { name: 'library' } : { name: 'landing' }"
      >
        <span class="top-chrome__wordmark">Cadenza</span>
      </RouterLink>

      <nav v-if="auth.isAuthenticated" class="top-chrome__nav" aria-label="Main">
        <RouterLink class="top-chrome__link" :to="{ name: 'library' }">Library</RouterLink>
        <RouterLink class="top-chrome__link" :to="{ name: 'profile' }">Profile</RouterLink>
        <RouterLink v-if="auth.isAdmin" class="top-chrome__link" :to="{ name: 'admin' }">Admin</RouterLink>
      </nav>

      <div class="top-chrome__actions">
        <template v-if="auth.isAuthenticated">
          <span class="top-chrome__user">{{ auth.user?.name }}</span>
          <button class="top-chrome__logout" type="button" @click="handleLogout">Sign out</button>
        </template>
        <template v-else>
          <RouterLink class="top-chrome__link" :to="{ name: 'login' }">Sign in</RouterLink>
          <AppButton :to="{ name: 'register' }" variant="primary">New account</AppButton>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-chrome {
  position: sticky;
  top: 0;
  z-index: var(--z-chrome);
  background: var(--surface-wood);
  background-image: var(--texture-wood);
  border-bottom: var(--border-hair) solid var(--walnut-900);
  box-shadow: var(--shadow-sm);
}

.top-chrome__inner {
  display: flex;
  align-items: center;
  gap: var(--space-7);
  height: var(--topbar-h);
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 0 var(--space-7);
}

.top-chrome__brand {
  margin-right: var(--space-2);
  text-decoration: none;
}

.top-chrome__wordmark {
  font-family: var(--font-script);
  font-size: var(--text-lg);
  line-height: 1;
  color: var(--text-on-wood);
}

.top-chrome__nav {
  display: flex;
  gap: var(--space-6);
}

/* Nav + inline links sit on wood, so they use the on-wood brass, not the
   default oxblood link colour (which would be unreadable here). */
.top-chrome__link {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-wide);
  color: var(--text-on-wood);
  text-decoration: none;
  transition: var(--t-control);
}
.top-chrome__link:hover,
.top-chrome__link.router-link-active {
  color: var(--brass-100);
}

.top-chrome__actions {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  margin-left: auto;
}

.top-chrome__user {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-on-wood-2);
}

.top-chrome__logout {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-on-wood);
  background: transparent;
  border: var(--border-hair) solid var(--walnut-500);
  border-radius: var(--radius-sm);
  padding: 6px var(--space-4);
  cursor: pointer;
  transition: var(--t-control);
}
.top-chrome__logout:hover {
  border-color: var(--brass-500);
  color: var(--brass-100);
}
</style>
