# Cadenza — project conventions

Cadenza is a guitar-focused music notation and tablature editor (school project).
Users create scores, save them to their account, and download or print them.

## Workflow rule (highest priority)

**Work happens in phases (see PLAN.md). Never start a new phase without Mario's
explicit confirmation.** At the end of each phase: stop, summarize what was built
and why, and wait for review/testing/commit. Mario must be able to understand and
explain every part of this project — prefer the explainable solution over the
impressive one.

## Stack (fixed by the assignment)

| Layer     | Choice                                      |
|-----------|---------------------------------------------|
| Frontend  | Vue 3 (Composition API, `<script setup>`) + Vite |
| Routing   | Vue Router 4                                |
| State     | Pinia                                       |
| Styling   | Tailwind CSS + Cadenza design tokens (CSS variables) |
| Notation  | VexFlow 4.x (rendering only — never the source of truth) |
| Backend   | Express.js (Node 20+)                       |
| Database  | MongoDB + Mongoose                          |
| Auth      | JWT (Bearer token) + bcrypt password hashing |
| PDF       | Client-side: VexFlow → SVG → svg2pdf.js + jsPDF |

## Folder structure

```
Cadenze/
├── CLAUDE.md, PLAN.md, README.md
├── client/                  # Vue app (Vite)
│   └── src/
│       ├── assets/styles/   # tokens.css (ported from Cadenza DS), tailwind entry, print.css
│       ├── components/      # shared UI (PaperCard.vue, QuietMark.vue, AppButton.vue, …)
│       │   └── editor/      # NoteToolbar.vue, ScoreCanvas.vue, FingeringControls.vue, …
│       ├── composables/     # useScoreRenderer.js, useMeasureValidation.js, …
│       ├── lib/             # pure logic, no Vue imports (durations.js, scoreModel.js)
│       ├── pages/           # LandingPage.vue, LoginPage.vue, EditorPage.vue, LibraryPage.vue,
│       │                    # ProfilePage.vue, AdminPage.vue, PrintPage.vue
│       ├── router/          # index.js (routes + auth guards)
│       ├── stores/          # auth.js, score.js (Pinia)
│       └── api/             # thin fetch wrappers per resource (auth.js, scores.js, users.js)
└── server/
    └── src/
        ├── config/          # db connection, env loading
        ├── models/          # User.js, Score.js (Mongoose)
        ├── routes/          # auth.routes.js, users.routes.js, scores.routes.js, admin.routes.js
        ├── controllers/     # one per route file, thin routes → controller functions
        ├── middleware/      # auth.js (JWT), admin.js, ownership.js, validate.js, errorHandler.js
        ├── validators/      # request validation schemas per endpoint
        └── app.js, server.js
```

## Naming conventions

- Vue components: `PascalCase.vue`, multi-word (`ScoreCard.vue`, never `Card.vue`).
- Pages end in `Page.vue`; composables start with `use`; Pinia stores are nouns (`auth`, `score`).
- JS files: camelCase; Mongoose models: PascalCase singular (`User`, `Score`).
- REST routes: plural kebab-case nouns (`/api/scores/:id`); route files `*.routes.js`.
- Events/props: Vue standard (`kebab-case` events in templates, `camelCase` props in JS).

## Code style

- **Readable over clever.** If a one-liner needs a comment to be understood, write it as
  three lines instead. No dense chaining, no magic.
- Comment *non-obvious logic only* — the "why", not the "what". Notation math (staff
  position → pitch, duration ticks, measure width calculation) always gets a comment.
- Proper componentization: no god components. `EditorPage.vue` composes
  `NoteToolbar`, `ScoreCanvas`, `FingeringControls`, etc.; each does one job.
- Pure score/duration logic lives in `client/src/lib/` (plain functions, unit-testable,
  no Vue), so it can be explained and tested in isolation.
- No mock data in the final version. Secrets only in `.env` (with `.env.example` committed).
- Backend: every write endpoint validated, centralized error handler, correct status
  codes (400 validation, 401 no/bad token, 403 not owner/not admin, 404, 409 duplicate email).

## Core design philosophy (overrides conventions from existing notation software)

The app should feel like **writing on paper, with quality of life** — not like MuseScore.

1. **No auto-fill, ever.** Adding a note never inserts rests, never pads or completes a
   measure, never forces rhythmic validity. Empty measures stay empty; half-finished
   measures stay half-finished.
2. **Tabs are never derived from notation** (and notation never derived from tabs).
   String and fret are optional, manual, per-note fields. A note without tab data simply
   does not appear on the tab stave.
3. **The user is allowed to be "wrong".** Five quarter notes in a 4/4 measure render
   fine. The only feedback is a *quiet mark* on that measure — a small icon/tint computed
   by summing note durations against the time signature. No popups, no blocking, no
   auto-correction, no harsh red.
4. **Quality of life = ease and neatness of input**, not correcting the user: clean
   snapping onto staff positions, the next note defaults to the last duration,
   keyboard-friendly input, and automatic horizontal spacing so measures grow/shrink
   with their contents and always look tidy.

## VexFlow rules

- VexFlow **renders** the score model; it is never the source of truth. Data → render,
  one direction.
- **Always soft-mode voices** (`voice.setMode(Vexflow.Voice.Mode.SOFT)` /
  `setStrict(false)`): strict mode throws on duration mismatches, and incomplete/overfull
  measures are a *feature* here, not an error.
- `Stave` for notation, `TabStave` for tablature, `StaveConnector` to link them in
  "tab under notation" mode.
- VexFlow's formatter aligns the staves' voices and lays out modifiers; the horizontal
  spacing itself follows the fixed per-figure rule in `lib/noteSpacing.js` (longer
  figure, a bit more room — deterministic, never proportional to time), and each
  measure's width comes from that same rule so measures hug their figures.
- Beams and slurs are manual: the note event's `beamed` / `slurred` flags, set by hand;
  the renderer joins adjacent flagged notes with `Beam` (eighths-or-shorter) or one
  `Curve` slur (any notes). Nothing is ever beamed or slurred automatically.
- The augmentation dot stays centred on its notehead — VexFlow's format pass lifts an
  on-line dot into the space above, and the renderer zeroes that shift after formatting.
- Left-hand fingering (1–4): `FretHandFinger` modifier near the notehead.
  Right-hand fingering (p/i/m/a): `Annotation` positioned below the note.
- Harmonics are manual too: the note event's `harmonic` flag draws VexFlow's
  natural-harmonic `Articulation('ah')` (a small circle) above the notation note,
  and the tab stave renders the flagged note's fret in angle brackets (`<12>`).
- **No custom canvas rendering.**

## Data model (source of truth)

Score: `title`, `description`, `bpm` (tempo in beats per minute, number | null),
`composer` (string, optional), `timeSignature`, `keySignature`,
`displayMode` (`notation` | `both`), `owner` (ref User), timestamps,
`measures[]`. Measure: `notes[]` (note events). Note event:

```js
{
  pitches: ["e/4", "g/4"],       // array → chords; empty/ignored when rest
  duration: "q",                  // w h q 8 16, dotted: boolean flag alongside
  dotted: false,
  isRest: false,
  beamed: false,                  // manual; adjacent flagged 8ths-or-shorter share one beam
  slurred: false,                 // manual; adjacent flagged notes share one slur curve
  harmonic: false,                // manual; circle above the note, <brackets> round the fret
  strings: [1, null],             // per-pitch, nullable — tabs are manual
  frets:   [0, null],             // per-pitch, nullable
  leftFinger: null,               // 1..4 | null
  rightFinger: null               // "p"|"i"|"m"|"a"|null
}
```

Stored as JSON (Mongoose Mixed/subdocuments) — no rhythmic validation at the DB layer,
consistent with the philosophy. User: `name`, `email` (unique), `passwordHash`,
`role` (`user` | `admin`), timestamps. One admin is seeded via script.

## Visual design — the Cadenza design system

Design references live in the attached "Cadenza-DS" package (extracted during planning;
tokens get ported into `client/src/assets/styles/`). Identity: *the desk of an
18th–19th-century music engraver* — aged ivory paper, engraved line-art, walnut chrome,
brass and oxblood accents. Function always wins; beauty supports it.

- **Colors**: only via the DS CSS variables (`--surface-*`, `--text-*`, `--accent-*`,
  `--state-*`) — never raw hex in components. Papers `#F3EAD5`/`#E9DDC3`, warm ink
  near-blacks, brass `#9A7B2E` (focus/accent), oxblood `#7A2E2B` (primary action and the
  quiet mark). No saturated color, never pure black, never harsh red.
- **Type**: Grenze Gotisch (plate titles), Cormorant Garamond (display), EB Garamond
  (body), Archivo (UI controls/tables), Pinyon Script (signature wordmark, sparingly),
  Bravura (music glyphs). All Google Fonts/CDN.
- **Voice & copy**: sentence case everywhere; address the user as "you"; errors are
  quiet observations with a way forward ("This measure is a beat short — no rush,
  fix it whenever."), never "Error"/"Invalid". No emoji, ever. Atelier vocabulary:
  score, desk, folio, "New score", quiet mark.
- **Surfaces**: cards are warm paper with hairline borders, small radii (2–8px), soft
  warm shadows, optional slight tilt (controlled asymmetry). Editorial, asymmetric
  layout — the manuscript sits proud but left of center. Motion is quiet and physical;
  nothing bounces.
- **Icons**: Lucide line icons (inline SVG, `currentColor`); Bravura for anything musical.
- **Accessibility**: AA contrast, brass focus ring always visible, errors never color
  alone (icon + words), keyboard path through the editor.
- The DS reference components are React (`.jsx`) — we **port the CSS tokens verbatim**
  and **re-implement components as Vue SFCs** with the same look, names, and props where
  sensible (PaperCard, QuietMark, EmptyState, TopChrome, ToolRail, NotePanel, …).
