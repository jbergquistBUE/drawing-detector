/**
 * Overlapping Text Detector (Hybrid Approach)
 * Detects overlapping or colliding text elements in engineering drawings using:
 * 1. PDF text position analysis - Detects text bounding box overlaps
 * 2. Pixel density verification - Confirms visual overlap with high black pixel density
 */

/**
 * Checks if a text item is likely actual text (not graphics/symbols)
 * @param {Object} item - PDF text item
 * @returns {boolean} True if likely text
 */
const isLikelyText = (item) => {
  const text = item.str.trim()

  // Filter out empty strings
  if (!text) return false

  // Filter out single special characters (likely graphics symbols)
  if (text.length === 1 && !/[a-zA-Z0-9]/.test(text)) return false

  // Filter out items that are too small (likely decorative dots/symbols)
  if (item.height < 4 || item.width < 4) return false

  // Filter out items with very small font sizes (likely symbols)
  if (item.transform && Math.abs(item.transform[0]) < 4) return false

  return true
}

/**
 * Checks if a text item is a standalone detail/sheet reference (no prefix like D/ or 1/)
 * These appear in bubbles/circles
 * @param {string} text - Text to check
 * @returns {boolean} True if it's a standalone detail reference
 */
const isStandaloneDetailReference = (text) => {
  // Pattern for standalone detail references like "630SX001", "610SD025", "610SD200"
  // These appear in bubbles - NO prefix allowed (no D/, 1/, etc.)
  // Format: exactly 3 digits + 1-2 letters + 3 digits
  const standalonePattern = /^\d{3}[A-Z]{1,2}\d{3}$/i
  return standalonePattern.test(text)
}

/**
 * Checks if a text item is a bubble/circle number (single digit or letter)
 * @param {string} text - Text to check
 * @returns {boolean} True if it's a bubble number
 */
const isBubbleNumber = (text) => {
  // Single digit or letter that appears in bubbles above detail references
  return /^[0-9A-Z]$/i.test(text)
}

/**
 * Identifies callout bubble regions by finding standalone detail references
 * and creating exclusion zones around them
 * @param {Array} textItems - All text items from the PDF
 * @returns {Array} Array of bubble regions {x, y, width, height, radius}
 */
const findCalloutBubbles = (textItems) => {
  const bubbles = []

  for (const item of textItems) {
    const text = item.str.trim()

    // Look for standalone detail references (these are always inside bubbles)
    if (isStandaloneDetailReference(text)) {
      // Create a bubble region around the detail reference
      // The bubble typically extends above (for the number) and around the text
      const x = item.transform[4]
      const y = item.transform[5]
      const width = item.width
      const height = item.height

      // Create an exclusion zone - bubble extends about 2x the text height above
      // and has padding on all sides
      const padding = Math.max(width, height) * 0.5
      const bubbleRegion = {
        x: x - padding,
        y: y - height * 2,  // Extend upward for the bubble number
        width: width + padding * 2,
        height: height * 3,  // Cover the number above and the reference below
        centerX: x + width / 2,
        centerY: y - height * 0.5,
        radius: Math.max(width, height * 2)  // Approximate bubble radius
      }

      bubbles.push(bubbleRegion)
    }
  }

  return bubbles
}

/**
 * Checks if a point/region is inside any callout bubble
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Width of the region
 * @param {number} height - Height of the region
 * @param {Array} bubbles - Array of bubble regions
 * @returns {boolean} True if the region is inside a bubble
 */
const isInsideBubble = (x, y, width, height, bubbles) => {
  const centerX = x + width / 2
  const centerY = y + height / 2

  for (const bubble of bubbles) {
    // Check if center point is within the bubble's bounding box
    if (centerX >= bubble.x && centerX <= bubble.x + bubble.width &&
        centerY >= bubble.y && centerY <= bubble.y + bubble.height) {
      return true
    }

    // Also check using circular distance from bubble center
    const dx = centerX - bubble.centerX
    const dy = centerY - bubble.centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance < bubble.radius) {
      return true
    }
  }

  return false
}

/**
 * Checks if two text items are likely a false positive overlap
 * @param {Object} item1 - First text item
 * @param {Object} item2 - Second text item
 * @returns {boolean} True if this is likely a false positive
 */
const isFalsePositiveOverlap = (item1, item2) => {
  const text1 = item1.str.trim()
  const text2 = item2.str.trim()

  // If both texts are very short (1-2 chars each), likely symbols or markers
  if (text1.length <= 2 && text2.length <= 2) return true

  return false
}

/**
 * Detects overlapping text using PDF text positions
 * @param {Object} pdfPage - PDF page object with text items
 * @returns {Array} Array of overlapping text regions with text content in PDF coordinates
 */
const detectOverlapsFromPDF = (pdfPage) => {
  if (!pdfPage || !pdfPage.textItems) {
    return []
  }

  const overlaps = []

  // Filter to only include likely text items (not graphics)
  const textItems = pdfPage.textItems.filter(isLikelyText)

  // Find all callout bubbles to create exclusion zones
  const bubbles = findCalloutBubbles(pdfPage.textItems)
  console.log(`[OverlappingText] Found ${bubbles.length} callout bubbles to exclude`)

  // Get viewport transform for coordinate conversion
  const viewportTransform = pdfPage.viewport.transform
  const scale = pdfPage.viewport.scale

  // Check each pair of text items for overlap
  for (let i = 0; i < textItems.length; i++) {
    const item1 = textItems[i]

    // Skip if item1 is inside a callout bubble
    if (isInsideBubble(item1.transform[4], item1.transform[5], item1.width, item1.height, bubbles)) {
      continue
    }

    for (let j = i + 1; j < textItems.length; j++) {
      const item2 = textItems[j]

      // Skip if item2 is inside a callout bubble
      if (isInsideBubble(item2.transform[4], item2.transform[5], item2.width, item2.height, bubbles)) {
        continue
      }

      // Skip false positive overlaps (very short text pairs)
      if (isFalsePositiveOverlap(item1, item2)) continue

      // Calculate bounding boxes in PDF coordinates (origin at bottom-left)
      const box1 = {
        x: item1.transform[4],
        y: item1.transform[5],
        width: item1.width,
        height: item1.height
      }

      const box2 = {
        x: item2.transform[4],
        y: item2.transform[5],
        width: item2.width,
        height: item2.height
      }

      // Check for overlap in PDF space
      const horizontalOverlap = !(box1.x + box1.width < box2.x || box2.x + box2.width < box1.x)
      const verticalOverlap = !(box1.y + box1.height < box2.y || box2.y + box2.height < box1.y)

      if (horizontalOverlap && verticalOverlap) {
        // Calculate overlap region in PDF coordinates
        const overlapX = Math.max(box1.x, box2.x)
        const overlapY = Math.max(box1.y, box2.y)
        const overlapWidth = Math.min(box1.x + box1.width, box2.x + box2.width) - overlapX
        const overlapHeight = Math.min(box1.y + box1.height, box2.y + box2.height) - overlapY

        // Only report significant overlaps (not just touching edges)
        // Increased threshold to avoid small symbol overlaps
        if (overlapWidth > 5 && overlapHeight > 5) {
          // Apply viewport transform to convert PDF coords to canvas coords
          // Viewport transform is [scaleX, 0, 0, -scaleY, 0, height*scale]
          const canvasX = viewportTransform[0] * overlapX + viewportTransform[4]
          const canvasY = viewportTransform[3] * overlapY + viewportTransform[5]

          const scaledHeight = Math.ceil(overlapHeight * scale)

          overlaps.push({
            x: Math.floor(canvasX),
            y: Math.floor(canvasY) - scaledHeight,  // Shift up by height to align with text
            width: Math.ceil(overlapWidth * scale),
            height: scaledHeight,
            text1: item1.str,
            text2: item2.str,
            pixelCount: Math.ceil(overlapWidth * overlapHeight * scale * scale),
            detectionMethod: 'pdf-text',
            isCanvasCoords: true  // Already converted to canvas space
          })
        }
      }
    }
  }

  return overlaps
}

const traceBlackRegion = (data, width, height, startX, startY, visited) => {
  let minX = startX, maxX = startX
  let minY = startY, maxY = startY
  let pixelCount = 0

  const queue = [[startX, startY]]

  const isBlack = (r, g, b) => r < 80 && g < 80 && b < 80

  while (queue.length > 0 && pixelCount < 10000) {
    const [x, y] = queue.shift()
    const key = `${x},${y}`

    if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
      continue
    }

    const idx = (y * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]

    if (isBlack(r, g, b)) {
      visited.add(key)
      pixelCount++

      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)

      // Expand primarily horizontally for text-like patterns
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    pixelCount,
    detectionMethod: 'pixel',
    isCanvasCoords: true  // Pixel detection always works in canvas coordinate space
  }
}

// Calculate the density of black pixels in a region
const calculateDensity = (data, width, height, element) => {
  let blackCount = 0
  let totalCount = 0

  for (let y = element.y; y < element.y + element.height && y < height; y++) {
    for (let x = element.x; x < element.x + element.width && x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      totalCount++
      if (r < 80 && g < 80 && b < 80) {
        blackCount++
      }
    }
  }

  return blackCount / totalCount
}

// Check if the region looks like overlapping text by examining density patterns
const isOverlappingText = (data, width, height, element) => {
  const density = calculateDensity(data, width, height, element)

  // Overlapping text has moderately high density
  // Lower bound: catch lighter overlaps, Upper bound: exclude solid graphics
  if (density < 0.32 || density > 0.7) {
    return false
  }

  // Check aspect ratio - text should be wider than tall
  const aspectRatio = element.width / element.height
  if (aspectRatio < 2.0 || aspectRatio > 15) {
    return false
  }

  // Check dimensions - should match typical text size
  if (element.height < 10 || element.height > 35) {
    return false
  }

  if (element.width < 30) {
    return false
  }

  // Sample horizontal lines to check for text-like patterns
  let linesWithVariation = 0
  const sampleLines = Math.min(5, element.height)

  for (let i = 0; i < sampleLines; i++) {
    const y = Math.floor(element.y + (element.height * i / sampleLines))
    if (y >= height) continue

    let transitions = 0
    let prevBlack = false

    for (let x = element.x; x < element.x + element.width && x < width; x += 2) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const isBlack = r < 80 && g < 80 && b < 80

      if (isBlack !== prevBlack) {
        transitions++
      }
      prevBlack = isBlack
    }

    // Text has multiple transitions per line (characters have gaps)
    if (transitions >= 6) {
      linesWithVariation++
    }
  }

  // Should have variation in multiple lines (indicates text characters)
  return linesWithVariation >= 3
}

const findOverlappingText = (data, width, height) => {
  const elements = []
  const visited = new Set()

  // Scan with finer granularity to catch dense regions
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 6) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const isBlack = r < 80 && g < 80 && b < 80

      if (isBlack) {
        const key = `${x},${y}`
        if (!visited.has(key)) {
          const element = traceBlackRegion(data, width, height, x, y, visited)

          if (!element) continue

          if (isOverlappingText(data, width, height, element)) {
            elements.push(element)
          }
        }
      }
    }
  }

  // Merge nearby overlapping text regions
  return mergeNearbyRegions(elements)
}

const mergeNearbyRegions = (elements) => {
  if (elements.length === 0) return elements

  const mergeDistance = 10

  let merged = true
  let currentElements = [...elements]

  while (merged) {
    merged = false
    const newElements = []
    const processed = new Set()

    for (let i = 0; i < currentElements.length; i++) {
      if (processed.has(i)) continue

      let element = currentElements[i]
      processed.add(i)

      for (let j = i + 1; j < currentElements.length; j++) {
        if (processed.has(j)) continue

        const other = currentElements[j]

        const horizontalDistance = Math.max(
          element.x - (other.x + other.width),
          other.x - (element.x + element.width),
          0
        )
        const verticalDistance = Math.max(
          element.y - (other.y + other.height),
          other.y - (element.y + element.height),
          0
        )

        if (horizontalDistance <= mergeDistance && verticalDistance <= mergeDistance) {
          const minX = Math.min(element.x, other.x)
          const minY = Math.min(element.y, other.y)
          const maxX = Math.max(element.x + element.width, other.x + other.width)
          const maxY = Math.max(element.y + element.height, other.y + other.height)

          element = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            pixelCount: element.pixelCount + other.pixelCount
          }

          processed.add(j)
          merged = true
        }
      }

      newElements.push(element)
    }

    currentElements = newElements
  }

  return currentElements
}

// PDF-based detection: analyzes text bounding boxes from PDF
export async function detectOverlappingTextPDF(pdfPage, onProgress) {
  let elements = []

  if (pdfPage && pdfPage.textItems) {
    console.log('[OverlappingText-PDF] Using PDF text analysis')
    elements = detectOverlapsFromPDF(pdfPage)
    console.log(`[OverlappingText-PDF] PDF detected ${elements.length} overlapping text regions`)

    if (onProgress) {
      onProgress(elements.length)
    }
  } else {
    console.log('[OverlappingText-PDF] No PDF data available')
  }

  // Generate message with text content if available
  let message = 'No overlapping text detected (PDF analysis)'
  if (elements.length > 0) {
    const hasTextInfo = elements.some(e => e.text1 && e.text2)
    if (hasTextInfo) {
      message = `Found ${elements.length} overlapping text region(s) with text content (PDF analysis)`
    } else {
      message = `Found ${elements.length} overlapping text region(s) (PDF analysis)`
    }
  }

  return {
    detected: elements.length > 0,
    count: elements.length,
    locations: elements,
    message: message
  }
}

// Pixel-based detection: scans rendered canvas for dense black regions
export async function detectOverlappingTextPixel(imageData, onProgress) {
  console.log('[OverlappingText-Pixel] Using pixel analysis')

  const elements = findOverlappingTextWithProgress(
    imageData.data,
    imageData.width,
    imageData.height,
    onProgress
  )

  console.log(`[OverlappingText-Pixel] Pixel detected ${elements.length} overlapping text regions`)

  return {
    detected: elements.length > 0,
    count: elements.length,
    locations: elements,
    message: elements.length > 0
      ? `Found ${elements.length} overlapping text region(s) (pixel analysis)`
      : 'No overlapping text detected (pixel analysis)'
  }
}

// Main function: runs BOTH PDF and pixel detection, merges results
export async function detectOverlappingText(imageData, onProgress, pdfPage = null) {
  console.log('[OverlappingText] Running dual detection (PDF + Pixel)')

  let pdfElements = []
  let pixelElements = []

  // Step 1: PDF-based detection (if PDF data available)
  if (pdfPage && pdfPage.textItems) {
    console.log('[OverlappingText] Step 1: PDF text analysis')
    pdfElements = detectOverlapsFromPDF(pdfPage)
    console.log(`[OverlappingText] PDF detected ${pdfElements.length} overlapping text regions`)
  } else {
    console.log('[OverlappingText] No PDF data available for PDF analysis')
  }

  // Step 2: Pixel-based detection (always run on rendered image)
  console.log('[OverlappingText] Step 2: Pixel analysis')
  pixelElements = findOverlappingText(imageData.data, imageData.width, imageData.height)
  console.log(`[OverlappingText] Pixel detected ${pixelElements.length} overlapping text regions`)

  // Step 3: Merge results (keep all unique detections)
  const allElements = [...pdfElements, ...pixelElements]
  console.log(`[OverlappingText] Total detections: ${allElements.length} (${pdfElements.length} PDF + ${pixelElements.length} pixel)`)

  if (onProgress) {
    onProgress(allElements.length)
  }

  // Generate message with text content if available
  let message = 'No overlapping text detected'
  if (allElements.length > 0) {
    const hasTextInfo = allElements.some(e => e.text1 && e.text2)
    if (hasTextInfo) {
      message = `Found ${allElements.length} overlapping text region(s) (${pdfElements.length} PDF, ${pixelElements.length} pixel)`
    } else {
      message = `Found ${allElements.length} overlapping text region(s) (${pdfElements.length} PDF, ${pixelElements.length} pixel)`
    }
  }

  return {
    detected: allElements.length > 0,
    count: allElements.length,
    locations: allElements,
    message: message
  }
}

const findOverlappingTextWithProgress = (data, width, height, onProgress) => {
  const elements = []
  const visited = new Set()

  // Scan with finer granularity to catch dense regions
  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 6) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const isBlack = r < 80 && g < 80 && b < 80

      if (isBlack) {
        const key = `${x},${y}`
        if (!visited.has(key)) {
          const element = traceBlackRegion(data, width, height, x, y, visited)

          if (!element) continue

          if (isOverlappingText(data, width, height, element)) {
            elements.push(element)
          }
        }
      }
    }
  }

  // Merge nearby overlapping text regions
  const mergedElements = mergeNearbyRegions(elements)

  if (onProgress) {
    onProgress(mergedElements.length)
  }

  return mergedElements
}
