// The score being edited, as reactive state — plus the selection and the "pen".
//
// This is a Pinia store rather than EditorPage-local state for two reasons:
// several components need the same state (the toolbar edits it, the canvas
// renders it, the page's keyboard handler drives it), and Phase 4c will load
// and save this exact state through the API — a store means that wiring lands
// in one place. Every edit is a named action, so each mutation of the score
// can be read, explained and tested on its own.
//
// The core philosophy holds everywhere here: an action changes exactly what it
// says and nothing else. Adding a note never inserts rests or pads a measure;
// deleting never re-flows anything; empty measures stay empty.

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createMeasure, defaultNextNote } from '@/lib/scoreModel'
import { makeSampleScore } from '@/lib/sampleScore'
import { shiftPitch, setPitchLetter } from '@/lib/pitches'

export const useScoreStore = defineStore('score', () => {
  // TEMPORARY seed: the Phase 4a sample score, so there is material to edit
  // before load/save arrives in 4c. No mock data ships in the final app.
  const score = ref(makeSampleScore('both'))

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

  /**
   * Write one note (or rest) into a measure at a position — the payload the
   * canvas emits for a staff click. Exactly one note appears; nothing is
   * padded, completed or corrected.
   */
  function addNote({ measureIndex, insertIndex, pitch }) {
    const measure = score.value.measures[measureIndex]
    if (!measure) return
    const note = defaultNextNote(pen.value) // pen's duration + dot
    note.isRest = pen.value.isRest
    if (!note.isRest && pitch) note.pitches = [pitch]
    measure.notes.splice(insertIndex, 0, note)
    selectNote(measureIndex, insertIndex)
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
    } else {
      pen.value.duration = code
    }
  }

  function toggleDot() {
    if (selectedNote.value) {
      selectedNote.value.dotted = !selectedNote.value.dotted
      rememberPen(selectedNote.value)
    } else {
      pen.value.dotted = !pen.value.dotted
    }
  }

  // Toggling a note into a rest keeps its pitches, so toggling back restores
  // them. With nothing selected this flips the pen between notes and rests.
  function toggleRest() {
    if (selectedNote.value) {
      selectedNote.value.isRest = !selectedNote.value.isRest
    } else {
      pen.value.isRest = !pen.value.isRest
    }
  }

  /** Move the selected note by `delta` staff positions (±7 = an octave). */
  function transposeSelected(delta) {
    const note = selectedNote.value
    if (!note || note.isRest) return
    // A chord transposes as a block, keeping its shape.
    note.pitches = note.pitches.map((pitch) => shiftPitch(pitch, delta))
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
  }

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
  }

  return {
    score,
    selection,
    pen,
    selectedMeasure,
    selectedNote,
    activeSettings,
    canRemoveMeasure,
    selectNote,
    clearSelection,
    addNote,
    addNoteAfterSelection,
    setDuration,
    toggleDot,
    toggleRest,
    transposeSelected,
    setSelectedLetter,
    deleteSelectedNote,
    moveSelection,
    addMeasure,
    removeSelectedMeasure
  }
})
