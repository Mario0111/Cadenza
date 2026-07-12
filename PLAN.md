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
