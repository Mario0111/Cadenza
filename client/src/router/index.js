import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/pages/LandingPage.vue'

// Real routes + auth guards land in Phase 3. This single route exists so the
// scaffold boots and renders the design system.
const routes = [
  {
    path: '/',
    name: 'landing',
    component: LandingPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
