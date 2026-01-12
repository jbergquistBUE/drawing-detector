/**
 * Highlights Detector
 * Detects highlighted areas in engineering drawings (typically yellow/bright colors)
 */

const traceHighlightedArea = (data, width, height, startX, startY, visited) => {
  let minX = startX, maxX = startX
  let minY = startY, maxY = startY
  let pixelCount = 0

  const queue = [[startX, startY]]

  const isHighlight = (r, g, b) => {
    const avg = (r + g + b) / 3
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))

    const isGreyHighlight = maxDiff < 40 && avg > 120 && avg < 180
    const isColorHighlight = (
      (r > 200 && g > 200 && b < 150) ||
      (r < 150 && g > 200 && b < 150) ||
      (r < 150 && g < 150 && b > 200) ||
      (r > 200 && g < 150 && b > 200)
    )

    return isGreyHighlight || isColorHighlight
  }

  while (queue.length > 0 && pixelCount < 100000) {
    const [x, y] = queue.shift()
    const key = `${x},${y}`

    if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
      continue
    }

    const idx = (y * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]

    if (isHighlight(r, g, b)) {
      visited.add(key)
      pixelCount++

      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)

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

const isRectangularOrTrapezoidal = (data, width, height, area) => {
  let greyPixelsInBox = 0

  for (let y = area.y; y < area.y + area.height && y < height; y += 2) {
    for (let x = area.x; x < area.x + area.width && x < width; x += 2) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const avg = (r + g + b) / 3
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))

      const isGreyHighlight = maxDiff < 40 && avg > 120 && avg < 180
      const isColorHighlight = (
        (r > 200 && g > 200 && b < 150) ||
        (r < 150 && g > 200 && b < 150) ||
        (r < 150 && g < 150 && b > 200) ||
        (r > 200 && g < 150 && b > 200)
      )

      if (isGreyHighlight || isColorHighlight) {
        greyPixelsInBox++
      }
    }
  }

  const sampledTotal = Math.ceil(area.width / 2) * Math.ceil(area.height / 2)
  const fillRatio = greyPixelsInBox / sampledTotal

  // Filter out rebar graphics using TWO criteria:
  // 1. Minimum size threshold - rebar graphics are typically small
  // 2. Black outline detection - rebar graphics have black outlines

  const totalArea = area.width * area.height

  // First filter: If the area is small (< 1200 sq px), it's likely a rebar graphic detail
  if (totalArea < 1200) {
    return false
  }

  // Second filter: Check for black outlines around the perimeter
  // Rebar graphics have black outlines on at least 2 sides
  const isBlack = (r, g, b) => r < 80 && g < 80 && b < 80
  const outlineOffset = 2 // Check 2 pixels outside the boundary (closer to edge)

  let topBlackPixels = 0
  let bottomBlackPixels = 0
  let leftBlackPixels = 0
  let rightBlackPixels = 0

  let topSamples = 0
  let bottomSamples = 0
  let leftSamples = 0
  let rightSamples = 0

  // Sample top edge (check pixels just above the grey area)
  const topY = Math.max(0, area.y - outlineOffset)
  for (let x = area.x; x < area.x + area.width && x < width; x += 2) {
    if (topY < height) {
      const idx = (topY * width + x) * 4
      if (isBlack(data[idx], data[idx + 1], data[idx + 2])) {
        topBlackPixels++
      }
      topSamples++
    }
  }

  // Sample bottom edge (check pixels just below the grey area)
  const bottomY = Math.min(height - 1, area.y + area.height + outlineOffset)
  for (let x = area.x; x < area.x + area.width && x < width; x += 2) {
    if (bottomY >= 0) {
      const idx = (bottomY * width + x) * 4
      if (isBlack(data[idx], data[idx + 1], data[idx + 2])) {
        bottomBlackPixels++
      }
      bottomSamples++
    }
  }

  // Sample left edge (check pixels just left of the grey area)
  const leftX = Math.max(0, area.x - outlineOffset)
  for (let y = area.y; y < area.y + area.height && y < height; y += 2) {
    if (leftX < width) {
      const idx = (y * width + leftX) * 4
      if (isBlack(data[idx], data[idx + 1], data[idx + 2])) {
        leftBlackPixels++
      }
      leftSamples++
    }
  }

  // Sample right edge (check pixels just right of the grey area)
  const rightX = Math.min(width - 1, area.x + area.width + outlineOffset)
  for (let y = area.y; y < area.y + area.height && y < height; y += 2) {
    if (rightX >= 0) {
      const idx = (y * width + rightX) * 4
      if (isBlack(data[idx], data[idx + 1], data[idx + 2])) {
        rightBlackPixels++
      }
      rightSamples++
    }
  }

  // Calculate black pixel ratios for each edge
  const topBlackRatio = topSamples > 0 ? topBlackPixels / topSamples : 0
  const bottomBlackRatio = bottomSamples > 0 ? bottomBlackPixels / bottomSamples : 0
  const leftBlackRatio = leftSamples > 0 ? leftBlackPixels / leftSamples : 0
  const rightBlackRatio = rightSamples > 0 ? rightBlackPixels / rightSamples : 0

  // Count how many edges have significant black outline (>15% black)
  // Lowered to 15% to catch more subtle outlines around rebar graphics
  let edgesWithBlackOutline = 0
  if (topBlackRatio > 0.15) edgesWithBlackOutline++
  if (bottomBlackRatio > 0.15) edgesWithBlackOutline++
  if (leftBlackRatio > 0.15) edgesWithBlackOutline++
  if (rightBlackRatio > 0.15) edgesWithBlackOutline++

  // Rebar graphics have black outlines on at least 2 sides
  // BUT table cells with grey highlights are typically very wide (aspect ratio > 3)
  // So only filter if it has 2+ black edges AND is not very wide
  const aspectRatio = area.width / area.height
  if (edgesWithBlackOutline >= 2 && aspectRatio < 3.0) {
    return false
  }

  return fillRatio > 0.48
}

const findHighlightedText = (data, width, height) => {
  const elements = []
  const visited = new Set()

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const avg = (r + g + b) / 3
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))

      const isGreyHighlight = (
        maxDiff < 40 && avg > 120 && avg < 180
      )

      const isColorHighlight = (
        (r > 200 && g > 200 && b < 150) ||
        (r < 150 && g > 200 && b < 150) ||
        (r < 150 && g < 150 && b > 200) ||
        (r > 200 && g < 150 && b > 200)
      )

      if (isGreyHighlight || isColorHighlight) {
        const key = `${x},${y}`
        if (!visited.has(key)) {
          const element = traceHighlightedArea(data, width, height, x, y, visited)
          const meetsSize = element && element.pixelCount > 100 &&
                          ((element.width > 15 && element.height > 5) ||
                           (element.width > 5 && element.height > 15))
          if (meetsSize) {
            const isBoxShaped = isRectangularOrTrapezoidal(data, width, height, element)
            if (isBoxShaped) {
              elements.push(element)
            }
          }
        }
      }
    }
  }

  return elements
}

export async function detectHighlights(imageData, onProgress) {
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

      const elements = findHighlightedTextWithProgress(data, canvas.width, canvas.height, onProgress)

      resolve({
        detected: elements.length > 0,
        count: elements.length,
        locations: elements,
        message: elements.length > 0
          ? `Found ${elements.length} highlighted area(s)`
          : 'No highlights detected'
      })
    }
  })
}

const mergeNearbyHighlights = (elements) => {
  if (elements.length === 0) return elements

  const mergeDistance = 20 // pixels - highlights within this distance are merged

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

      // Try to merge with nearby elements
      for (let j = i + 1; j < currentElements.length; j++) {
        if (processed.has(j)) continue

        const other = currentElements[j]

        // Check if elements are close enough to merge
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
          // Merge the two elements
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

const findHighlightedTextWithProgress = (data, width, height, onProgress) => {
  const elements = []
  const visited = new Set()

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const avg = (r + g + b) / 3
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b))

      const isGreyHighlight = (
        maxDiff < 40 && avg > 120 && avg < 180
      )

      const isColorHighlight = (
        (r > 200 && g > 200 && b < 150) ||
        (r < 150 && g > 200 && b < 150) ||
        (r < 150 && g < 150 && b > 200) ||
        (r > 200 && g < 150 && b > 200)
      )

      if (isGreyHighlight || isColorHighlight) {
        const key = `${x},${y}`
        if (!visited.has(key)) {
          const element = traceHighlightedArea(data, width, height, x, y, visited)
          const meetsSize = element && element.pixelCount > 100 &&
                          ((element.width > 15 && element.height > 5) ||
                           (element.width > 5 && element.height > 15))
          if (meetsSize) {
            const isBoxShaped = isRectangularOrTrapezoidal(data, width, height, element)
            if (isBoxShaped) {
              elements.push(element)
            }
          }
        }
      }
    }
  }

  // Merge nearby highlights that might be separated by small gaps
  const mergedElements = mergeNearbyHighlights(elements)

  if (onProgress) {
    onProgress(mergedElements.length)
  }

  return mergedElements
}
