import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import LandingPage from '@/pages/LandingPage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import RegisterPage from '@/pages/RegisterPage.vue'
import LibraryPage from '@/pages/LibraryPage.vue'
import EditorPage from '@/pages/EditorPage.vue'
import ProfilePage from '@/pages/ProfilePage.vue'
import AdminPage from '@/pages/AdminPage.vue'
import PrintPage from '@/pages/PrintPage.vue'

// Route meta drives the guard below:
//   requiresAuth  — must be signed in (else → login, remembering where you were)
//   requiresAdmin — must also be an admin (else → your library)
//   guestOnly     — only for signed-out visitors (else → your library)
//   wideDesk      — the page gets a wider content cap (the editor's three
//                   columns don't fit the standard width; see App.vue)
const routes = [
  { path: '/', name: 'landing', component: LandingPage },
  { path: '/login', name: 'login', component: LoginPage, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterPage, meta: { guestOnly: true } },

  { path: '/library', name: 'library', component: LibraryPage, meta: { requiresAuth: true } },
  // :id? — the editor works both for a new score and an existing one.
  { path: '/editor/:id?', name: 'editor', component: EditorPage, meta: { requiresAuth: true, wideDesk: true } },
  { path: '/profile', name: 'profile', component: ProfilePage, meta: { requiresAuth: true } },
  { path: '/admin', name: 'admin', component: AdminPage, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/print/:id', name: 'print', component: PrintPage, meta: { requiresAuth: true } },

  // Unknown paths fall back to the landing page.
  { path: '/:pathMatch(.*)*', redirect: { name: 'landing' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  // Every navigation starts at the top of the page.
  scrollBehavior() {
    return { top: 0 }
  }
})

// One central auth guard. The auth store hydrates from localStorage when it's
// created, so even on a hard refresh isAuthenticated/isAdmin are already correct
// here — no need to await anything.
router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // Send them to sign in, remembering the destination to return to after.
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    // Signed in but not an admin: quietly send them to their own library.
    return { name: 'library' }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    // Already signed in — no reason to see login/register.
    return { name: 'library' }
  }

  return true
})

export default router
