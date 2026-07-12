// The score being edited, as reactive state — plus the selection and the "pen".
//
// This is a Pinia store rather than EditorPage-local state for two reasons:
// several components need the same state (the toolbar edits it, the canvas
// renders it, the page's keyboard handler drives it), and the load/save wiring
// lives here too, so the working copy and its API round-trips sit in one place.
// Every edit is a named action, so each mutation of the score can be read,
// explained and tested on its own.
//
// The core philosophy holds everywhere here: an action changes exactly what it
// says and nothing else. Adding a note never inserts rests or pads a measure;
// deleting never re-flows anything; empty measures stay empty. Tabs are manual:
// strings and frets are set by hand, never derived from pitches.

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createScore, createMeasure, defaultNextNote, isTabOnly } from '@/lib/scoreModel'
import { shiftPitch, setPitchLetter } from '@/lib/pitches'
import * as scoresApi from '@/api/scores'

export const useScoreStore = defineStore('score', () => {
  // The working copy — always a full score model, blank until one is loaded.
  const score = ref(createScore())

  // The saved score's database id, or null while the score only exists here.
  // This is what decides whether saving creates (POST) or updates (PUT).
  const scoreId = ref(null)

  // Quiet save/load state for the editor's status line. `dirty` means the
  // working copy has edits the server hasn't seen; every mutating action
  // below calls markDirty().
  const dirty = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const loadError = ref('')
  const saveError = ref('')

  // What is selected: null, or { measureIndex, noteIndex } — with noteIndex
  // null when a measure is selected but no note in it (e.g. after deleting a
  // measure's last note). Selection is view state; it never enters the model.
  const selection = ref(null)

  // The pen — what the NEXT note will be written as. It remembers the last
  // duration and dot used (the paper-like convenience: you keep writing
  // eighths until you change), and whether you are currently writing rests.
  const pen = ref({ duration: 'q', dotted: false, isRest: false })

  const selectedMeasure = computed(() => {
    if (!selection.value) return null
    return score.value.measures[selection.value.measureIndex] || null
  })

  const selectedNote = computed(() => {
    if (!selectedMeasure.value || selection.value.noteIndex == null) return null
    return selectedMeasure.value.notes[selection.value.noteIndex] || null
  })

  // What the toolbar reflects and edits: the selected note when there is one,
  // otherwise the pen. One control surface, two meanings — made explicit by
  // hasSelection so the toolbar can say which mode it is in.
  const activeSettings = computed(() => selectedNote.value || pen.value)

  // The last measure is not removable — a score keeps at least one.
  const canRemoveMeasure = computed(
    () => Boolean(selection.value) && score.value.measures.length > 1
  )

  function markDirty() {
    dirty.value = true
  }

  /* ---- Load / save / new ---------------------------------------------------
   * The only place the editor talks to the score API. One direction stays
   * honest: the server hands us a score, we keep a clean working copy of the
   * model fields, and saving sends those same fields back.
   */

  /** Start over with a blank score (the /editor route with no id). */
  function startNewScore() {
    score.value = createScore()
    scoreId.value = null
    selection.value = null
    dirty.value = false
    loading.value = false
    saving.value = false
    loadError.value = ''
    saveError.value = ''
  }

  /** Load an existing score (the /editor/:id route) into the working copy. */
  async function loadScore(id) {
    loading.value = true
    loadError.value = ''
    saveError.value = ''
    selection.value = null
    try {
      const { score: loaded } = await scoresApi.getScore(id)
      // Rebuild the working copy from the model fields only, dropping server
      // bookkeeping (owner, timestamps) — the editor never needs it. A score
      // saved with no measures still opens with one empty measure to write in.
      score.value = createScore({
        title: loaded.title,
        description: loaded.description,
        timeSignature: loaded.timeSignature,
        keySignature: loaded.keySignature,
        // The tab-only display mode was cut; a score saved back when it
        // existed quietly opens as "both" (its data is untouched).
        displayMode: loaded.displayMode === 'tab' ? 'both' : loaded.displayMode,
        measures: loaded.measures?.length ? loaded.measures : [createMeasure()]
      })
      scoreId.value = loaded.id
      dirty.value = false
    } catch (err) {
      loadError.value =
        err.status === 404
          ? 'That score isn’t in your library anymore.'
          : err.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Save the working copy: create on first save, update after. On the first
   * save the server assigns the id, which the editor uses to settle the URL.
   */
  async function saveScore() {
    if (saving.value) return

    // The one client-side check, mirroring the server's rule and copy.
    if (!score.value.title.trim()) {
      saveError.value = 'Please give your score a title.'
      return
    }

    saving.value = true
    saveError.value = ''
    const payload = {
      title: score.value.title,
      description: score.value.description,
      timeSignature: score.value.timeSignature,
      keySignature: score.value.keySignature,
      displayMode: score.value.displayMode,
      measures: score.value.measures
    }
    try {
      if (scoreId.value) {
        await scoresApi.updateScore(scoreId.value, payload)
      } else {
        const { score: created } = await scoresApi.createScore(payload)
        scoreId.value = created.id
      }
      dirty.value = false
    } catch (err) {
      saveError.value = err.message
    } finally {
      saving.value = false
    }
  }

  /* ---- Score details -------------------------------------------------------
   * Title, description, time signature and display mode are score fields like
   * any other: editing them marks the copy unsaved. Changing the time
   * signature re-reads the quiet marks against the new capacity — it never
   * touches the notes themselves.
   */

  function setTitle(title) {
    score.value.title = title
    markDirty()
  }

  function setDescription(description) {
    score.value.description = description
    markDirty()
  }

  function setTimeSignature(timeSignature) {
    score.value.timeSignature = timeSignature
    markDirty()
  }

  function setDisplayMode(mode) {
    score.value.displayMode = mode
    markDirty()
  }

  /* ---- Selection ----------------------------------------------------------- */

  function selectNote(measureIndex, noteIndex) {
    selection.value = { measureIndex, noteIndex }
  }

  function clearSelection() {
    selection.value = null
  }

  // After a duration/dot is used on a real note, the pen adopts it —
  // defaultNextNote is the model's definition of "what follows this note".
  function rememberPen(note) {
    const next = defaultNextNote(note)
    pen.value.duration = next.duration
    pen.value.dotted = next.dotted
  }

  /* ---- Writing notes ------------------------------------------------------- */

  /**
   * Write one note (or rest) into a measure at a position — the payload the
   * canvas emits for a figure dropped on the staff. Exactly one note appears;
   * nothing is padded, completed or corrected.
   */
  function addNote({ measureIndex, insertIndex, pitch, duration }) {
    const measure = score.value.measures[measureIndex]
    if (!measure) return
    // A dropped figure writes with its own duration, and the pen adopts it —
    // the next note keeps defaulting to the last duration used. The keyboard
    // path passes no duration and simply writes with the pen as it is.
    if (duration) pen.value.duration = duration
    const note = defaultNextNote(pen.value) // pen's duration + dot
    note.isRest = pen.value.isRest
    if (!note.isRest && pitch) note.pitches = [pitch]
    measure.notes.splice(insertIndex, 0, note)
    selectNote(measureIndex, insertIndex)
    markDirty()
  }

  /**
   * Write one TAB-ONLY note — the payload the canvas emits for a figure
   * dropped on a tab string line. Pitches stay empty, so the note lives on the
   * tab stave alone (the mirror of a pitched note without tab data). The fret
   * starts at 0, the open string: the note is real and visible immediately,
   * and lands selected so the fret can be typed right away. Nothing is derived
   * from anything, and the rest pen is ignored — a drop on a string writes on
   * that string.
   */
  function addTabNote({ measureIndex, insertIndex, string, duration }) {
    const measure = score.value.measures[measureIndex]
    if (!measure) return
    if (duration) pen.value.duration = duration
    const note = defaultNextNote(pen.value)
    note.isRest = false
    note.pitches = []
    note.strings = [string]
    note.frets = [0]
    measure.notes.splice(insertIndex, 0, note)
    selectNote(measureIndex, insertIndex)
    markDirty()
  }

  /**
   * The keyboard way to write: append after the selected note (or at the end
   * of the selected measure, or of the last measure). The new note starts on
   * the previous note's pitch — your hand stays where it was, arrows move it.
   */
  function addNoteAfterSelection() {
    const measures = score.value.measures
    if (!measures.length) return

    let measureIndex
    let insertIndex
    if (selection.value) {
      measureIndex = selection.value.measureIndex
      const notes = measures[measureIndex].notes
      insertIndex = selection.value.noteIndex == null ? notes.length : selection.value.noteIndex + 1
    } else {
      measureIndex = measures.length - 1
      insertIndex = measures[measureIndex].notes.length
    }

    const before = measures[measureIndex].notes[insertIndex - 1]
    const canCopyPitch = before && !before.isRest && before.pitches && before.pitches.length
    // 'b/4' is the middle line — a neutral starting point on an empty stave.
    const pitch = canCopyPitch ? before.pitches[before.pitches.length - 1] : 'b/4'
    addNote({ measureIndex, insertIndex, pitch })
  }

  /** Set the duration — of the selected note if any, otherwise of the pen. */
  function setDuration(code) {
    if (selectedNote.value) {
      selectedNote.value.duration = code
      rememberPen(selectedNote.value)
      markDirty()
    } else {
      pen.value.duration = code
    }
  }

  function toggleDot() {
    if (selectedNote.value) {
      selectedNote.value.dotted = !selectedNote.value.dotted
      rememberPen(selectedNote.value)
      markDirty()
    } else {
      pen.value.dotted = !pen.value.dotted
    }
  }

  // Toggling a note into a rest keeps its pitches, so toggling back restores
  // them. With nothing selected this flips the pen between notes and rests.
  function toggleRest() {
    if (selectedNote.value) {
      selectedNote.value.isRest = !selectedNote.value.isRest
      markDirty()
    } else {
      pen.value.isRest = !pen.value.isRest
    }
  }

  /**
   * Move the selected note by `delta` staff positions (±7 = an octave). For a
   * tab-only note "up" and "down" mean the neighbouring string instead — one
   * string per press, whatever the delta, since strings have no octaves. The
   * fret stays put: moving strings changes where the hand sits, nothing more.
   */
  function transposeSelected(delta) {
    const note = selectedNote.value
    if (!note || note.isRest) return
    if (isTabOnly(note)) {
      // Visually up = toward the top line, which is string 1 (high e).
      const current = note.strings[0] ?? 1
      const next = Math.min(6, Math.max(1, current + (delta > 0 ? -1 : 1)))
      if (next === current) return
      note.strings[0] = next
      markDirty()
      return
    }
    // A chord transposes as a block, keeping its shape.
    note.pitches = note.pitches.map((pitch) => shiftPitch(pitch, delta))
    markDirty()
  }

  /**
   * Re-letter the selected note (keyboard keys a–g), landing on the nearest
   * octave. Only for single notes: a chord holds several letters at once, so
   * one key can't name it.
   */
  function setSelectedLetter(letter) {
    const note = selectedNote.value
    if (!note || note.isRest || note.pitches.length !== 1) return
    note.pitches = [setPitchLetter(note.pitches[0], letter)]
    markDirty()
  }

  function deleteSelectedNote() {
    const measure = selectedMeasure.value
    if (!measure || selection.value.noteIndex == null) return
    measure.notes.splice(selection.value.noteIndex, 1)
    // Keep a sensible selection: the note now in this slot, else the last one,
    // else just the measure (which may now be empty — and stays empty).
    selection.value = {
      measureIndex: selection.value.measureIndex,
      noteIndex: measure.notes.length
        ? Math.min(selection.value.noteIndex, measure.notes.length - 1)
        : null
    }
    markDirty()
  }

  /* ---- Tab and fingering ---------------------------------------------------
   * All manual, all optional, all per the data model: strings[] and frets[]
   * are per-pitch and nullable; leftFinger/rightFinger belong to the whole
   * note event. Nothing here reads the pitches — tabs are never derived.
   */

  // Keep strings[]/frets[] the same length as pitches[], padding with null.
  // Loaded data may predate an edit that changed the pitch count; aligning
  // here means the per-pitch indexes below always land where they should.
  // A tab-only note has no pitches but still owns one string/fret slot.
  function alignTabArrays(note) {
    const count = note.pitches.length || 1
    note.strings = Array.from({ length: count }, (_, i) => note.strings?.[i] ?? null)
    note.frets = Array.from({ length: count }, (_, i) => note.frets?.[i] ?? null)
  }

  /**
   * Set (or clear, with null) the string for one pitch of the selected note.
   * A tab-only note can't be cleared to null: without its string it would
   * vanish from every stave while still counting ticks — deleting the note is
   * the honest way to remove it.
   */
  function setSelectedString(pitchIndex, string) {
    const note = selectedNote.value
    if (!note || note.isRest) return
    if (string == null && isTabOnly(note)) return
    if (string != null && !(Number.isInteger(string) && string >= 1 && string <= 6)) return
    alignTabArrays(note)
    if (pitchIndex < 0 || pitchIndex >= note.strings.length) return
    note.strings[pitchIndex] = string
    markDirty()
  }

  /**
   * Set (or clear, with null) the fret for one pitch of the selected note.
   * Same rule as the string: a tab-only note keeps a fret or gets deleted.
   */
  function setSelectedFret(pitchIndex, fret) {
    const note = selectedNote.value
    if (!note || note.isRest) return
    if (fret == null && isTabOnly(note)) return
    if (fret != null && !(Number.isInteger(fret) && fret >= 0 && fret <= 24)) return
    alignTabArrays(note)
    if (pitchIndex < 0 || pitchIndex >= note.frets.length) return
    note.frets[pitchIndex] = fret
    markDirty()
  }

  /** Left-hand finger for the selected note: 1–4, or null for none. */
  function setSelectedLeftFinger(finger) {
    const note = selectedNote.value
    if (!note || note.isRest) return
    if (finger != null && !(Number.isInteger(finger) && finger >= 1 && finger <= 4)) return
    note.leftFinger = finger
    markDirty()
  }

  /** Right-hand finger for the selected note: p/i/m/a, or null for none. */
  function setSelectedRightFinger(finger) {
    const note = selectedNote.value
    if (!note || note.isRest) return
    if (finger != null && !['p', 'i', 'm', 'a'].includes(finger)) return
    note.rightFinger = finger
    markDirty()
  }

  /* ---- Selection movement and measures ------------------------------------- */

  /**
   * Walk the selection left/right through the score in written order. From
   * nothing selected, right starts at the first note, left at the last. Stops
   * quietly at either end.
   */
  function moveSelection(delta) {
    const positions = []
    score.value.measures.forEach((measure, measureIndex) => {
      measure.notes.forEach((_note, noteIndex) => positions.push({ measureIndex, noteIndex }))
    })
    if (!positions.length) return

    let index
    if (selectedNote.value) {
      index =
        positions.findIndex(
          (p) =>
            p.measureIndex === selection.value.measureIndex &&
            p.noteIndex === selection.value.noteIndex
        ) + delta
    } else {
      index = delta > 0 ? 0 : positions.length - 1
    }
    if (index < 0 || index >= positions.length) return
    selection.value = positions[index]
  }

  /** A new empty measure, after the selected one (or at the end). */
  function addMeasure() {
    const measures = score.value.measures
    const at = selection.value ? selection.value.measureIndex + 1 : measures.length
    measures.splice(at, 0, createMeasure())
    selection.value = { measureIndex: at, noteIndex: null }
    markDirty()
  }

  /** Remove the selected measure — notes and all, no questions, no re-flow. */
  function removeSelectedMeasure() {
    if (!canRemoveMeasure.value) return
    const measures = score.value.measures
    measures.splice(selection.value.measureIndex, 1)
    // Land on the measure now occupying this slot (or the new last one).
    selection.value = {
      measureIndex: Math.min(selection.value.measureIndex, measures.length - 1),
      noteIndex: null
    }
    markDirty()
  }

  return {
    score,
    scoreId,
    dirty,
    loading,
    saving,
    loadError,
    saveError,
    selection,
    pen,
    selectedMeasure,
    selectedNote,
    activeSettings,
    canRemoveMeasure,
    startNewScore,
    loadScore,
    saveScore,
    setTitle,
    setDescription,
    setTimeSignature,
    setDisplayMode,
    selectNote,
    clearSelection,
    addNote,
    addTabNote,
    addNoteAfterSelection,
    setDuration,
    toggleDot,
    toggleRest,
    transposeSelected,
    setSelectedLetter,
    deleteSelectedNote,
    setSelectedString,
    setSelectedFret,
    setSelectedLeftFinger,
    setSelectedRightFinger,
    moveSelection,
    addMeasure,
    removeSelectedMeasure
  }
})
