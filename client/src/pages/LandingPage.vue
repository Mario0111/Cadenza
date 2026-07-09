<script setup>
// Public landing page. The invitation into Cadenza: what it is, and the two
// ways in. If you're already signed in, the primary action takes you straight
// to your library instead of the sign-up form.
import { useAuthStore } from '@/stores/auth'
import PaperCard from '@/components/PaperCard.vue'
import AppButton from '@/components/AppButton.vue'

const auth = useAuthStore()
</script>

<template>
  <section class="landing">
    <div class="landing__lede">
      <p class="cadenza-eyebrow">A guitarist's notation desk</p>
      <p class="landing__wordmark cadenza-script">Cadenza</p>
      <h1 class="landing__title">Write music the way you'd write on paper.</h1>
      <p class="landing__body">
        Notation and tablature for guitar, with the quiet quality of an engraver's
        desk. Add a note and nothing is filled in for you, nothing is corrected —
        empty measures stay empty, half-finished measures stay half-finished. The
        only nudge is a quiet mark when a measure runs short or long.
      </p>

      <div class="landing__actions">
        <AppButton
          v-if="auth.isAuthenticated"
          :to="{ name: 'library' }"
          variant="primary"
        >
          Go to your library
        </AppButton>
        <template v-else>
          <AppButton :to="{ name: 'register' }" variant="primary">New account</AppButton>
          <AppButton :to="{ name: 'login' }" variant="secondary">Sign in</AppButton>
        </template>
      </div>
    </div>

    <PaperCard class="landing__sheet" tilt>
      <p class="cadenza-eyebrow">The idea</p>
      <ul class="landing__points">
        <li><span>No auto-fill.</span> Adding a note never pads or completes a measure.</li>
        <li><span>Manual tabs.</span> String and fret are yours to set, never guessed from the notes.</li>
        <li><span>You're allowed to be wrong.</span> Feedback is a quiet mark, never a red alarm.</li>
        <li><span>Neat by default.</span> Clean snapping and spacing so your page always looks tidy.</li>
      </ul>
    </PaperCard>
  </section>
</template>

<style scoped>
.landing {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: var(--space-11);
  align-items: center;
  padding: var(--space-9) 0 var(--space-11);
}

/* The manuscript sits proud but left of centre — the design system's asymmetry. */
.landing__wordmark {
  font-size: var(--text-4xl);
  color: var(--accent-brass);
  margin: var(--space-2) 0 var(--space-4);
}

.landing__title {
  font-size: var(--text-2xl);
  max-width: 14ch;
  margin-bottom: var(--space-6);
}

.landing__body {
  font-family: var(--font-serif);
  font-size: var(--text-md);
  color: var(--text-secondary);
  max-width: 54ch;
  margin-bottom: var(--space-8);
}

.landing__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.landing__points {
  list-style: none;
  margin: var(--space-4) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.landing__points li {
  font-family: var(--font-serif);
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: var(--leading-snug);
}
.landing__points span {
  display: block;
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: var(--fw-semibold);
  color: var(--text-primary);
  margin-bottom: 2px;
}

/* On narrow screens the two columns stack. */
@media (max-width: 860px) {
  .landing {
    grid-template-columns: 1fr;
    gap: var(--space-9);
  }
}
</style>
