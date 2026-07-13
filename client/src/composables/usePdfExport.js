/*
 * usePdfExport — turns the print sheet into a downloadable PDF, client-side.
 *
 * The pipeline is the one fixed by the assignment: VexFlow has already drawn
 * the score as an inline <svg>, svg2pdf.js copies that SVG into a jsPDF
 * document, and jsPDF saves it. The header (title, description) is drawn with
 * jsPDF's own text calls in its built-in serif — the DS fonts aren't embedded,
 * so Times stands in for Garamond on the PDF header.
 *
 * All the positioning math and the filename live in lib/printSheet.js as pure
 * functions; this composable only holds the browser/library glue and the
 * quiet exporting/error state for the page.
 */
import { ref } from 'vue'
import { jsPDF } from 'jspdf'
// Side-effect import: registers the async `doc.svg(element, options)` method.
import 'svg2pdf.js'
import { pdfFilename, pdfLayout, cssColorToRgb } from '@/lib/printSheet'

/*
 * VexFlow sizes its SVG text in pt units (10pt on the root element, 9/12pt on
 * fingering and annotations). svg2pdf can't resolve pt, so every glyph came
 * out at font size 0 — invisible tab digits, with only VexFlow's little
 * line-masking rectangle left where each number should be. The browser has
 * already computed every text's real font, though: so the PDF gets a CLONE of
 * the SVG with each <text>'s computed font stamped on as px attributes, which
 * svg2pdf reads correctly. The rendered sheet itself is never touched.
 */
function withPrintableText(svg) {
  const clone = svg.cloneNode(true)
  // querySelectorAll walks both trees in the same document order, so the
  // original and its clone line up index for index.
  const originals = svg.querySelectorAll('text')
  const clones = clone.querySelectorAll('text')
  originals.forEach((text, i) => {
    const style = getComputedStyle(text)
    clones[i].setAttribute('font-family', style.fontFamily)
    clones[i].setAttribute('font-size', style.fontSize) // resolved to px
    clones[i].setAttribute('font-weight', style.fontWeight)
    clones[i].setAttribute('font-style', style.fontStyle)
  })
  return clone
}

export function usePdfExport() {
  const exporting = ref(false)
  const exportError = ref('')

  /**
   * Build and save the PDF from a rendered sheet.
   *   sheetElement — the .print-sheet DOM element (the SVG and the resolved
   *                  ink colour are read off it, so the PDF matches the sheet)
   *   score        — the score model (title/description for the header,
   *                  title again for the filename)
   */
  async function downloadPdf(sheetElement, score) {
    if (!sheetElement || !score || exporting.value) return
    exporting.value = true
    exportError.value = ''
    try {
      const svg = sheetElement.querySelector('svg')
      if (!svg) throw new Error('The sheet has no rendered score.')

      // The renderer sizes the SVG in px attributes; the PDF page is built
      // around those same numbers (see pdfLayout — everything is 1:1 px).
      const svgWidth = Number(svg.getAttribute('width'))
      const svgHeight = Number(svg.getAttribute('height'))
      if (!svgWidth || !svgHeight) throw new Error('The sheet has no drawn size.')

      const title = score.title || 'Untitled score'
      const description = (score.description || '').trim()
      // The credits line: tempo left, composer right — same text as the sheet.
      const tempo = score.bpm ? `${score.bpm} bpm` : ''
      const composer = (score.composer || '').trim()
      const layout = pdfLayout({
        svgWidth,
        svgHeight,
        hasDescription: Boolean(description),
        hasCredits: Boolean(tempo || composer)
      })

      const doc = new jsPDF({
        unit: 'px',
        // Without this hotfix jsPDF quietly treats px as pt (≈33% too large).
        hotfixes: ['px_scaling'],
        format: [layout.pageWidth, layout.pageHeight],
        // jsPDF swaps the format pair to match the orientation, so a sheet
        // wider than tall must ask for landscape or it comes back rotated.
        orientation: layout.pageWidth > layout.pageHeight ? 'landscape' : 'portrait'
      })

      // Header text in the sheet's own engraving ink (read off the element,
      // so the colour stays a DS token decision, not a number in code).
      const ink = cssColorToRgb(getComputedStyle(sheetElement).color)
      if (ink) doc.setTextColor(ink[0], ink[1], ink[2])

      doc.setFont('times', 'normal')
      doc.setFontSize(layout.titleSize)
      doc.text(title, layout.pageWidth / 2, layout.titleBaseline, { align: 'center' })

      if (description) {
        doc.setFont('times', 'italic')
        doc.setFontSize(layout.descriptionSize)
        doc.text(description, layout.pageWidth / 2, layout.descriptionBaseline, { align: 'center' })
      }

      if (tempo || composer) {
        doc.setFont('times', 'italic')
        doc.setFontSize(layout.creditsSize)
        if (tempo) {
          doc.text(tempo, layout.margin, layout.creditsBaseline)
        }
        if (composer) {
          doc.text(composer, layout.pageWidth - layout.margin, layout.creditsBaseline, {
            align: 'right'
          })
        }
      }

      await doc.svg(withPrintableText(svg), {
        x: layout.margin,
        y: layout.scoreTop,
        width: svgWidth,
        height: svgHeight
      })

      doc.save(pdfFilename(score.title))
    } catch {
      exportError.value = "The PDF couldn't be put together just now — try again in a moment."
    } finally {
      exporting.value = false
    }
  }

  return { exporting, exportError, downloadPdf }
}
