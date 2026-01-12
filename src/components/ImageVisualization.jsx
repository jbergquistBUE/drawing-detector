import { useEffect, useRef } from 'react'
import './ImageVisualization.css'

function ImageVisualization({ pageNumber, imageData, results }) {
  const originalCanvasRef = useRef(null)
  const highlightedCanvasRef = useRef(null)

  useEffect(() => {
    if (!imageData || !results) return

    const img = new Image()
    img.src = imageData

    img.onload = () => {
      // Setup original canvas
      const originalCanvas = originalCanvasRef.current
      const originalCtx = originalCanvas.getContext('2d')
      originalCanvas.width = img.width
      originalCanvas.height = img.height
      originalCtx.drawImage(img, 0, 0)

      // Setup highlighted canvas
      const highlightedCanvas = highlightedCanvasRef.current
      const highlightedCtx = highlightedCanvas.getContext('2d')
      highlightedCanvas.width = img.width
      highlightedCanvas.height = img.height
      highlightedCtx.drawImage(img, 0, 0)

      // Draw red elements
      if (results.redElements?.locations) {
        results.redElements.locations.forEach(element => {
          const padding = 5
          // Fill with semi-transparent green
          highlightedCtx.fillStyle = 'rgba(0, 204, 0, 0.2)'
          highlightedCtx.fillRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
          // Stroke with solid green
          highlightedCtx.strokeStyle = '#00cc00'
          highlightedCtx.lineWidth = 3
          highlightedCtx.strokeRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
        })
      }

      // Draw highlights
      if (results.highlights?.locations) {
        results.highlights.locations.forEach(element => {
          const padding = 5
          // Fill with semi-transparent orange
          highlightedCtx.fillStyle = 'rgba(255, 102, 0, 0.2)'
          highlightedCtx.fillRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
          // Stroke with solid orange
          highlightedCtx.strokeStyle = '#ff6600'
          highlightedCtx.lineWidth = 3
          highlightedCtx.strokeRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
        })
      }

      // Draw no-refs
      if (results.noRefs?.locations) {
        results.noRefs.locations.forEach(element => {
          const padding = 5
          // Fill with semi-transparent blue
          highlightedCtx.fillStyle = 'rgba(0, 102, 255, 0.2)'
          highlightedCtx.fillRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
          // Stroke with solid blue
          highlightedCtx.strokeStyle = '#0066ff'
          highlightedCtx.lineWidth = 3
          highlightedCtx.strokeRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
        })
      }

      // Draw overlapping text
      if (results.overlappingText?.locations) {
        results.overlappingText.locations.forEach(element => {
          const padding = 5
          // Fill with semi-transparent purple
          highlightedCtx.fillStyle = 'rgba(204, 0, 204, 0.2)'
          highlightedCtx.fillRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
          // Stroke with solid purple
          highlightedCtx.strokeStyle = '#cc00cc'
          highlightedCtx.lineWidth = 3
          highlightedCtx.strokeRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
        })
      }

      // Geotech verification results are now shown in a comparison table instead of drawing markup
    }
  }, [imageData, results])

  // Calculate page summary (excluding geotech since it's shown in a separate table)
  const pageSummary = {
    redElements: results.redElements?.count || 0,
    highlights: results.highlights?.count || 0,
    noRefs: results.noRefs?.count || 0,
    overlappingText: results.overlappingText?.count || 0
  }
  const totalIssues = Object.values(pageSummary).reduce((sum, count) => sum + count, 0)

  return (
    <div className="image-visualization">
      <div className="page-header">
        <h2>Page {pageNumber}</h2>
        <p className="page-summary">
          {totalIssues > 0
            ? `${totalIssues} issue${totalIssues !== 1 ? 's' : ''} found`
            : 'No issues found'}
        </p>
      </div>
      <div className="canvas-container">
        <div className="canvas-wrapper">
          <h3>Original Document</h3>
          <canvas ref={originalCanvasRef} />
        </div>
        <div className="canvas-wrapper">
          <h3>Detected Issues</h3>
          <canvas ref={highlightedCanvasRef} />
          <div className="legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#00cc00' }}></span>
              <span style={{ color: '#000' }}>Red Elements ({pageSummary.redElements})</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#ff6600' }}></span>
              <span style={{ color: '#000' }}>Highlights ({pageSummary.highlights})</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#0066ff' }}></span>
              <span style={{ color: '#000' }}>Missing Refs ({pageSummary.noRefs})</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#cc00cc' }}></span>
              <span style={{ color: '#000' }}>Overlapping Text ({pageSummary.overlappingText})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageVisualization
