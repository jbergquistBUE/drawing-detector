/**
 * Red Elements Detector
 * Detects red-colored elements in engineering drawings
 */

const traceElement = (data, width, height, startX, startY, visited) => {
  let minX = startX, maxX = startX
  let minY = startY, maxY = startY
  let pixelCount = 0

  const queue = [[startX, startY]]

  const isReddish = (r, g, b) => {
    return (
      (r > 150 && r > g * 1.3 && r > b * 1.3) ||
      (r > 100 && r > g * 1.5 && r > b * 1.5 && r > 50) ||
      (r > 80 && r > g * 2 && r > b * 2)
    )
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

    if (isReddish(r, g, b)) {
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

const findRedElements = (data, width, height) => {
  const elements = []
  const visited = new Set()

  // First pass: find all red pixel clusters
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const isReddish = (
        (r > 150 && r > g * 1.3 && r > b * 1.3) ||
        (r > 100 && r > g * 1.5 && r > b * 1.5 && r > 50) ||
        (r > 80 && r > g * 2 && r > b * 2)
      )

      if (isReddish) {
        const key = `${x},${y}`
        if (!visited.has(key)) {
          const element = traceElement(data, width, height, x, y, visited)
          if (element && element.pixelCount > 50) {
            elements.push(element)
          }
        }
      }
    }
  }

  // Second pass: merge overlapping or nearby elements
  return mergeNearbyElements(elements)
}

const mergeNearbyElements = (elements) => {
  if (elements.length === 0) return elements

  const mergeDistance = 15 // pixels - elements within this distance are merged

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

export async function detectRedElements(imageData, onProgress) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const img = new Image()
  img.src = imageData

  return new Promise((resolve, reject) => {
    img.onload = () => {
      try {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = pixels.data

        const elements = findRedElementsWithProgress(data, canvas.width, canvas.height, onProgress)

        resolve({
          detected: elements.length > 0,
          count: elements.length,
          locations: elements,
          message: elements.length > 0
            ? `Found ${elements.length} red element(s)`
            : 'No red elements detected'
        })
      } catch (error) {
        reject(new Error(`Red elements detection failed: ${error.message}`))
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image for red elements detection'))
    }
  })
}

const findRedElementsWithProgress = (data, width, height, onProgress) => {
  const elements = []
  const visited = new Set()

  // First pass: find all red pixel clusters
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const isReddish = (
        (r > 150 && r > g * 1.3 && r > b * 1.3) ||
        (r > 100 && r > g * 1.5 && r > b * 1.5 && r > 50) ||
        (r > 80 && r > g * 2 && r > b * 2)
      )

      if (isReddish) {
        const key = `${x},${y}`
        if (!visited.has(key)) {
          const element = traceElement(data, width, height, x, y, visited)
          if (element && element.pixelCount > 50) {
            elements.push(element)
          }
        }
      }
    }
  }

  // Second pass: merge overlapping or nearby elements
  const mergedElements = mergeNearbyElements(elements)

  // Report final count after merging
  if (onProgress) {
    onProgress(mergedElements.length)
  }

  return mergedElements
}
