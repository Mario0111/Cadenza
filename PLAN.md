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
- [ ] `LibraryPage` + `ScoreCard.vue`: list, open, rename, delete, download; empty state
- [ ] `ProfilePage`: update name, email, password (with validation)
- [ ] Manual test: create in editor → appears in library → open → rename → delete
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 6 — admin dashboard
- [ ] Admin routes (backend): CRUD over all users and all scores (admin middleware)
- [ ] `AdminPage` (admin-only route): manage users and scores
- [ ] Manual test as admin vs normal user (403 path)
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 7 — print + PDF export
- [ ] Print route with `@media print` CSS — score only, on white paper
- [ ] PDF download: VexFlow → SVG → svg2pdf.js + jsPDF, client-side; single long page ok
- [ ] Manual test: print preview + downloaded PDF match the editor
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 8 — validation polish, error handling review, README
- [ ] Sweep validation on every write endpoint; consistent status codes
- [ ] Review centralized error handling front and back; quiet-mark error copy throughout
- [ ] Remove any remaining mock/placeholder data
- [ ] `README.md`: setup steps, data model explanation, full endpoint list
- [ ] Final pass against the core design philosophy (no auto-fill, manual tabs, quiet marks)
- 🛑 **Stop, summarize — project complete.**
