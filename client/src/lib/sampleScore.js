/*
 * sampleScore.js — a hard-coded score used only to prove the Phase 4a render
 * pipeline. It exercises the things the renderer must get right:
 *   • single notes and a chord
 *   • a dotted note
 *   • a rest (drawn on the notation stave, absent from the tab stave)
 *   • a note with NO tab data (present in notation, absent from tab — tabs are
 *     manual and never derived)
 *   • a deliberately overfull measure (soft voices must render it, not throw)
 *   • an empty measure (stays empty — no auto-fill)
 *
 * TEMPORARY: this is demo data. It will be removed once the editor loads and
 * saves real scores through the API (Phase 4c / Phase 5). No mock data ships in
 * the final app.
 */
import { createNote, createMeasure, createScore } from './scoreModel'

export function makeSampleScore(displayMode = 'both') {
  return createScore({
    title: 'Sample — pipeline check',
    description: 'A hard-coded score to verify rendering in all three modes.',
    timeSignature: '4/4',
    keySignature: 'C',
    displayMode,
    measures: [
      // Measure 1 — tidy 4/4: two quarters, a dotted quarter, and an eighth.
      // The eighth has no tab data, so it shows in notation but not on the tab.
      createMeasure({
        notes: [
          createNote({ pitches: ['e/4'], duration: 'q', strings: [1], frets: [0] }),
          createNote({ pitches: ['g/4'], duration: 'q', strings: [1], frets: [3] }),
          createNote({ pitches: ['b/4'], duration: 'q', dotted: true, strings: [2], frets: [0] }),
          createNote({ pitches: ['d/5'], duration: '8' }) // no string/fret → tab omits it
        ]
      }),

      // Measure 2 — a C-major chord (three strings at once), a rest, then a note.
      // The rest carries no tab and simply doesn't appear on the tab stave.
      createMeasure({
        notes: [
          createNote({
            pitches: ['c/4', 'e/4', 'g/4'],
            duration: 'h',
            strings: [5, 4, 3],
            frets: [3, 2, 0]
          }),
          createNote({ duration: 'q', isRest: true }),
          createNote({ pitches: ['a/4'], duration: 'q', strings: [3], frets: [2] })
        ]
      }),

      // Measure 3 — five quarter notes in 4/4: overfull on purpose. Soft voices
      // render it calmly; being "wrong" is allowed.
      createMeasure({
        notes: [
          createNote({ pitches: ['c/5'], duration: 'q', strings: [2], frets: [1] }),
          createNote({ pitches: ['d/5'], duration: 'q', strings: [2], frets: [3] }),
          createNote({ pitches: ['e/5'], duration: 'q', strings: [1], frets: [0] }),
          createNote({ pitches: ['f/5'], duration: 'q', strings: [1], frets: [1] }),
          createNote({ pitches: ['g/5'], duration: 'q', strings: [1], frets: [3] })
        ]
      }),

      // Measure 4 — intentionally empty. Empty measures stay empty.
      createMeasure()
    ]
  })
}
