<script setup>
// App shell: the top chrome on every page, with the routed page below it.
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import TopChrome from '@/components/TopChrome.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

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
    <main class="app-main" :class="{ 'app-main--wide': route.meta.wideDesk }">
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

/* The editor's desk (rail + plate + fingering panel) needs 1152px of columns
   plus this main's 48px padding — exactly the standard 1200px cap, so any
   rounding or the browser's own scrollbar squeezed the sheet into a sideways
   scrollbar. 40px of headroom lets it simply fit (Mario's call). */
.app-main--wide {
  max-width: calc(var(--content-max) + 40px);
}
</style>
