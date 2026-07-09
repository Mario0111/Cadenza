import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Tailwind first (its preflight reset), then the Cadenza design tokens — whose
// base.css deliberately overrides preflight for editorial defaults — then print.
import './assets/styles/tailwind.css'
import './assets/styles/tokens.css'
import './assets/styles/print.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
