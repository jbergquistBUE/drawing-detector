/**
 * No-Refs Detector (PDF Text-Based)
 * Detects missing or incomplete reference callouts in engineering drawings
 * Searches for patterns like: -/---, -/-, --/---, etc.
 */

/**
 * Detects missing references from PDF text content
 * @param {Object} pdfPage - PDF page object with text items
 * @param {number} canvasWidth - Canvas width for coordinate scaling
 * @param {number} canvasHeight - Canvas height for coordinate scaling
 * @returns {Array} Array of missing reference locations
 */
const detectNoRefsFromPDF = (pdfPage, canvasWidth, canvasHeight) => {
  if (!pdfPage || !pdfPage.textItems) {
    return []
  }

  const noRefs = []

  // Pattern for missing references: dash(es) / dash(es) with optional trailing punctuation
  // Matches: -/---, -/-, --/---, ---/---, -/---., etc.
  const noRefPattern = /^-{1,4}\/-{1,4}[.,;:]?$/

  console.log('[NoRefs] Analyzing text items...')
  console.log(`[NoRefs] Total text items: ${pdfPage.textItems.length}`)

  for (const item of pdfPage.textItems) {
    const text = item.str.trim()

    // Log all text items that contain dashes and slashes for debugging
    if (text.includes('-') && text.includes('/')) {
      console.log(`[NoRefs] Found dash/slash text: "${text}" (length: ${text.length})`)
    }

    if (noRefPattern.test(text)) {
      console.log(`[NoRefs] ✓ Matched pattern: "${text}"`)

      // Scale PDF coordinates to image coordinates
      const scaleX = canvasWidth / pdfPage.viewport.width
      const scaleY = canvasHeight / pdfPage.viewport.height

      // PDF coordinates have origin at bottom-left, canvas has origin at top-left
      const x = Math.floor(item.transform[4] * scaleX)
      const y = Math.floor(canvasHeight - (item.transform[5] + item.height) * scaleY)
      const width = Math.ceil(item.width * scaleX)
      const height = Math.ceil(item.height * scaleY)

      console.log(`[NoRefs] "${text}" at PDF coords (${item.transform[4]}, ${item.transform[5]}) -> canvas (${x}, ${y}) size ${width}x${height}`)

      noRefs.push({
        x: x,
        y: y,
        width: width,
        height: height,
        text: text,
        detectionMethod: 'pdf-text'
      })
    }
  }

  return noRefs
}

export async function detectNoRefs(imageData, onProgress, pdfPage = null) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const img = new Image()
  img.src = imageData

  return new Promise((resolve) => {
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      let elements = []

      // Use PDF text extraction if available
      if (pdfPage && pdfPage.textItems) {
        console.log('[NoRefs] Using PDF text detection')
        elements = detectNoRefsFromPDF(pdfPage, canvas.width, canvas.height)
        console.log(`[NoRefs] Found ${elements.length} missing references`)

        if (onProgress) {
          onProgress(elements.length)
        }
      } else {
        console.log('[NoRefs] No PDF data available, cannot detect missing references')
      }

      resolve({
        detected: elements.length > 0,
        count: elements.length,
        locations: elements,
        message: elements.length > 0
          ? `Found ${elements.length} missing reference(s) (-/---)`
          : 'No missing references detected'
      })
    }
  })
}
