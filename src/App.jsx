import { useState } from 'react'
import FileUpload from './components/FileUpload'
import GeotechUpload from './components/GeotechUpload'
import GeotechDataDisplay from './components/GeotechDataDisplay'
import DetectionResults from './components/DetectionResults'
import { detectRedElements } from './detectors/redElements'
import { detectHighlights } from './detectors/highlights'
import { detectNoRefs } from './detectors/noRefs'
import { detectOverlappingText } from './detectors/overlappingText'
import { detectGeotechMismatches } from './detectors/geotechVerification'
import { extractTextFromPDF } from './utils/pdfTextExtractor'
import { extractSeismicValues } from './detectors/geotechExtractor'
import './App.css'

function App() {
  const [results, setResults] = useState(null)
  const [pages, setPages] = useState(null)
  const [pdfPages, setPdfPages] = useState(null)
  const [geotechData, setGeotechData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [geotechSectionExpanded, setGeotechSectionExpanded] = useState(false)
  const [progress, setProgress] = useState({
    stage: '',
    currentPage: 0,
    totalPages: 0,
    pageResults: [], // Array to track results for each completed page
    currentCounts: { // Current page being analyzed
      redElements: 0,
      highlights: 0,
      noRefs: 0,
      overlappingText: 0,
      geotechVerification: 0
    }
  })

  const handleGeotechUpload = async (file) => {
    if (!file) {
      setGeotechData(null)
      return
    }

    try {
      const pageTexts = await extractTextFromPDF(file)
      const extractedValues = extractSeismicValues(pageTexts)

      setGeotechData({
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        extractedValues: extractedValues,
        rawPageTexts: pageTexts
      })
    } catch (error) {
      console.error('Error processing geotechnical report:', error)
      throw error
    }
  }

  const handleFileUpload = async (result) => {
    setLoading(true)
    setError(null)
    setResults(null)
    setPages(result.imagePages)
    setPdfPages(result.pdfPages)
    setProgress({
      stage: `Analyzing ${result.imagePages.length} page${result.imagePages.length !== 1 ? 's' : ''}...`,
      currentPage: 0,
      totalPages: result.imagePages.length,
      pageResults: [],
      currentCounts: {
        redElements: 0,
        highlights: 0,
        noRefs: 0,
        overlappingText: 0,
        geotechVerification: 0
      }
    })

    try {
      const allPageResults = []

      // Run geotech verification once for all pages (not per-page)
      let globalGeotechVerification = { detected: false, count: 0, matches: [], mismatches: [], missing: [] }
      console.log('[App] Checking geotech verification conditions:', {
        hasGeotechData: !!geotechData,
        hasPdfPages: !!result.pdfPages,
        pdfPagesLength: result.pdfPages?.length
      })
      if (geotechData && result.pdfPages) {
        console.log('[App] Running geotech verification for all pages')
        console.log('[App] pdfPages structure (first page):', result.pdfPages[0])
        globalGeotechVerification = await detectGeotechMismatches(
          null,
          geotechData,
          result.pdfPages, // Pass all PDF pages
          (count) => {
            setProgress(prev => ({
              ...prev,
              currentCounts: { ...prev.currentCounts, geotechVerification: count }
            }))
          }
        )
        console.log('[App] Geotech verification complete:', globalGeotechVerification)
      } else {
        console.log('[App] Skipping geotech verification - conditions not met')
      }

      // Process each page
      for (let i = 0; i < result.imagePages.length; i++) {
        const pageData = result.imagePages[i]
        const pageNum = i + 1

        setProgress(prev => ({
          ...prev,
          stage: `Analyzing page ${pageNum}/${result.imagePages.length}...`,
          currentPage: pageNum,
          currentCounts: {
            redElements: 0,
            highlights: 0,
            noRefs: 0,
            overlappingText: 0,
            geotechVerification: 0
          }
        }))

        const redElements = await detectRedElements(pageData, (count) => {
          setProgress(prev => ({
            ...prev,
            currentCounts: { ...prev.currentCounts, redElements: count }
          }))
        })

        const highlights = await detectHighlights(pageData, (count) => {
          setProgress(prev => ({
            ...prev,
            currentCounts: { ...prev.currentCounts, highlights: count }
          }))
        })

        const noRefs = await detectNoRefs(
          pageData,
          (count) => {
            setProgress(prev => ({
              ...prev,
              currentCounts: { ...prev.currentCounts, noRefs: count }
            }))
          },
          result.pdfPages ? result.pdfPages[i] : null
        )

        const overlappingText = await detectOverlappingText(
          pageData,
          (count) => {
            setProgress(prev => ({
              ...prev,
              currentCounts: { ...prev.currentCounts, overlappingText: count }
            }))
          },
          result.pdfPages ? result.pdfPages[i] : null
        )

        const pageResult = {
          pageNumber: pageNum,
          redElements,
          highlights,
          noRefs,
          overlappingText,
          geotechVerification: pageNum === 1 ? globalGeotechVerification : { detected: false, count: 0, matches: [], mismatches: [], missing: [] }
        }

        allPageResults.push(pageResult)

        // Add completed page to pageResults
        setProgress(prev => ({
          ...prev,
          pageResults: [...prev.pageResults, {
            pageNumber: pageNum,
            redElements: redElements.count,
            highlights: highlights.count,
            noRefs: noRefs.count,
            overlappingText: overlappingText.count,
            geotechVerification: pageNum === 1 ? globalGeotechVerification.count : 0
          }]
        }))
      }

      setResults(allPageResults)
      setProgress(prev => ({ ...prev, stage: 'Analysis complete!' }))
    } catch (error) {
      console.error('Detection error:', error)
      setError(`Error processing file: ${error.message}`)
      alert(`Error processing file: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Engineering Drawing Detector</h1>
        <p>Upload engineering drawings to detect potential issues</p>
      </header>

      <main>
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#e8f4f8',
          borderRadius: '8px',
          border: '2px solid #0288d1'
        }}>
          <h3 style={{
            fontSize: '1.3rem',
            color: '#01579b',
            marginTop: 0,
            marginBottom: '0.5rem',
            fontWeight: 'bold'
          }}>
            Upload Engineering Drawings
          </h3>
          <p style={{
            color: '#014a7d',
            fontSize: '0.95rem',
            marginBottom: '1rem',
            lineHeight: '1.5'
          }}>
            Upload your engineering drawings (PDF format) to automatically detect potential issues including
            red elements, highlights, missing references, and overlapping text. The analyzer will examine
            each page and provide detailed results with visual overlays.
          </p>
          <FileUpload onFileProcessed={handleFileUpload} />
        </div>

        {results && <DetectionResults results={results} pages={pages} pdfPages={pdfPages} geotechData={geotechData} />}

        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: geotechSectionExpanded ? '0.5rem' : 0
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              color: '#2c3e50',
              margin: 0
            }}>
              Optional: Geotechnical Report Verification
            </h3>
            <button
              onClick={() => setGeotechSectionExpanded(!geotechSectionExpanded)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.5rem',
                color: '#2c3e50',
                padding: '0 0.5rem',
                lineHeight: 1
              }}
              title={geotechSectionExpanded ? 'Collapse section' : 'Expand section'}
            >
              {geotechSectionExpanded ? '−' : '+'}
            </button>
          </div>
          {geotechSectionExpanded && (
            <>
              <p style={{
                color: '#495057',
                fontSize: '0.9rem',
                marginBottom: '1rem',
                lineHeight: '1.5',
                marginTop: '0.5rem'
              }}>
                Upload a geotechnical report to automatically verify that seismic design values
                (Sds, Sd1, Ss, S1, Fa, Fv, Site Class, etc.) in your drawing's general notes
                match the values from the geotech report.
              </p>
              <GeotechUpload onGeotechProcessed={handleGeotechUpload} geotechData={geotechData} />
              {(geotechData || pdfPages) && (
                <GeotechDataDisplay
                  geotechData={geotechData}
                  pdfPages={pdfPages}
                />
              )}
            </>
          )}
        </div>

        {loading && (
          <div className="progress-container" style={{
            padding: '20px',
            margin: '20px auto',
            maxWidth: '700px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            border: '2px solid #ddd'
          }}>
            <h3 style={{ marginTop: 0, color: '#333', marginBottom: '15px' }}>{progress.stage}</h3>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '6px', border: '1px solid #90caf9' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>Document: {progress.totalPages} page{progress.totalPages !== 1 ? 's' : ''}</h4>

              {/* Show completed pages */}
              {progress.pageResults.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <strong style={{ color: '#000' }}>Completed:</strong>
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {progress.pageResults.map(pageResult => {
                      const totalIssues = pageResult.redElements + pageResult.highlights + pageResult.noRefs + pageResult.overlappingText + pageResult.geotechVerification
                      return (
                        <div key={pageResult.pageNumber} style={{
                          padding: '8px 12px',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          color: '#000'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold' }}>Page {pageResult.pageNumber}</span>
                            <span style={{
                              color: totalIssues > 0 ? '#d32f2f' : '#4caf50',
                              fontWeight: 'bold'
                            }}>
                              {totalIssues} total
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#555', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <span>Red: <strong style={{ color: '#00cc00' }}>{pageResult.redElements}</strong></span>
                            <span>Highlights: <strong style={{ color: '#ff6600' }}>{pageResult.highlights}</strong></span>
                            <span>No-Refs: <strong style={{ color: '#0066ff' }}>{pageResult.noRefs}</strong></span>
                            <span>Overlaps: <strong style={{ color: '#cc00cc' }}>{pageResult.overlappingText}</strong></span>
                            {geotechData && pageResult.geotechVerification > 0 && (
                              <span>Geotech: <strong style={{ color: '#cc0000' }}>{pageResult.geotechVerification}</strong></span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Show current page being analyzed */}
              {progress.currentPage > 0 && progress.currentPage > progress.pageResults.length && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff9c4', borderRadius: '4px', border: '1px solid #fbc02d', color: '#000' }}>
                  <strong>Currently analyzing Page {progress.currentPage}:</strong>
                  <div style={{ marginTop: '8px', fontSize: '14px' }}>
                    Red Elements: <span style={{ color: '#00cc00', fontWeight: 'bold' }}>{progress.currentCounts.redElements}</span> |
                    Highlights: <span style={{ color: '#ff6600', fontWeight: 'bold' }}> {progress.currentCounts.highlights}</span> |
                    Missing Refs: <span style={{ color: '#0066ff', fontWeight: 'bold' }}> {progress.currentCounts.noRefs}</span> |
                    Overlapping Text: <span style={{ color: '#cc00cc', fontWeight: 'bold' }}> {progress.currentCounts.overlappingText}</span>
                    {geotechData && (<>
                      {' | '}
                      Geotech Issues: <span style={{ color: '#cc0000', fontWeight: 'bold' }}> {progress.currentCounts.geotechVerification}</span>
                    </>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div className="error" style={{color: 'red', padding: '20px'}}>{error}</div>}
      </main>
    </div>
  )
}

export default App
