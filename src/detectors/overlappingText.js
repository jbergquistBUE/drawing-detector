/**
 * Overlapping Text Detector
 * Detects overlapping or colliding text elements in engineering drawings
 * by identifying areas with abnormally high black pixel density
 */

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

export async function detectOverlappingText(imageData, onProgress) {
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

      const elements = findOverlappingTextWithProgress(data, canvas.width, canvas.height, onProgress)

      resolve({
        detected: elements.length > 0,
        count: elements.length,
        locations: elements,
        message: elements.length > 0
          ? `Found ${elements.length} overlapping text region(s)`
          : 'No overlapping text detected'
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
