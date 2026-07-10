# Cadenza

Cadenza is a guitar-focused music notation and tablature editor. You write notes
onto a staff the way you would on paper, optionally add tablature (string and
fret) and fingering by hand, save scores to your account, and print them or
download them as a PDF.

The guiding idea: **writing on paper, with quality of life**.

- Nothing is ever auto-filled. Adding a note never inserts rests or pads a
  measure; empty measures stay empty.
- Tablature is never derived from notation (or the other way round). String and
  fret are optional, manual, per-note fields — a note without them simply does
  not appear on the tab stave.
- You are allowed to be "wrong". Five quarter notes in a 4/4 measure render
  fine; the only feedback is a small *quiet mark* on that measure. No popups,
  no blocking, no auto-correction.
- Quality of life means ease of input: notes snap onto staff positions, the
  next note defaults to the last duration, the whole editor is reachable from
  the keyboard, and measures grow and shrink with their contents.

## Stack

| Layer     | Choice                                            |
|-----------|---------------------------------------------------|
| Frontend  | Vue 3 (Composition API) + Vite                    |
| Routing   | Vue Router 4                                      |
| State     | Pinia                                             |
| Styling   | Tailwind CSS + Cadenza design tokens (CSS variables) |
| Notation  | VexFlow 4 (rendering only — never the source of truth) |
| Backend   | Express.js (Node 20+)                             |
| Database  | MongoDB + Mongoose                                |
| Auth      | JWT (Bearer token) + bcrypt password hashing      |
| PDF       | Client-side: VexFlow → SVG → svg2pdf.js + jsPDF   |

## Setup from a clean machine

You need **Node.js 20+** and a **MongoDB** server (a local install is fine; a
MongoDB Atlas connection string also works).

1. **Clone the repository** and open a terminal in its root folder.

2. **Server** — install dependencies and create the environment file:

   ```bash
   cd server
   npm install
   cp .env.example .env    # on Windows: copy .env.example .env
   ```

   Open `server/.env` and fill it in. The defaults work for a local MongoDB;
   the one value you must change is `JWT_SECRET` (any long random string).
   `.env` is never committed — only `.env.example` is.

3. **Database** — make sure MongoDB is running (as a service, or `mongod`
   directly). The database named in `MONGODB_URI` is created automatically on
   first write.

4. **Seed the admin account** (still inside `server/`):

   ```bash
   npm run seed:admin
   ```

   This creates (or updates) one admin using the `ADMIN_*` values from `.env`.
   It is safe to run more than once.

5. **Start the server**:

   ```bash
   npm run dev
   ```

   The API listens on `http://localhost:4000` (the `PORT` in `.env`).
   `GET /api/health` answers `{ "status": "ok" }` when it is up.

6. **Client** — in a second terminal:

   ```bash
   cd client
   npm install
   npm run dev
   ```

   Vite serves the app on `http://localhost:5173` and proxies every `/api`
   request to the server, so no CORS setup is needed in development.

7. Open `http://localhost:5173`, register an account, and start writing.

## Data model

Two collections: **users** and **scores**.

### User

| Field          | Notes                                          |
|----------------|------------------------------------------------|
| `name`         | Display name                                   |
| `email`        | Unique — one account per email                 |
| `passwordHash` | bcrypt hash; the plain password is never stored, and the hash never leaves the server (stripped from every API response) |
| `role`         | `user` or `admin`                              |
| timestamps     | `createdAt`, `updatedAt` (automatic)           |

### Score

| Field           | Notes                                                    |
|-----------------|----------------------------------------------------------|
| `title`         | Required — the only required score field                 |
| `description`   | Optional free text                                       |
| `timeSignature` | e.g. `"4/4"` — used for measure capacity and quiet marks |
| `keySignature`  | e.g. `"C"`                                               |
| `displayMode`   | `notation`, `tab`, or `both` — which staves to show      |
| `owner`         | Reference to the user who owns it; every query is scoped by this |
| `measures[]`    | The music itself, stored as free-form JSON (see below)   |
| timestamps      | `createdAt`, `updatedAt` (automatic)                     |

Each measure holds a `notes[]` array of note events:

```js
{
  pitches: ["e/4", "g/4"],  // more than one pitch = a chord; ignored for rests
  duration: "q",            // w h q 8 16 32
  dotted: false,
  isRest: false,
  strings: [1, null],       // per-pitch, nullable — tabs are manual
  frets:   [0, null],       // per-pitch, nullable
  leftFinger: null,         // 1..4 | null   (fretting hand)
  rightFinger: null         // "p"|"i"|"m"|"a"|null  (plucking hand)
}
```

`measures` is deliberately stored as schemaless JSON (Mongoose `Mixed`) with
**no rhythmic validation at the database layer**. An incomplete or overfull
measure is a valid document by design — the editor is the only place that
understands and renders this structure, and the quiet mark is the only
feedback. The API still validates the *envelope* (title present, `measures` is
an array, `displayMode` one of the three modes) — it just never judges the
music inside.

## API

Base URL: `http://localhost:4000/api`. All request and response bodies are
JSON. Protected endpoints expect an `Authorization: Bearer <token>` header;
the token comes from register/login and is valid for `JWT_EXPIRES_IN`
(7 days by default).

Error responses always have the shape `{ "error": "…" }`, plus a
`details: [{ field, message }]` array on validation failures (400), so forms
can mark the exact field.

### Status codes, consistently

| Code | Meaning here                                                    |
|------|-----------------------------------------------------------------|
| 200  | Success                                                          |
| 201  | Created (register, new score)                                    |
| 204  | Deleted — no body                                                |
| 400  | A field failed validation (or the request body was not readable) |
| 401  | No token, expired/bad token, or wrong login credentials          |
| 403  | Signed in, but not allowed: not the owner / not an admin         |
| 404  | No such resource (also for malformed ids — nothing to reveal)    |
| 409  | Duplicate email                                                  |
| 500  | Unexpected server fault (logged server-side, never detailed to the client) |

### Endpoints

**Public**

| Method | Path                 | What it does                          | Failure codes |
|--------|----------------------|---------------------------------------|---------------|
| GET    | `/health`            | Liveness check                        | —             |
| POST   | `/auth/register`     | Create an account → `{ token, user }` | 400, 409      |
| POST   | `/auth/login`        | Sign in → `{ token, user }`           | 400, 401      |

**Signed-in user** (Bearer token required — 401 without one)

| Method | Path                 | What it does                                   | Failure codes |
|--------|----------------------|------------------------------------------------|---------------|
| GET    | `/users/me`          | The signed-in user                             | 401           |
| PUT    | `/users/me`          | Update own name / email / password (partial)   | 400, 401, 409 |
| GET    | `/scores`            | Own scores, newest first                       | 401           |
| POST   | `/scores`            | Create a score (title required)                | 400, 401      |
| GET    | `/scores/:id`        | One owned score                                | 401, 403, 404 |
| PUT    | `/scores/:id`        | Update an owned score (partial)                | 400, 401, 403, 404 |
| DELETE | `/scores/:id`        | Delete an owned score                          | 401, 403, 404 |

On `/scores/:id` routes the order of checks is deliberate: an unknown or
malformed id is a **404** (there is nothing here to own), while a real score
owned by someone else is a **403** (it exists, but it is not yours).

**Admin only** (Bearer token + `role: "admin"` — 401 without a token, 403 without the role)

| Method | Path                  | What it does                                         | Failure codes |
|--------|-----------------------|------------------------------------------------------|---------------|
| GET    | `/admin/users`        | Every account                                        | 401, 403      |
| PUT    | `/admin/users/:id`    | Update any account's name / email / role             | 400, 401, 403, 404, 409 |
| DELETE | `/admin/users/:id`    | Delete an account **and all of its scores**          | 400, 401, 403, 404 |
| GET    | `/admin/scores`       | Every score, with owner name/email populated         | 401, 403      |
| DELETE | `/admin/scores/:id`   | Delete any score                                     | 401, 403, 404 |

Two admin guardrails answer 400: an admin cannot demote **themselves** and
cannot delete **their own** account from the admin desk — another admin has to
do it, so the desk is never left without a key.

Any other `/api` path answers 404.

## Project structure

```
client/src/
├── api/           # thin fetch wrappers per resource; client.js normalizes errors (ApiError)
├── assets/styles/ # Cadenza design tokens (CSS variables), Tailwind entry, print.css
├── components/    # shared UI (PaperCard, QuietMark, FormField, …) + editor/ + admin/
├── composables/   # useScoreRenderer (model → VexFlow), usePdfExport (SVG → PDF)
├── lib/           # pure logic, no Vue imports — durations, pitches, score model, print sheet
├── pages/         # one component per route (…Page.vue)
├── router/        # routes + auth guards
└── stores/        # Pinia: auth (session), score (working copy + selection + pen)

server/src/
├── config/        # env loading (fails fast on missing secrets), db connection
├── models/        # User, Score (Mongoose)
├── routes/        # thin: validation rules → validate → controller
├── controllers/   # the actual endpoint logic, one file per resource
├── middleware/    # requireAuth (JWT), requireAdmin, loadOwnedScore, validate, errorHandler
├── validators/    # express-validator rules per endpoint
└── scripts/       # seedAdmin.js
```

Two conventions worth knowing when reading the code:

- **VexFlow renders, the model rules.** The score model (plain JSON) is the
  single source of truth; rendering is one-directional (model → VexFlow), and
  every voice is created in soft mode so "invalid" rhythms render instead of
  throwing.
- **Every error funnels through one place** on each side: the server's
  `errorHandler` middleware turns thrown `AppError`s into consistent
  `{ error }` responses with the right status code, and the client's
  `api/client.js` turns those into a typed `ApiError` (with `.status` and
  per-field `.details`) that pages show as quiet marks.
