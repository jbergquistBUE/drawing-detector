import './DetectionResults.css'
import ImageVisualization from './ImageVisualization'
import jsPDF from 'jspdf'

function DetectionResults({ results, pages, geotechData }) {
  const detectorNames = {
    redElements: 'Red Elements',
    highlights: 'Highlights',
    noRefs: 'Missing References',
    overlappingText: 'Overlapping Text',
    geotechVerification: 'Geotech Verification'
  }

  // Calculate overall summary across all pages
  const overallSummary = {
    redElements: { detected: false, count: 0 },
    highlights: { detected: false, count: 0 },
    noRefs: { detected: false, count: 0 },
    overlappingText: { detected: false, count: 0 },
    geotechVerification: { detected: false, count: 0 }
  }

  results.forEach(pageResult => {
    Object.keys(overallSummary).forEach(key => {
      if (pageResult[key] && pageResult[key].detected) {
        overallSummary[key].detected = true
      }
      if (pageResult[key] && pageResult[key].count !== undefined) {
        overallSummary[key].count += pageResult[key].count
      }
    })
  })

  const getStatusClass = (detected) => {
    return detected ? 'status-warning' : 'status-ok'
  }

  const getStatusIcon = (detected) => {
    return detected ? '⚠️' : '✅'
  }

  const downloadHighlightedPDF = async () => {
    // Create canvases with highlights for each page
    const highlightedCanvases = []

    for (let i = 0; i < pages.length; i++) {
      const pageData = pages[i]
      const pageResults = results[i]

      // Create a canvas and draw the highlighted version
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      await new Promise((resolve) => {
        const img = new Image()
        img.src = pageData
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)

          // Draw red elements in green
          if (pageResults.redElements?.locations) {
            pageResults.redElements.locations.forEach(element => {
              const padding = 5
              // Fill with semi-transparent green
              ctx.fillStyle = 'rgba(0, 204, 0, 0.2)'
              ctx.fillRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
              // Stroke with solid green
              ctx.strokeStyle = '#00cc00'
              ctx.lineWidth = 3
              ctx.strokeRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
            })
          }

          // Draw highlights in orange
          if (pageResults.highlights?.locations) {
            pageResults.highlights.locations.forEach(element => {
              const padding = 5
              // Fill with semi-transparent orange
              ctx.fillStyle = 'rgba(255, 102, 0, 0.2)'
              ctx.fillRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
              // Stroke with solid orange
              ctx.strokeStyle = '#ff6600'
              ctx.lineWidth = 3
              ctx.strokeRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
            })
          }

          // Draw no-refs in blue
          if (pageResults.noRefs?.locations) {
            pageResults.noRefs.locations.forEach(element => {
              const padding = 5
              // Fill with semi-transparent blue
              ctx.fillStyle = 'rgba(0, 102, 255, 0.2)'
              ctx.fillRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
              // Stroke with solid blue
              ctx.strokeStyle = '#0066ff'
              ctx.lineWidth = 3
              ctx.strokeRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
            })
          }

          // Draw overlapping text in purple
          if (pageResults.overlappingText?.locations) {
            pageResults.overlappingText.locations.forEach(element => {
              const padding = 5
              // Fill with semi-transparent purple
              ctx.fillStyle = 'rgba(204, 0, 204, 0.2)'
              ctx.fillRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
              // Stroke with solid purple
              ctx.strokeStyle = '#cc00cc'
              ctx.lineWidth = 3
              ctx.strokeRect(element.x - padding, element.y - padding, element.width + padding * 2, element.height + padding * 2)
            })
          }

          // Geotech verification results are shown in a comparison table instead of PDF markup

          highlightedCanvases.push(canvas)
          resolve()
        }
      })
    }

    // Create PDF with all highlighted pages
    const pdf = new jsPDF({
      orientation: highlightedCanvases[0].width > highlightedCanvases[0].height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [highlightedCanvases[0].width, highlightedCanvases[0].height]
    })

    for (let i = 0; i < highlightedCanvases.length; i++) {
      if (i > 0) {
        pdf.addPage([highlightedCanvases[i].width, highlightedCanvases[i].height])
      }
      const imgData = highlightedCanvases[i].toDataURL('image/jpeg', 0.95)
      pdf.addImage(imgData, 'JPEG', 0, 0, highlightedCanvases[i].width, highlightedCanvases[i].height)
    }

    pdf.save('highlighted-drawing.pdf')
  }

  return (
    <div className="detection-results">
      <h2>Detection Results - Overall Summary</h2>

      <div className="results-grid">
        {Object.entries(overallSummary).map(([key, summary]) => (
          <div key={key} className={`result-card ${getStatusClass(summary.detected)}`}>
            <div className="result-header">
              <span className="result-icon">{getStatusIcon(summary.detected)}</span>
              <h3>{detectorNames[key]}</h3>
            </div>

            <div className="result-body">
              <p className="result-message">
                {summary.count > 0
                  ? `Found ${summary.count} total across all pages`
                  : `No ${detectorNames[key].toLowerCase()} detected`}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="results-summary">
        <p>
          Total Pages Analyzed: {results.length}
        </p>
        <button
          className="download-button"
          onClick={downloadHighlightedPDF}
        >
          Download Highlighted PDF
        </button>
      </div>

      {/* Display each page separately */}
      {results.map((pageResult, index) => (
        <ImageVisualization
          key={index}
          pageNumber={pageResult.pageNumber}
          imageData={pages[index]}
          results={pageResult}
        />
      ))}
    </div>
  )
}

export default DetectionResults
