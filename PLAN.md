# Cadenza — build plan

Phased build plan. **No phase starts without Mario's explicit confirmation.**
At the end of each phase I stop, summarize what was built and why, and wait for you
to review, test, and commit. Check items off as they land.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · 🛑 = review gate (stop here).

---

## Phase 0 — planning (this step)
- [x] Read the attached Cadenza design system references
- [x] Write `CLAUDE.md` (conventions, stack, design philosophy, VexFlow rules, data model)
- [x] Write `PLAN.md` (this file)
- 🛑 **Confirm PLAN.md before Phase 1.**

---

## Phase 1 — scaffolding + backend auth + user model
Goal: a running client and server skeleton, and a working account system.
- [x] Repo layout: `client/` (Vite + Vue 3 + Router + Pinia + Tailwind) and `server/` (Express)
- [x] Port Cadenza design tokens into `client/src/assets/styles/` (colors, type, spacing); wire Tailwind to the CSS variables; load the Google/Bravura fonts
- [x] Server: Express app, MongoDB/Mongoose connection, `.env` + `.env.example`, config loader
- [x] `User` model: name, email (unique), passwordHash, role; bcrypt hashing
- [x] Auth: `POST /api/auth/register`, `POST /api/auth/login` → JWT; validation + correct status codes
- [x] JWT auth middleware; `GET/PUT /api/users/me`
- [x] Centralized error handler + 404 handler
- [x] Seed script for one admin
- [~] Manual test: register, login, hit `/users/me` with the token
      (wiring/validation/401/404 verified automatically; DB round-trip pending
      a running MongoDB — Mario to run)
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 2 — score data model + score CRUD API
Goal: scores persist per user with ownership enforced.
- [x] `Score` model (title, description, timeSignature, keySignature, displayMode, owner,
      measures[] as JSON) — no rhythmic validation at the DB layer (per philosophy)
- [x] `GET /api/scores` (owner's list), `POST /api/scores`
- [x] `GET/PUT/DELETE /api/scores/:id` with ownership checks (403 if not owner)
- [x] Input validation on every write endpoint; validators per route
      (`loadOwnedScore` ownership middleware keeps the item routes thin)
- [~] Manual test: full CRUD as two different users, confirm isolation
      (imports/build verified automatically; DB round-trip pending Mario's run)
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 3 — frontend shell, routing, auth pages, Pinia auth store
Goal: you can register/log in from the UI and move between protected pages.
- [x] Vue Router with routes: Landing (public), Login/Register, Editor, Library, Profile,
      Admin, Print; auth guards (protected + admin-only)
- [x] Pinia `auth` store: token persistence, current user, login/register/logout actions
- [x] API layer (`src/api/`) with fetch wrappers + auth header injection
      (`token.js`, `client.js` + `ApiError`, `auth.js`, `users.js`, `scores.js`)
- [x] Shared DS components as Vue SFCs: `PaperCard`, `QuietMark`, `AppButton`, `TopChrome`,
      form inputs (`FormField`)
- [x] Landing page (public), Login/Register pages with client-side validation
      (required, email format, min password length, confirmation match, inline quiet-mark errors)
      — pure validators in `lib/formValidation.js`, mirroring the backend messages
- [x] App shell / navigation (TopChrome)
- [~] Manual test: register → land on library, logout, guard redirects
      (build passes; guard redirects + client validation + DS styling verified in the
      browser with the backend down; register/login round-trip pending Mario's run with
      MongoDB + server up)
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 4 — the editor with VexFlow rendering (the big one)
Split into sub-phases; each is its own review gate.

### 4a — render pipeline (read-only)
- [x] `lib/scoreModel.js` + `lib/durations.js` (pure, no Vue): duration→ticks, dotted,
      next-note defaults, measure fullness — 20 assertions pass headlessly
- [x] `useScoreRenderer` composable: model → VexFlow, **soft-mode voices everywhere**
      (`setStrict(false)` + `Voice.Mode.SOFT`)
- [x] `ScoreCanvas.vue`: Stave (notation), TabStave, StaveConnector for "tab under notation";
      honors displayMode (notation | tab | both)
- [x] Per-measure width from note density (`preCalculateMinTotalWidth`), clamped and
      line-wrapped; VexFlow formatter for spacing
- [x] Render a hard-coded sample score in all three display modes (`lib/sampleScore.js`,
      shown on the Editor page) — chord, dotted note, rest, tab-less note, overfull and
      empty measures all included
- [~] Installed `vexflow@4` (4.2.5) — wasn't a Phase 3 dep. Build passes; VexFlow API
      usage verified against the installed version. Visual review of the rendered score
      pending Mario's run.
- 🛑 **Stop, summarize, wait for review + commit.**

### 4b — note input + editing
- [x] `NoteToolbar.vue`: duration (w h q 8 16 32), dot, rest; next-note duration default
      (the "pen" in the score store). Accidentals were not in the 4b brief — deferred.
- [x] Add note by clicking a staff position — click y → line/space → pitch is pure,
      commented math in `lib/pitches.js` + `lib/staffGeometry.js` (40 assertions pass
      headlessly); the renderer returns a layout report, so no reaching into VexFlow
- [x] Select an existing note (notehead or tab digit) to edit or delete; brass
      selection tint; full keyboard path (arrows transpose/move, a–g re-letter,
      1–6 duration, `.` dot, `r` rest, `n`/Enter next note, Delete, Escape)
- [x] Add / remove measures freely, including empty ones (no auto-fill anywhere);
      a score keeps at least one measure
- [x] Pinia `stores/score.js` owns the working score + selection + pen
      (still seeded from the 4a sample until the API wiring in 4c)
- [~] Manual test: exercised end to end in the browser (click input, snapping,
      selection, keyboard editing, measure add/remove — no console errors);
      Mario's hands-on run pending
- 🛑 **Stop, summarize, wait for review + commit.**

### 4c — tab, fingering, quiet mark, mode switch
- [x] `FingeringControls.vue`: optional per-pitch string/fret, left-hand 1–4, right-hand p/i/m/a
      (dumb props/emits panel; store actions validate ranges and mark unsaved)
- [x] Render left-hand via `FretHandFinger`, right-hand via `Annotation` (italic, below)
- [x] Notes without tab data omitted from the tab stave (no auto-derivation — unchanged
      from 4a, exercised again in the browser)
- [x] Mode switcher (notation / tab / both) on the same data at any time
      (`ModeSwitcher.vue`, quiet segmented control; displayMode is a saved score field)
- [x] Measure quiet mark: `measureFullness` per measure → small oxblood icon pinned on the
      measure + a words-nearby summary line under the manuscript (icon + words, no popups;
      empty measures are NOT marked — an empty measure is plainly intentional)
- [x] Wire editor to save/load via the score API: `/editor` = blank, `/editor/:id` = load;
      save button + Ctrl+S (POST first, then PUT; URL settles onto the new id); title,
      description and time signature editable in the header; quiet saved/unsaved status;
      `lib/sampleScore.js` deleted — no mock data left
- [~] Manual test: exercised end to end in the browser against the real API (write, tab,
      fingering, quiet mark, all three modes, create + update + reload + missing-score
      path — no console errors); Mario's hands-on run pending
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 5 — library + profile pages
- [x] `LibraryPage` + `ScoreCard.vue`: list (newest first), open, inline rename,
      delete with an inline confirm step (no browser popups anywhere); quiet
      loading/error states; empty state via a DS-ported `EmptyState.vue` with a
      working "New score" (download moved to Phase 7 — it needs the PDF pipeline)
- [x] `ProfilePage`: update name, email, password through PUT /api/users/me —
      only changed fields sent, client validation via `lib/formValidation.js`,
      409/field details as inline quiet marks, password fields clear after
      saving, auth store + stored user kept in step (`auth.setUser`)
- [~] Manual test: create in editor → appears in library → open → rename → delete
      (exercised end to end in the browser against the real API; Mario's
      hands-on run pending)
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 6 — admin dashboard
- [x] Admin routes (backend): CRUD over all users and all scores (admin middleware)
      (`requireAdmin` after `requireAuth`; list/update/delete users, list/delete
      scores with owner populated; guardrails: no self-delete, no self-demote,
      deleting a user deletes their scores)
- [x] `AdminPage` (admin-only route): manage users and scores
      (two tables on paper cards; `AdminUserRow`/`AdminScoreRow` follow the
      ScoreCard pattern — inline edit and inline delete confirm, no popups)
- [~] Manual test as admin vs normal user (403 path)
      (exercised end to end in the browser and against the API: admin CRUD,
      guardrails, cascade delete, 401/403/404/409 paths, guard redirect;
      Mario's hands-on run pending)
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 7 — print + PDF export
- [x] Print route with `@media print` CSS — score only, on white paper
      (`PrintPage.vue` replaces the stub: white sheet with title + description
      engraved on it — Mario's call — quiet marks off, `.no-print` chrome;
      print.css owns the sheet's white and the print-media rules)
- [x] PDF download: VexFlow → SVG → svg2pdf.js + jsPDF, client-side; single long page ok;
      a download action joins the library's `ScoreCard` here (moved from Phase 5)
      (`usePdfExport` composable + pure helpers in `lib/printSheet.js`, 16
      assertions pass headlessly; "Print or download" also joined the editor's
      save row; filename from the sanitized title)
- [x] Review round 1: tab digits were invisible in the PDF (svg2pdf can't read
      VexFlow's pt font sizes → size 0) — export now stamps each text's computed
      font onto a clone in px; tab digit masks tightened so the string line just
      touches the number (renderer post-draw pass, same look on screen and PDF)
- [x] Review round 2: engraved-page layout everywhere — systems are justified
      to one straight right edge (last line stays natural width, per Mario), and
      the editor uses the same fixed 680px page as the print sheet
      (`SHEET_WIDTH` in lib/printSheet.js), so line breaks match print exactly
- [~] Manual test: print preview + downloaded PDF match the editor
      (exercised in the browser against the real API: sheet in all three display
      modes, PDF bytes verified as a valid single-page PDF, no quiet marks on the
      sheet, not-found + signed-out paths; Mario's hands-on run of the actual
      print preview dialog and the downloaded file pending)
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 8 — validation polish, error handling review, README
- [x] Sweep validation on every write endpoint; consistent status codes
      (all five write endpoints validated field-by-field; exercised 400/401/
      403/404/409 live against the API, including ownership vs. admin 403s,
      malformed-id 404s and both admin guardrails. One gap found + fixed:
      a malformed JSON body fell through to a 500 — the error handler now
      answers 400 with quiet copy)
- [x] Review centralized error handling front and back; quiet-mark error copy throughout
      (server errorHandler + client ApiError paths reviewed end to end; swept
      every user-facing string — one server message said "the token is
      invalid", reworded to "Your session has ended — please sign in again.")
- [x] Remove any remaining mock/placeholder data
      (verified none left: no mock/sample/TODO/console.log in client or server
      source; input placeholders and CSS token names are the only matches)
- [x] `README.md`: setup steps, data model explanation, full endpoint list
      (what Cadenza is + the paper philosophy, clean-machine setup incl. .env
      and admin seed, User/Score model with the note-event shape, every
      endpoint with method/auth/status codes, project structure)
- [x] Final pass against the core design philosophy (no auto-fill, manual tabs, quiet marks)
      (score store re-read action by action: notes insert exactly one event,
      deletes never re-flow, tabs/fingering all manual and nullable, quiet
      marks are the only rhythm feedback and stay off the print sheet)
- 🛑 **Stop, summarize — project complete.**

---

## Phase 9 — tab-only notes (post-review addition, Mario's call 2026-07-11)
Problem: tabs could only be written as annotations on notation notes, and in
tab-only display mode nothing could be written at all. Solution: the symmetric
rule — an event with an empty `pitches[]` (and not a rest) is a *tab-only
note*: it has duration, string and fret, appears on the tab stave, and simply
does not appear on the notation stave (the mirror of "no tab data → absent
from the tab stave"). Nothing is ever derived in either direction.
- [x] `isTabOnly(note)` helper in `lib/scoreModel.js`
- [x] Renderer: notation voice skips tab-only events (mirror of the tab
      voice's existing filter); tab notes built from `strings[]` so they no
      longer need pitches; layout report gains the tab stave's line geometry
      and per-note x from whichever stave drew the note
- [x] `stringAt(y, measureLayout)` in `lib/staffGeometry.js` — snap a drop to
      the nearest of the six string lines (string 1 = top line)
- [x] Dropping a figure on the tab stave writes a tab-only note (string from
      the drop, fret 0 = open string, selected for immediate fret editing)
- [x] Store: `addTabNote` action; arrows move a tab-only note across strings;
      string/fret edits work without pitches (and can't be cleared to null —
      a tab note without them would be invisible; deleting is how it goes)
- [x] FingeringControls: a tab-only note gets its string/fret row (no pitch
      rows to piggyback on) with quiet copy explaining what it is
- [x] Review round 1 (Mario): the quiet mark is a NOTATION observation — tab-only
      notes no longer enter its arithmetic (a tabs-only measure reads as empty,
      and empty is never marked), and in tab display mode, where the notation
      stave isn't on the page, marks and summary stay away entirely
- [x] Review round 2 (Mario): notation-only systems tightened to the tab rows'
      130px; the quiet mark now sits centred over its measure just above the
      top staff line (was tucked far up in the corner); the tab-only DISPLAY
      MODE cut entirely — ModeSwitcher offers notation/both, the server enum
      and validator match, and a legacy 'tab' score quietly opens as 'both'
- [x] Review round 3 (Mario): tab digits now share a column with their
      noteheads. Two causes fixed in the renderer: each stave's voice now
      covers EVERY event (invisible GhostNotes hold the time of events with
      nothing to draw on that stave, so the voices run on one clock), and
      both staves adopt the same note-start x (the treble clef + time
      signature begin notes further right than the TAB badge)
- [~] Manual test: exercised end to end in the browser against the real API
      (drop on strings in both/tab modes, fret + string edits, arrows, mode
      switches, quiet mark, save/reload round-trip, print sheet, digit-click
      selection — no console errors); Mario's hands-on run pending
- 🛑 **Stop, summarize, wait for Mario to try the feel.**

---

## Phase 10 — drag preview (Mario's call 2026-07-12)
While a figure is dragged over the manuscript, show where it would land
before the drop: a thin brass circle on the snapped landing spot (same
snapping the drop uses), temporary ledger strokes when the spot climbs
outside the five lines, the circle alone on a snapped tab string. Pure view
state — an HTML overlay like the quiet marks, never drawn into VexFlow's SVG,
never part of the model.
- [x] `ledgerLineYs(noteY, measureLayout)` in `lib/staffGeometry.js` — the y
      of every ledger stroke a notehead at that height needs (pure, commented
      math on the half-spacing step grid; 35 headless assertions pass,
      including a pitchAt↔yForPitch round trip so the circle never lies)
- [x] `ScoreCanvas.vue`: reactive `dragPreview` ref set on dragover (position
      only — the payload is unreadable during dragover by drag-and-drop
      design), cleared on dragleave and drop; circle + ledger overlays in
      brass, `pointer-events: none`
- [~] Manual test: synthetic dragover/drop events in the browser — circle
      follows line/space snapping, ledger strokes above and below the staff
      (inclusive when the note sits ON a ledger), string snapping on the tab
      stave (no ledgers), nothing in the stave gap or outside the band,
      preview clears on dragleave and on drop, drops still write notes, no
      console errors; Mario's hands-on drag pending
- [x] Review round 1 (Mario): the quiet mark now hangs above the whole
      writable band — higher than the highest note a drop could write — so it
      never obstructs, and all marks share one height; the figure drag ghost
      is the bare Bravura glyph (`setDragImage`), not a snapshot of the whole
      button with its paper square
- [x] Review round 2 (Mario): measures hug their figures. The formatter now
      lays notes at their measured natural width instead of spreading them
      across the measure, the measure is sized from that same number (plus
      clef/time/barline room and a small trailing gap), and the row
      justification from Phase 7 is gone — stretching lines to a straight
      right edge was itself blank space between figures, so lines now end
      where their music ends (supersedes the Phase 7 straight-edge call;
      the print sheet shares the renderer, so it reads the same way).
      Empty measures keep a 60px floor as drop room.
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 11 — engraved spacing + beams (Mario's call 2026-07-12)
The minimum-width packing from Phase 10 round 2 sat figures too close, the
trailing gap didn't match the lead-in, and spacing ignored duration. New rule:
the room after a figure is a FIXED amount per figure (longer figure, a bit
more room — never proportional to time), the last figure sits as far from its
barline as the first does from its own, and eighths or shorter can be beamed
by hand.
- [x] `lib/noteSpacing.js` (pure): FIGURE_SPACE table (w 58 · h 46 · q 36 ·
      8th 28 · 16th 22 · 32nd 18 px — each halving of duration keeps more
      than half the room; a dot adds a quarter), `spacingPlan()` → per-event
      offsets + content width; 17 headless assertions pass
- [x] Renderer: measures sized from the spacing plan; after VexFlow's
      formatter aligns the staves, each event's shared tick context moves to
      its fixed offset (notation + tab move together); trailing gap =
      lead-in (allowances re-tuned against drawn geometry); proportional
      squeeze only if a measure hits the width cap
- [x] Beams, manual per the philosophy: `beamed: false` on the note event
      (model + CLAUDE.md), `isBeamable()` in scoreModel (eighth or shorter,
      pitched, not a rest; 8 browser assertions), store `toggleBeam`, a Beam
      toggle in NoteToolbar (disabled unless the selection can beam),
      renderer joins ADJACENT flagged notes with `new Beam(...)` — nothing is
      ever beamed automatically; server untouched (measures are opaque JSON)
- [~] Manual test in the browser: quarter gaps land at exactly 36px and a
      mixed measure at its table values (46/28/28), trailing ≈ lead-in
      (18.6 vs 17), beams draw/un-draw with the flags and replace the flag
      glyphs, the flag survives save → reload, Both mode keeps digits in
      their columns, no console errors; Mario's hands-on run pending
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 12 — dot polish + slurs (Mario's call 2026-07-12)
Three refinements on the last phase: a dotted figure should take the full
1.5× room (not 1.25×), the augmentation dot should stay centred on its
notehead even when the note sits ON a staff line (VexFlow lifts it into the
space above — Mario wants it on the line), and notes can be connected with
slurs, the same manual, flag-a-note way beams work.
- [x] `noteSpacing.js`: DOT_FACTOR 1.25 → 1.5 (a dotted figure reserves 1.5×
      its base room); assertion updated (17 pass)
- [x] Renderer: after formatting, `centerDots` zeroes every notation dot's
      `dot_shiftY` so it sits on the notehead's own line (VexFlow's format
      pass had lifted on-line dots half a space up)
- [x] Slurs, manual per the philosophy: `slurred: false` on the note event
      (model + CLAUDE.md), `isSlurrable()` in scoreModel (pitched, not a rest,
      not tab-only — any duration), store `toggleSlur`, a Slur toggle in
      NoteToolbar (disabled unless the selection can slur), renderer joins
      ADJACENT flagged notes with one `Curve` from first to last; the
      beam-run logic refactored into a shared `adjacentRuns` helper both
      features use — nothing is ever slurred automatically
- [~] Manual test in the browser: dotted spacing measured 54px = 36 × 1.5;
      dot centred at cy 100 on the line and cy 95 in the space; a 3-note slur
      draws one curve over the whole run (x 98→158) and vanishes when
      adjacency breaks or flags clear; a note both beamed and slurred renders
      both (beam bar + slur on the notehead side) and survives save → reload
      via the API; no console errors; Mario's hands-on run pending
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 13 — library score previews (Mario's call 2026-07-12)
The library reads as a list of titles. Give each card a small visual PREVIEW of
the score's opening at the top, so the folio reads like a shelf of little
manuscripts. No new rendering code and no VexFlow — a preview is just a
non-interactive `ScoreCanvas` at a small page width, clipped to the first
system. No backend change: `GET /api/scores` already returns full documents
(measures included), so the card renders straight from the `score` prop it
already has.
- [x] `ScorePreview.vue` (presentational): a warm-paper, hairline-bordered,
      small-radius frame — a mini sheet carrying the engraved plate TITLE above
      the opening TWO systems of music. The whole frame is a `RouterLink` into
      the editor — a second way in; the title link and Open button stay the
      primary path.
- [x] Renders through the shared `useScoreRenderer` (same renderer as the editor
      and print sheet) directly rather than via `ScoreCanvas`, because the
      preview needs the SVG itself: drawn at the full sheet width, then scaled
      DOWN to the card by giving the SVG a `viewBox` (CSS width:100%) — that
      scaling is the "zoomed out" look, and the line breaks match the real sheet.
- [x] Honor the score's own `displayMode` (a tab piece previews WITH its tab —
      forcing notation would render a tab-only score as blank staves, and hide
      tab on every "both" score).
- [x] The viewBox is CROPPED to the first two systems (heights mirror the
      renderer's 130 / 264 + 10px margin), so only the opening shows; measures
      are sliced to an opening cap so a long score doesn't build VexFlow objects
      the crop hides — "render only what's shown".
- [x] Empty score (no notes anywhere — tab-only notes count as content, so this
      is `notes.length`, not the quiet-mark arithmetic) shows a calm
      "Empty score" placeholder on an aged-cream well, never a blank/broken box.
- [x] `ScoreCard.vue`: mount `ScorePreview` ABOVE the title; card lifecycle
      (rename/delete) untouched, existing actions keep working.
- [x] Note (not build): offscreen cards could lazy-render via IntersectionObserver
      if a folio grew large — one small SVG per card is fine for a school library.
- [~] Manual test: browser-verified against the live API — the SVG scales to
      the card (287px inside a 305 frame, ≈0.42×, "zoomed out"), the viewBox
      crops to two systems and both are drawn (64 + 62 glyphs top/second row),
      the centred plate title shows, the empty card shows the aged-cream
      "Empty score" well, the (pre-existing) tab-only card previews with its tab,
      previews are RouterLinks that don't intercept card clicks, no console
      errors; Mario's hands-on run pending.
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 14 — the engraved sheet header in the editor + tempo & composer (Mario's call 2026-07-13)
The editor's title/description were chrome above the desk; on the printed sheet
they are engraved on the paper. Move them ONTO the manuscript plate, styled
exactly as they print (centred display title, centred italic description), and
add two new score fields in the engraved corners: tempo in bpm on the left,
the composer's name on the right — the classical plate layout, on sheet, print
and PDF alike.
- [x] Data model: `bpm` (number | null) and `composer` (string, default '')
      on the Score — server model, WRITABLE_FIELDS, validators (optional,
      quiet messages; `values: 'null'` so a tempo can be cleared), `createScore`
      defaults, CLAUDE.md
- [x] Store: load/save the two fields (older documents open quietly unset);
      `setBpm` / `setComposer` actions (bpm kept as an integer 1–400 or null,
      same guard style as frets — an invalid entry snaps back on re-render)
- [x] `SheetHeader.vue` (editor/): the engraved header as quiet inputs dressed
      like the printed text — centred title, centred italic description, a
      small tempo field left and composer field right on the credits line just
      above the music; sits on the plate, above the manuscript and OUTSIDE the
      keyboard region so typing a title never trips the note shortcuts
- [x] `EditorPage.vue`: title/description inputs leave the head chrome (time,
      mode, save stay); `SheetHeader` joins the plate
- [x] `PrintPage.vue`: the same credits line on the sheet — "120 bpm" left,
      composer right, only when set
- [x] PDF: `pdfLayout` gains the credits baseline (6 headless assertions pass);
      `usePdfExport` draws tempo left-aligned and composer right-aligned in the
      header ink ("120 bpm" plain text — the classical "♩ =" form needs a music
      font embedded in jsPDF; flagged, not built)
- [~] Manual test: exercised in the browser against the live API — create with
      bpm+composer, 400 on a bad bpm, null clears, header renders centred/left/
      right on the plate with the old chrome inputs gone, edits round-trip
      through Save, invalid tempo snaps back, print sheet shows the credits in
      symmetric corners above the music, blank score shows quiet placeholders,
      no console errors; Mario's hands-on run (incl. an actual PDF download)
      pending
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 15 — harmonics (Mario's call 2026-07-14)
A guitarist's harmonic, the same manual way beams and slurs work: a per-note
flag set by hand, never inferred. On the notation stave it draws the engraved
natural-harmonic mark — a small circle above the note (VexFlow's own
`Articulation('ah')`); on the tab stave the fret number wears the conventional
angle brackets (`<12>`). One flag, both staves, print and PDF included (they
share the renderer). Server untouched — measures are opaque JSON.
- [x] Model: `harmonic: false` on the note event (`createNote`, CLAUDE.md);
      `isHarmonicable(note)` in scoreModel — anything that sounds (pitched or
      tab-only, not a rest)
- [x] Store: `toggleHarmonic` action (same shape as `toggleBeam`/`toggleSlur`)
- [x] NoteToolbar: a Harmonic toggle beside Slur (disabled unless the
      selection can sound); EditorPage wires it and adds key `h` (hint updated)
- [x] Renderer: notation notes take the circle Articulation above; tab frets
      render bracketed when flagged
- [~] Manual test: exercised in the browser against the live API — toggle
      draws the circle (path-count delta) and brackets the fret (`<12>`) on a
      pitched-with-tab note and a tab-only note, a rest refuses the flag and
      disables the button, key `h` toggles, flags survive save → reload, the
      print sheet shows the same marks, no console errors; Mario's hands-on
      run pending
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 16 — the beat figure in the tempo mark (Mario's call 2026-07-14)
Phase 14 wrote the tempo as "120 bpm"; the engraved convention is a metronome
mark — a note figure, an equals sign, the number ("♩ = 120") — and the figure
is the composer's choice (a dotted quarter in 6/8, a half in cut time). So the
score gains `beatUnit` + `beatDotted`, the editor's tempo corner becomes
[figure select] = [number], and sheet, print and PDF all read the same mark.
On screen the figure is Bravura's SMuFL metronome glyph; in the PDF (whose
built-in fonts carry no music glyphs) the figure is drawn from pure geometry —
a notehead, a stem, flags, a dot — in ~a dozen commented lines.
- [x] Data model: `beatUnit` ('w'|'h'|'q'|'8'|'16', default 'q') and
      `beatDotted` (boolean, default false) — server model + enum validator,
      WRITABLE_FIELDS, `createScore` defaults, CLAUDE.md
- [x] `durations.js`: `BEAT_UNITS` (code, label, Bravura metronome glyph),
      the augmentation-dot glyph and `beatGlyph()` — shared by the editor
      and the print sheet
- [x] Store: load/save both fields (older scores open as a plain quarter);
      `setBeatUnit(unit, dotted)` action with the usual quiet guard
- [x] SheetHeader: the tempo corner becomes [beat-figure select] = [bpm] —
      the select's options show the glyph and its plain name (dotted variants
      only for half/quarter/eighth, the beats that actually get dotted)
- [x] PrintPage: the credits line renders the glyph = number, glyph upright
- [x] PDF: `tempoFigure(unit, dotted)` in printSheet.js — pure geometry
      (head/stem/flags/dot primitives + total width, 11 headless assertions
      pass); usePdfExport draws it in the header ink and writes "= 120" after
- [~] Manual test: exercised in the browser against the live API — create
      with a dotted-quarter beat, 400 on a bad unit, Bravura confirmed shaping
      the metronome glyphs (measured against fallback), select shows all 8
      figures and round-trips through change → save → API, print sheet renders
      quarter-glyph + dot upright beside "= 72", no console errors; Mario's
      hands-on run (incl. an actual PDF download) pending
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 17 — the library preview as a true miniature sheet (Mario's call 2026-07-14)
Two problems with the folio previews. (1) The music draws in oxblood, not ink:
the preview became a RouterLink, links wear `--accent-oxblood` (base.css), and
the renderer takes its ink from the container's inherited `color` — so the
whole engraving went red. (2) The preview shows only title + music, but a
miniature of the printed sheet should show everything the print shows: the
description, the metronome mark (figure = number) and the composer.
- [x] Pin `color: var(--text-primary)` on the preview's canvas so the
      engraving is ink again (the renderer reads it off the container)
- [x] Mirror the print-sheet header at miniature scale: centred title (as
      now), centred italic description, and the credits line — tempo glyph
      = number left, composer right — each only when set, same conditions
      as PrintPage (description and composer trim to one line so a long text
      never squeezes the music out of the card)
- [~] Manual test: exercised in the browser against the live API — the full
      card shows description, "♩. = 72" (glyph + dot in Bravura, upright) and
      the composer; the drawn engraving's computed colours are --text-primary
      (plus VexFlow's own #999 stave-line default, present everywhere) with no
      oxblood left; the empty card keeps its calm placeholder under the header;
      no console errors; Mario's hands-on run pending
- [x] Review round 1 (Mario): the music sits tight under the credits line and
      stretches to the composer's right edge. The viewBox now crops to the
      MUSIC'S OWN BOX read from the renderer's layout report — from the
      measures' left edge to the rightmost barline, a couple of ledger lines
      above the first top staff line to a little below the last visible
      bottom line — instead of the full 680px sheet with its empty headroom.
      A 120px crop floor guards the lone-empty-measure case from comic zoom.
      Verified in the browser: credits → music gap 4px, drawn ink's right
      edge flush with the composer's (0–2px), short and long scores alike,
      no console errors.
- [x] Review round 2 (Mario): the tight header belongs to EVERY sheet, and
      the preview's zoom should be uniform.
      (a) Preview: one fixed zoom for every card — the viewBox width is
      always the full engraving line (no content-adaptive scaling); short
      pieces simply show less ink.
      (b) Print + PDF: the sheet's SVG is cropped to its ink (getBBox, small
      pad) top and bottom at 1:1, so the music tucks up under the credits —
      nothing can clip because the box is measured from the drawing itself;
      the PDF reads the cropped height and tightens with it.
      (c) Editor: the sheet header is capped at the manuscript's SHEET_WIDTH,
      so the title centres over the music and the composer's name ends at the
      music's right edge, exactly like print. The air above the editor's first
      staff line STAYS — it is the writable band (high-note drops, quiet
      marks), not blank paper.
      Verified in the browser: both preview cards at the identical 0.434
      scale (fixed 660 viewBox width); print credits → first ink 18px
      (frame margin + 6px pad) at 1:1 with the bottom trimmed too (one fix
      en route: VexFlow's inline style height was letterboxing the cropped
      viewBox — the crop now sets style.height as well); editor header
      680px wide, composer input flush with the manuscript's right edge;
      no console errors.
- [x] Review round 3 (Mario): the music LINES must reach the right edge —
      every row ends where the composer's name does. Rows are now justified
      in the renderer (editor, print, PDF and preview all inherit it):
      measures keep their per-figure natural width for deciding line wraps,
      then the whole row stretches proportionally — measure widths and
      figure offsets alike, the same scale pass that already squeezed
      over-cap measures, now allowed past 1. The LAST line stretches like
      any other (a short piece is all last line — leaving it ragged was the
      complaint). Supersedes Phase 10 round 2's ragged right, which itself
      superseded Phase 7 round 2's justification — the difference this time:
      figures stretch WITH their measures, so no blank space appears between
      a measure's figures and its barline. The header text (editor, print,
      PDF credits) is inset by the renderer's 10px page gutter so the
      composer's name ends exactly on the final barline. CLAUDE.md's spacing
      rule updated. Verified in the browser: composer vs final barline within
      1px in the editor, every print row (last included) flush at 752 vs
      composer 751, both preview cards at the identical 0.434 scale with ink
      flush to the composer (0px), stretched figures spread proportionally
      (two quarters at x 87/495 across a lone measure), no console errors.
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 18 — the desk rearranged: tool rail left, sticky tools (Mario's call 2026-07-14)
The writing tools sat in a strip above the manuscript, and the plate stretched
to fill the page — blank paper right of the music (ugly, per Mario). New desk:
the plate hugs its sheet, the toolbar becomes a TOOL RAIL down the left side
(the DS's ToolRail concept), and both the rail and the fingering panel are
sticky — they ride along as you scroll, so the tools are at hand anywhere in
the piece.
- [x] `NoteToolbar.vue` restyled as a vertical rail: figures three to a row,
      the option toggles (dot/rest/beam/slur/harmonic), delete and the
      measure controls stacked below, the status line at the rail's foot;
      below 1200px it falls back to the old horizontal strip (the breakpoint
      must match EditorPage's — noted in both files)
- [x] `EditorPage.vue`: three-column desk — rail · plate · fingering panel;
      the plate takes `width: fit-content` so the paper ends where the sheet
      does; rail and panel `position: sticky` at 69px (TopChrome's 57px + a
      breath), riding along as the piece scrolls
- [~] Manual test: verified in the browser at 1366px — column order
      rail(158) · plate(730, hugging the sheet) · panel(240); after a 900px
      scroll the rail and panel stay pinned at 69px while the plate scrolls
      past; at 1000px the page renders with the old strip layout (base CSS);
      production build passes. The two HMR errors in the console came from
      an intermediate edit state, not the final code — every layout probe ran
      after the final reload. Mario's hands-on run pending.
- [x] Review round 1 (Mario): the sheet grew a sideways scrollbar — the
      desk's columns (1152px) plus the shell's padding (48px) need exactly
      the 1200px content cap, so the browser's own scrollbar squeezed the
      plate. No slider: the editor route now carries `wideDesk` meta and
      App.vue widens its cap by 40px for it (other pages keep 1200); the
      rail/desk breakpoints rose 1200 → 1240 to match, so the three-column
      layout only engages where it genuinely fits. Verified at 1366px: no
      sideways scroll (frame scrollWidth = clientWidth = 680), plate at its
      true 746px, main at 1240 on the editor and 1200 on the library, no
      console errors.
- 🛑 **Stop, summarize, wait for review + commit.**
