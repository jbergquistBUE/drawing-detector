/**
 * No-Refs Detector
 * Detects missing or incomplete reference callouts in engineering drawings (-/--- pattern)
 */

const traceTextPattern = (data, width, height, startX, startY, visited) => {
  let minX = startX, maxX = startX
  let minY = startY, maxY = startY
  let pixelCount = 0

  const queue = [[startX, startY]]

  while (queue.length > 0 && pixelCount < 5000) {
    const [x, y] = queue.shift()
    const key = `${x},${y}`

    if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
      continue
    }

    const idx = (y * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]

    const isBlack = r < 60 && g < 60 && b < 60

    if (isBlack) {
      visited.add(key)
      pixelCount++

      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)

      if (maxY - minY < 20) {
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
      } else {
        queue.push([x + 1, y], [x - 1, y])
      }
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

const checkForGapsInPattern = (data, width, element) => {
  let gapsFound = 0
  const midY = Math.floor(element.y + element.height / 2)

  for (let x = element.x; x < element.x + element.width; x += 3) {
    const idx = (midY * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]

    if (r > 200 && g > 200 && b > 200) {
      gapsFound++
    }
  }

  return gapsFound >= 2 && gapsFound <= 8
}

const findDashSlashPattern = (data, width, height) => {
  const elements = []
  const visited = new Set()

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 5) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const isBlack = r < 60 && g < 60 && b < 60

      if (isBlack) {
        const key = `${x},${y}`
        if (!visited.has(key)) {
          const element = traceTextPattern(data, width, height, x, y, visited)

          if (!element) continue

          const isDashSlashPattern =
            element.pixelCount > 40 &&
            element.pixelCount < 300 &&
            element.width > 25 &&
            element.width < 70 &&
            element.height > 5 &&
            element.height < 18 &&
            element.width / element.height > 2.5 &&
            element.width / element.height < 7 &&
            checkForGapsInPattern(data, width, element)

          if (isDashSlashPattern) {
            elements.push(element)
          }
        }
      }
    }
  }

  return elements
}

export async function detectNoRefs(imageData, onProgress) {
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

      const elements = findDashSlashPatternWithProgress(data, canvas.width, canvas.height, onProgress)

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

const findDashSlashPatternWithProgress = (data, width, height, onProgress) => {
  const elements = []
  const visited = new Set()

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 5) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      const isBlack = r < 60 && g < 60 && b < 60

      if (isBlack) {
        const key = `${x},${y}`
        if (!visited.has(key)) {
          const element = traceTextPattern(data, width, height, x, y, visited)

          if (!element) continue

          const isDashSlashPattern =
            element.pixelCount > 40 &&
            element.pixelCount < 300 &&
            element.width > 25 &&
            element.width < 70 &&
            element.height > 5 &&
            element.height < 18 &&
            element.width / element.height > 2.5 &&
            element.width / element.height < 7 &&
            checkForGapsInPattern(data, width, element)

          if (isDashSlashPattern) {
            elements.push(element)
            if (onProgress) {
              onProgress(elements.length)
            }
          }
        }
      }
    }
  }

  return elements
}
