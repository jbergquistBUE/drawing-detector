import { extractSeismicValues } from '../detectors/geotechExtractor'
import { SEISMIC_PATTERNS, valuesMatch } from '../detectors/geotechPatterns'
import './GeotechDataDisplay.css'

function GeotechDataDisplay({ geotechData, pdfPages }) {
  // Extract values from the drawing PDFs directly
  const drawingValues = pdfPages && pdfPages.length > 0
    ? extractSeismicValues(pdfPages)
    : null

  // If no geotech data and no drawing values, don't render
  if (!geotechData && !drawingValues) {
    return null
  }

  // If we only have drawings (no geotech), show drawing values only
  const drawingOnlyMode = !geotechData && drawingValues

  // Use geotech extracted values if available, otherwise build from SEISMIC_PATTERNS for structure
  const extractedValues = geotechData?.extractedValues || Object.fromEntries(
    Object.entries(SEISMIC_PATTERNS).map(([key, config]) => [key, {
      label: config.label,
      fullName: config.fullName,
      value: null,
      pageNumber: null,
      confidence: 0,
      type: config.type
    }])
  )

  // Count how many values were found in geotech report
  const foundCount = geotechData
    ? Object.values(extractedValues).filter(v => v.value !== null).length
    : 0
  const totalCount = Object.keys(extractedValues).length

  console.log('[GeotechDataDisplay] Drawing values extracted:', drawingValues)

  // Parameters that MUST be compared between geotech report and drawings
  const requiredComparisonParams = ['Sds', 'Sd1', 'Ss', 'S1', 'siteClass', 'seismicDesignCategory']

  // Build comparison map between geotech and drawing values
  const drawingValuesMap = {}
  if (drawingValues) {
    for (const [key, drawingData] of Object.entries(drawingValues)) {
      const geotechValue = extractedValues[key]?.value
      const drawingValue = drawingData.value

      const isRequiredParam = requiredComparisonParams.includes(key)

      if (drawingValue) {
        // Determine if it's a match or mismatch using proper comparison
        const paramType = SEISMIC_PATTERNS[key]?.type || 'numeric'
        const isMatch = geotechValue && drawingValue &&
          valuesMatch(geotechValue, drawingValue, paramType)

        drawingValuesMap[key] = {
          value: drawingValue,
          pageNumber: drawingData.pageNumber,
          status: isMatch ? 'match' : (geotechValue ? 'mismatch' : 'drawing-only'),
          isRequired: isRequiredParam
        }
      } else if (geotechValue && isRequiredParam) {
        // Geotech has value but drawing doesn't (only for required params)
        drawingValuesMap[key] = {
          value: null,
          pageNumber: null,
          status: 'missing',
          isRequired: true
        }
      }
      // For non-required params without drawing value, don't add to map (no status icon)
    }
  }

  const hasDrawingValues = pdfPages && pdfPages.length > 0
  const hasGeotechData = !!geotechData

  const getRowClass = (key, data) => {
    if (!data.value) return 'not-found'
    if (!hasDrawingValues) return 'found'

    const drawingData = drawingValuesMap[key]
    if (!drawingData) return 'found'

    // Only apply status styling for required comparison params
    if (!drawingData.isRequired) return 'found'

    if (drawingData.status === 'match') return 'status-match'
    if (drawingData.status === 'mismatch') return 'status-mismatch'
    if (drawingData.status === 'missing') return 'status-missing'
    return 'found'
  }

  const getStatusIcon = (key) => {
    const drawingData = drawingValuesMap[key]
    if (!drawingData) return null

    // Only show status icons for required comparison params
    if (!drawingData.isRequired) return null

    if (drawingData.status === 'match') return <span className="status-icon match">✓</span>
    if (drawingData.status === 'mismatch') return <span className="status-icon mismatch">✗</span>
    if (drawingData.status === 'missing') return <span className="status-icon missing">⚠</span>
    return null
  }

  // Calculate counts for summary (only count required comparison params)
  const drawingFoundCount = Object.values(drawingValuesMap).filter(v => v.value && v.isRequired).length
  const matchCount = Object.values(drawingValuesMap).filter(v => v.status === 'match' && v.isRequired).length
  const mismatchCount = Object.values(drawingValuesMap).filter(v => v.status === 'mismatch' && v.isRequired).length
  const missingCount = Object.values(drawingValuesMap).filter(v => v.status === 'missing' && v.isRequired).length
  const requiredTotal = requiredComparisonParams.length

  return (
    <div className="geotech-data-display">
      <div className="geotech-data-header">
        <h3>{drawingOnlyMode ? 'Drawing Seismic Values' : 'Seismic Values Comparison'}</h3>
        <div className="geotech-data-summary">
          {drawingOnlyMode ? (
            <>
              Drawing: <strong>{drawingFoundCount}</strong> of <strong>{requiredTotal}</strong> required values found
            </>
          ) : (
            <>
              Geotech Report: <strong>{foundCount}</strong> of <strong>{totalCount}</strong> values found
              {hasDrawingValues && (
                <>
                  {' | '}
                  <span className="match-count">
                    ✓ {matchCount} Match{matchCount !== 1 ? 'es' : ''}
                  </span>
                  {mismatchCount > 0 && (
                    <>
                      {' | '}
                      <span className="mismatch-count">
                        ✗ {mismatchCount} Mismatch{mismatchCount !== 1 ? 'es' : ''}
                      </span>
                    </>
                  )}
                  {missingCount > 0 && (
                    <>
                      {' | '}
                      <span className="missing-count">
                        ⚠ {missingCount} Missing
                      </span>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="geotech-data-table-container">
        <table className="geotech-data-table">
          <thead>
            <tr>
              {hasDrawingValues && hasGeotechData && <th>Status</th>}
              <th>Parameter</th>
              <th>Description</th>
              {hasGeotechData && <th>Geotech Report</th>}
              {hasDrawingValues && <th>Drawing Value</th>}
              <th>Page</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(extractedValues).map(([key, data]) => (
              <tr key={key} className={drawingOnlyMode ? (drawingValuesMap[key]?.value ? 'found' : 'not-found') : getRowClass(key, data)}>
                {hasDrawingValues && hasGeotechData && (
                  <td className="status-cell">
                    {getStatusIcon(key)}
                  </td>
                )}
                <td className="param-label">
                  <strong>{data.label}</strong>
                </td>
                <td className="param-description">{data.fullName}</td>
                {hasGeotechData && (
                  <td className="param-value geotech-value">
                    {data.value ? (
                      <span className="value-found">{data.value}</span>
                    ) : (
                      <span className="value-missing">Not found</span>
                    )}
                  </td>
                )}
                {hasDrawingValues && (
                  <td className="param-value drawing-value">
                    {drawingValuesMap[key]?.value ? (
                      <span className="value-found">{drawingValuesMap[key].value}</span>
                    ) : (
                      <span className="value-missing">Not found</span>
                    )}
                  </td>
                )}
                <td className="param-page">
                  {drawingOnlyMode
                    ? (drawingValuesMap[key]?.pageNumber ? `Page ${drawingValuesMap[key].pageNumber}` : '—')
                    : (data.pageNumber ? `Page ${data.pageNumber}` : '—')
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default GeotechDataDisplay
