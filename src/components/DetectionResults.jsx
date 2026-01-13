import './DetectionResults.css'
import jsPDF from 'jspdf'

function DetectionResults({ results, pages, pdfPages, geotechData }) {
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
    try {
      // Render PDF pages directly with highlights in PDF coordinate space
      const highlightedCanvases = []

      for (let i = 0; i < pdfPages.length; i++) {
        const pdfPage = pdfPages[i]
        const pageResults = results[i]

        // Render PDF page to canvas at original size
        const viewport = pdfPage.viewport
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        canvas.width = viewport.width
        canvas.height = viewport.height

        // Render the PDF page
        await pdfPage.page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise

        console.log(`[PDF Export] Page ${i+1}: Canvas size ${canvas.width}x${canvas.height}, Viewport size ${viewport.width}x${viewport.height}`)

        // Helper function to convert PDF coordinates to canvas coordinates
        const pdfToCanvas = (element) => {
          // PDF.js coordinates:
          // - X: left edge (same in both coordinate systems)
          // - Y: baseline of text in PDF space (bottom-left origin)
          // Canvas needs: top-left corner in canvas space (top-left origin)
          // Conversion: canvasY = canvasHeight - pdfY (baseline becomes top)
          const converted = {
            x: element.x,
            y: canvas.height - element.y,  // Flip Y axis - baseline to top
            width: element.width,
            height: element.height
          }
          console.log(`[PDF Export] Canvas height: ${canvas.height}`)
          console.log(`[PDF Export] Converting PDF coords (${element.x}, ${element.y}, w:${element.width}, h:${element.height})`)
          console.log(`[PDF Export] -> Canvas coords (${converted.x}, ${converted.y}, w:${converted.width}, h:${converted.height})`)
          return converted
        }

        // Draw red elements in green (already in canvas coordinates)
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

        // Draw highlights in orange (already in canvas coordinates)
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
          console.log(`[PDF Export] Page ${i+1} no-refs raw data:`, pageResults.noRefs.locations)
          pageResults.noRefs.locations.forEach(element => {
            console.log(`[PDF Export] Raw no-ref element:`, element)
            // Check if coordinates are already in canvas space (no transformation needed)
            const coords = element.isCanvasCoords ? element : pdfToCanvas(element)
            console.log(`[PDF Export] Coords for drawing (isCanvas=${element.isCanvasCoords}):`, coords)
            const padding = 5
            // Fill with semi-transparent blue
            ctx.fillStyle = 'rgba(0, 102, 255, 0.2)'
            ctx.fillRect(coords.x - padding, coords.y - padding, coords.width + padding * 2, coords.height + padding * 2)
            // Stroke with solid blue
            ctx.strokeStyle = '#0066ff'
            ctx.lineWidth = 3
            ctx.strokeRect(coords.x - padding, coords.y - padding, coords.width + padding * 2, coords.height + padding * 2)
          })
        }

        // Draw overlapping text in purple
        if (pageResults.overlappingText?.locations) {
          console.log(`[PDF Export] Page ${i+1} overlapping text raw data:`, pageResults.overlappingText.locations)
          pageResults.overlappingText.locations.forEach(element => {
            console.log(`[PDF Export] Raw overlapping text element:`, element)
            // Check if coordinates are already in canvas space (no transformation needed)
            const coords = element.isCanvasCoords ? element : pdfToCanvas(element)
            console.log(`[PDF Export] Coords for drawing (isCanvas=${element.isCanvasCoords}):`, coords)
            const padding = 5
            // Fill with semi-transparent purple
            ctx.fillStyle = 'rgba(204, 0, 204, 0.2)'
            ctx.fillRect(coords.x - padding, coords.y - padding, coords.width + padding * 2, coords.height + padding * 2)
            // Stroke with solid purple
            ctx.strokeStyle = '#cc00cc'
            ctx.lineWidth = 3
            ctx.strokeRect(coords.x - padding, coords.y - padding, coords.width + padding * 2, coords.height + padding * 2)
          })
        }

        // Geotech verification results are shown in a comparison table instead of PDF markup

        highlightedCanvases.push(canvas)
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
    } catch (error) {
      console.error('Error generating highlighted PDF:', error)
      alert(`Error generating PDF: ${error.message}`)
    }
  }

  return (
    <div className="detection-results">
      <h2>Detection Results - Overall Summary</h2>

      <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: '8px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', fontWeight: 'bold', color: '#000' }}>Page</th>
              <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: 'bold', color: '#00cc00' }}>Red</th>
              <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: 'bold', color: '#ff6600' }}>Highlights</th>
              <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: 'bold', color: '#0066ff' }}>No-Refs</th>
              <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: 'bold', color: '#cc00cc' }}>Overlaps</th>
              {geotechData && (
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: 'bold', color: '#cc0000' }}>Geotech</th>
              )}
              <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #dee2e6', fontWeight: 'bold', color: '#000' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {results.map((pageResult, index) => {
              const totalIssues =
                (pageResult.redElements?.count || 0) +
                (pageResult.highlights?.count || 0) +
                (pageResult.noRefs?.count || 0) +
                (pageResult.overlappingText?.count || 0) +
                (pageResult.geotechVerification?.count || 0)

              return (
                <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#000' }}>Page {pageResult.pageNumber}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: pageResult.redElements?.count > 0 ? '#00cc00' : '#999' }}>
                    {pageResult.redElements?.count || 0}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: pageResult.highlights?.count > 0 ? '#ff6600' : '#999' }}>
                    {pageResult.highlights?.count || 0}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: pageResult.noRefs?.count > 0 ? '#0066ff' : '#999' }}>
                    {pageResult.noRefs?.count || 0}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: pageResult.overlappingText?.count > 0 ? '#cc00cc' : '#999' }}>
                    {pageResult.overlappingText?.count || 0}
                  </td>
                  {geotechData && (
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: pageResult.geotechVerification?.count > 0 ? '#cc0000' : '#999' }}>
                      {pageResult.geotechVerification?.count || 0}
                    </td>
                  )}
                  <td style={{
                    padding: '6px 8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: totalIssues > 0 ? '#d32f2f' : '#4caf50'
                  }}>
                    {totalIssues}
                  </td>
                </tr>
              )
            })}
            <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
              <td style={{ padding: '8px', color: '#000' }}>TOTAL</td>
              <td style={{ padding: '8px', textAlign: 'center', color: '#00cc00' }}>{overallSummary.redElements.count}</td>
              <td style={{ padding: '8px', textAlign: 'center', color: '#ff6600' }}>{overallSummary.highlights.count}</td>
              <td style={{ padding: '8px', textAlign: 'center', color: '#0066ff' }}>{overallSummary.noRefs.count}</td>
              <td style={{ padding: '8px', textAlign: 'center', color: '#cc00cc' }}>{overallSummary.overlappingText.count}</td>
              {geotechData && (
                <td style={{ padding: '8px', textAlign: 'center', color: '#cc0000' }}>{overallSummary.geotechVerification.count}</td>
              )}
              <td style={{ padding: '8px', textAlign: 'center', color: '#d32f2f' }}>
                {Object.values(overallSummary).reduce((sum, s) => sum + s.count, 0)}
              </td>
            </tr>
          </tbody>
        </table>
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
    </div>
  )
}

export default DetectionResults
