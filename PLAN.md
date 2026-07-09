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
- [ ] Vue Router with routes: Landing (public), Login/Register, Editor, Library, Profile,
      Admin, Print; auth guards (protected + admin-only)
- [ ] Pinia `auth` store: token persistence, current user, login/register/logout actions
- [ ] API layer (`src/api/`) with fetch wrappers + auth header injection
- [ ] Shared DS components as Vue SFCs: `PaperCard`, `QuietMark`, `AppButton`, `TopChrome`, form inputs
- [ ] Landing page (public), Login/Register pages with client-side validation
      (required, email format, min password length, confirmation match, inline quiet-mark errors)
- [ ] App shell / navigation (TopChrome)
- [ ] Manual test: register → land on library, logout, guard redirects
- 🛑 **Stop, summarize, wait for review + commit.**

---

## Phase 4 — the editor with VexFlow rendering (the big one)
Split into sub-phases; each is its own review gate.

### 4a — render pipeline (read-only)
- [ ] `lib/scoreModel.js` + `lib/durations.js` (pure, no Vue): duration→ticks, defaults
- [ ] `useScoreRenderer` composable: model → VexFlow, **soft-mode voices everywhere**
- [ ] `ScoreCanvas.vue`: Stave (notation), TabStave, StaveConnector for "tab under notation"
- [ ] Per-measure width from note density; VexFlow formatter for spacing
- [ ] Render a hard-coded sample score in all three display modes
- 🛑 **Stop, summarize, wait for review + commit.**

### 4b — note input + editing
- [ ] `NoteToolbar.vue`: duration, dot, rest, accidentals; next-note duration default
- [ ] Add note by clicking staff position / entering pitch; clean snapping
- [ ] Select an existing note to edit or delete; keyboard-friendly input
- [ ] Add / remove measures freely, including empty ones (no auto-fill anywhere)
- 🛑 **Stop, summarize, wait for review + commit.**

### 4c — tab, fingering, quiet mark, mode switch
- [ ] `FingeringControls.vue`: optional per-pitch string/fret, left-hand 1–4, right-hand p/i/m/a
- [ ] Render left-hand via `FretHandFinger`, right-hand via `Annotation`
- [ ] Notes without tab data omitted from the tab stave (no auto-derivation)
- [ ] Mode switcher (notation / tab / both) on the same data at any time
- [ ] Measure quiet mark: sum durations vs time signature → subtle icon/tint, no popup/block
- [ ] Wire editor to save/load via the score API (no mock data)
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
