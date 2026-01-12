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
 * Detects overlapping text using PDF text positions
 * @param {Object} pdfPage - PDF page object with text items
 * @returns {Array} Array of overlapping text regions with text content
 */
const detectOverlapsFromPDF = (pdfPage) => {
  if (!pdfPage || !pdfPage.textItems) {
    return []
  }

  const overlaps = []

  // Filter to only include likely text items (not graphics)
  const textItems = pdfPage.textItems.filter(isLikelyText)

  // Check each pair of text items for overlap
  for (let i = 0; i < textItems.length; i++) {
    const item1 = textItems[i]

    for (let j = i + 1; j < textItems.length; j++) {
      const item2 = textItems[j]

      // Calculate bounding boxes
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

      // Check for overlap
      const horizontalOverlap = !(box1.x + box1.width < box2.x || box2.x + box2.width < box1.x)
      const verticalOverlap = !(box1.y + box1.height < box2.y || box2.y + box2.height < box1.y)

      if (horizontalOverlap && verticalOverlap) {
        // Calculate overlap region
        const overlapX = Math.max(box1.x, box2.x)
        const overlapY = Math.max(box1.y, box2.y)
        const overlapWidth = Math.min(box1.x + box1.width, box2.x + box2.width) - overlapX
        const overlapHeight = Math.min(box1.y + box1.height, box2.y + box2.height) - overlapY

        // Only report significant overlaps (not just touching edges)
        // Increased threshold to avoid small symbol overlaps
        if (overlapWidth > 5 && overlapHeight > 5) {
          overlaps.push({
            x: Math.floor(overlapX),
            y: Math.floor(overlapY),
            width: Math.ceil(overlapWidth),
            height: Math.ceil(overlapHeight),
            text1: item1.str,
            text2: item2.str,
            pixelCount: Math.ceil(overlapWidth * overlapHeight)
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
    pixelCount
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

export async function detectOverlappingText(imageData, onProgress, pdfPage = null) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const img = new Image()
  img.src = imageData

  return new Promise((resolve) => {
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = pixels.data

      let elements = []

      // Hybrid approach: Use PDF text to identify candidates, verify with pixels
      if (pdfPage && pdfPage.textItems) {
        console.log('[OverlappingText] Using hybrid detection with PDF text analysis')
        const pdfOverlaps = detectOverlapsFromPDF(pdfPage)

        console.log(`[OverlappingText] PDF detected ${pdfOverlaps.length} potential overlaps`)

        if (pdfOverlaps.length > 0) {
          // Filter PDF overlaps to only those with substantial visual overlap
          for (const overlap of pdfOverlaps) {
            // Scale PDF coordinates to image coordinates
            const scaleX = canvas.width / pdfPage.viewport.width
            const scaleY = canvas.height / pdfPage.viewport.height

            const scaledOverlap = {
              x: Math.floor(overlap.x * scaleX),
              y: Math.floor(canvas.height - (overlap.y + overlap.height) * scaleY),
              width: Math.ceil(overlap.width * scaleX),
              height: Math.ceil(overlap.height * scaleY),
              text1: overlap.text1,
              text2: overlap.text2,
              pixelCount: overlap.pixelCount
            }

            // Verify with pixel density - must be substantial overlap
            const density = calculateDensity(data, canvas.width, canvas.height, scaledOverlap)

            // Only accept if density is high enough (real visual overlap)
            // AND the overlap region is text-sized
            if (density > 0.4 &&
                scaledOverlap.width > 20 &&
                scaledOverlap.height > 8 &&
                scaledOverlap.height < 40) {

              console.log(`[OverlappingText] ✓ "${overlap.text1}" overlaps "${overlap.text2}" (density: ${density.toFixed(2)})`)

              elements.push({
                ...scaledOverlap,
                density: density,
                detectionMethod: 'hybrid'
              })

              if (onProgress) {
                onProgress(elements.length)
              }
            }
          }

          console.log(`[OverlappingText] Hybrid verified ${elements.length} real overlaps`)
        }

        // Always run pixel detection as fallback/supplement
        console.log('[OverlappingText] Running pixel detection as fallback')
        const pixelElements = findOverlappingTextWithProgress(data, canvas.width, canvas.height, onProgress)

        // Merge hybrid and pixel results, removing duplicates
        for (const pixelElem of pixelElements) {
          const isDuplicate = elements.some(hybridElem =>
            Math.abs(hybridElem.x - pixelElem.x) < 50 &&
            Math.abs(hybridElem.y - pixelElem.y) < 50
          )

          if (!isDuplicate) {
            elements.push(pixelElem)
          }
        }

        console.log(`[OverlappingText] Final count: ${elements.length} overlaps`)
      } else {
        // No PDF data available, use pixel-only detection
        console.log('[OverlappingText] No PDF data, using pixel-only detection')
        elements = findOverlappingTextWithProgress(data, canvas.width, canvas.height, onProgress)
      }

      // Generate message with text content if available
      let message = 'No overlapping text detected'
      if (elements.length > 0) {
        const hasTextInfo = elements.some(e => e.text1 && e.text2)
        if (hasTextInfo) {
          message = `Found ${elements.length} overlapping text region(s) with text content`
        } else {
          message = `Found ${elements.length} overlapping text region(s)`
        }
      }

      resolve({
        detected: elements.length > 0,
        count: elements.length,
        locations: elements,
        message: message
      })
    }
  })
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
