<script setup>
// App shell: the top chrome on every page, with the routed page below it.
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import TopChrome from '@/components/TopChrome.vue'

const auth = useAuthStore()
const router = useRouter()

// On startup, if a saved token exists, quietly re-fetch the user from the server
// to confirm the session is still valid (and pick up any profile changes). An
// expired token signs us out cleanly; see the store's refresh().
//
// If that sign-out happens while a protected page is open, the page would
// render signed-out in place — so we hand over to the login page, carrying the
// same `redirect` query the router guard uses: signing back in returns here.
onMounted(async () => {
  await router.isReady() // the first navigation has settled; the route is real
  await auth.refresh()
  const route = router.currentRoute.value
  if (!auth.isAuthenticated && route.meta.requiresAuth) {
    router.replace({ name: 'login', query: { redirect: route.fullPath } })
  }
})
</script>

<template>
  <div class="app-shell">
    <TopChrome />
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-main {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-9) var(--space-7) var(--space-12);
}
</style>
