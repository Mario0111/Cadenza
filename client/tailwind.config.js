/**
 * Tailwind is wired to the Cadenza design tokens (the semantic CSS variables in
 * src/assets/styles/tokens/*.css). Components use classes like `bg-card`,
 * `text-ink`, `border-hairline`, `font-blackletter`, `shadow-paper` — never raw hex.
 *
 * Names here mirror the DS semantic aliases (--surface-*, --text-*, --accent-*,
 * --state-*). Because they map to var(--…) they don't support Tailwind's opacity
 * modifiers (e.g. `bg-card/50`) — deliberate, so colour lives in one place.
 */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces (--surface-*)
        page: 'var(--surface-page)',
        card: 'var(--surface-card)',
        recess: 'var(--surface-recess)',
        sunken: 'var(--surface-sunken)',
        hero: 'var(--surface-hero)',
        wood: 'var(--surface-wood)',
        'wood-2': 'var(--surface-wood-2)',

        // Text (--text-*)
        ink: 'var(--text-primary)',
        'ink-secondary': 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        placeholder: 'var(--text-placeholder)',
        inverse: 'var(--text-inverse)',
        'on-wood': 'var(--text-on-wood)',

        // Accents (--accent-*)
        brass: 'var(--accent-brass)',
        'brass-hi': 'var(--accent-brass-hi)',
        oxblood: 'var(--accent-oxblood)',

        // States (--state-*) — the quiet mark, and the rare confirm
        mark: 'var(--state-mark)',
        'mark-line': 'var(--state-mark-line)',
        ok: 'var(--state-ok)'
      },
      fontFamily: {
        display: 'var(--font-display)',
        blackletter: 'var(--font-blackletter)',
        script: 'var(--font-script)',
        serif: 'var(--font-serif)',
        sans: 'var(--font-sans)',
        music: 'var(--font-music)'
      },
      borderColor: {
        hairline: 'var(--border-hairline)',
        strong: 'var(--border-strong)',
        ink: 'var(--border-ink)'
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)'
      },
      boxShadow: {
        hair: 'var(--shadow-hair)',
        sm: 'var(--shadow-sm)',
        paper: 'var(--shadow-paper)',
        lift: 'var(--shadow-lift)',
        panel: 'var(--shadow-panel)',
        inset: 'var(--shadow-inset)',
        focus: 'var(--shadow-focus)'
      },
      ringColor: {
        brass: 'var(--accent-brass)'
      }
    }
  },
  plugins: []
}
