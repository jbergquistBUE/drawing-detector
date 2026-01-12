import { useState } from 'react'
import './GeotechUpload.css'

function GeotechUpload({ onGeotechProcessed, geotechData }) {
  const [fileName, setFileName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setError(null)

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return
    }

    setFileName(file.name)
    setProcessing(true)

    try {
      await onGeotechProcessed(file)
    } catch (err) {
      console.error('Error processing geotechnical report:', err)
      setError('Error processing file. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleClear = () => {
    setFileName('')
    setError(null)
    onGeotechProcessed(null)
  }

  return (
    <div className="geotech-upload">
      <div className="geotech-upload-container">
        <input
          type="file"
          id="geotech-file-input"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={processing || geotechData}
        />
        <label htmlFor="geotech-file-input" className={`geotech-upload-label ${geotechData ? 'uploaded' : ''}`}>
          {processing ? (
            <span className="geotech-processing">
              <span className="spinner"></span>
              Processing...
            </span>
          ) : geotechData ? (
            <span className="geotech-success">
              <span className="checkmark">✓</span>
              {geotechData.fileName}
            </span>
          ) : (
            <>
              <span className="geotech-upload-icon">&#128196;</span>
              <span>Upload Geotechnical Report PDF</span>
            </>
          )}
        </label>

        {geotechData && (
          <button onClick={handleClear} className="geotech-clear-btn">
            Clear & Upload New
          </button>
        )}
      </div>

      {error && (
        <div className="geotech-error">
          {error}
        </div>
      )}
    </div>
  )
}

export default GeotechUpload
