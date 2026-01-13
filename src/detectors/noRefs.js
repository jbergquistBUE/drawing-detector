/**
 * No-Refs Detector (PDF Text-Based)
 * Detects missing or incomplete reference callouts in engineering drawings
 * Searches for patterns like: -/---, -/-, --/---, etc.
 */

/**
 * Detects missing references from PDF text content
 * @param {Object} pdfPage - PDF page object with text items
 * @returns {Array} Array of missing reference locations in PDF coordinates
 */
const detectNoRefsFromPDF = (pdfPage) => {
  if (!pdfPage || !pdfPage.textItems) {
    return []
  }

  const noRefs = []

  // Pattern for missing references: dash(es) / dash(es) with optional trailing punctuation
  // Matches: -/---, -/-, --/---, ---/---, -/---., etc.
  const noRefPattern = /^-{1,4}\/-{1,4}[.,;:]?$/

  console.log('[NoRefs] Analyzing text items...')
  console.log(`[NoRefs] Total text items: ${pdfPage.textItems.length}`)
  console.log('[NoRefs] Viewport height:', pdfPage.viewport.height)

  for (const item of pdfPage.textItems) {
    const text = item.str.trim()

    // Log all text items that contain dashes and slashes for debugging
    if (text.includes('-') && text.includes('/')) {
      console.log(`[NoRefs] Found dash/slash text: "${text}" (length: ${text.length})`)
    }

    if (noRefPattern.test(text)) {
      console.log(`[NoRefs] ✓ Matched pattern: "${text}"`)

      // PDF.js item.transform contains raw PDF coordinates (bottom-left origin)
      // We need to apply the viewport transform to get canvas coordinates (top-left origin)
      // The viewport.transform handles scale AND Y-axis flip
      const viewportTransform = pdfPage.viewport.transform

      // Apply viewport transform to the item's position
      // transform[4] = x, transform[5] = y in PDF space
      const pdfX = item.transform[4]
      const pdfY = item.transform[5]

      // Manual transformation: apply viewport transform matrix
      // Viewport transform is [scaleX, 0, 0, -scaleY, 0, height*scale]
      // This flips Y and scales coordinates
      const canvasX = viewportTransform[0] * pdfX + viewportTransform[4]
      const canvasY = viewportTransform[3] * pdfY + viewportTransform[5]

      // Scale width/height by the viewport scale
      const scale = pdfPage.viewport.scale
      const width = Math.ceil(item.width * scale)
      const height = Math.ceil(item.height * scale)

      console.log(`[NoRefs] "${text}" PDF coords: (${pdfX.toFixed(1)}, ${pdfY.toFixed(1)}) -> Canvas coords: (${canvasX.toFixed(1)}, ${canvasY.toFixed(1)}) size ${width}x${height}`)
      console.log(`[NoRefs] Viewport transform:`, viewportTransform)

      noRefs.push({
        x: Math.floor(canvasX),
        y: Math.floor(canvasY) - height,  // Shift up by height to align with text
        width: width,
        height: height,
        text: text,
        detectionMethod: 'pdf-text',
        isCanvasCoords: true  // Already converted to canvas space
      })
    }
  }

  return noRefs
}

export async function detectNoRefs(imageData, onProgress, pdfPage = null) {
  // No need for canvas or image rendering - work directly with PDF data
  let elements = []

  // Use PDF text extraction if available
  if (pdfPage && pdfPage.textItems) {
    console.log('[NoRefs] Using PDF text detection')
    elements = detectNoRefsFromPDF(pdfPage)
    console.log(`[NoRefs] Found ${elements.length} missing references`)

    if (onProgress) {
      onProgress(elements.length)
    }
  } else {
    console.log('[NoRefs] No PDF data available, cannot detect missing references')
  }

  return {
    detected: elements.length > 0,
    count: elements.length,
    locations: elements,
    message: elements.length > 0
      ? `Found ${elements.length} missing reference(s) (-/---)`
      : 'No missing references detected'
  }
}
