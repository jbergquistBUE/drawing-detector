import { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import './FileUpload.css'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

function FileUpload({ onFileProcessed }) {
  const [fileName, setFileName] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setFileName(file.name)
    setProcessing(true)

    try {
      let result

      if (file.type === 'application/pdf') {
        result = await processPDF(file)
      } else if (file.type.startsWith('image/')) {
        const imageData = await processImage(file)
        // For images, no PDF page objects available
        result = {
          imagePages: [imageData],
          pdfPages: null
        }
      } else {
        alert('Please upload a PDF or image file')
        setProcessing(false)
        return
      }

      onFileProcessed(result)
    } catch (error) {
      console.error('Error processing file:', error)
      alert('Error processing file. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const processImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const processPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    const numPages = pdf.numPages
    const scale = 3.0
    const imagePages = []
    const pdfPages = []

    // Process all pages and return both images and PDF page objects
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale })

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { alpha: false })
      canvas.width = viewport.width
      canvas.height = viewport.height

      // Improve rendering quality
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'

      await page.render({
        canvasContext: context,
        viewport: viewport,
        intent: 'print'
      }).promise

      imagePages.push(canvas.toDataURL('image/png', 1.0))

      // Extract text content from the page
      const textContent = await page.getTextContent()

      // Store both simplified items and raw text items for different detector needs
      const items = textContent.items.map(item => ({
        text: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5], // Flip Y coordinate
        width: item.width,
        height: item.height
      }))

      pdfPages.push({
        pageNumber: pageNum,
        page: page, // Store the page object for re-rendering
        items: items,
        textItems: textContent.items, // Raw text items with transform arrays
        fullText: items.map(item => item.text).join(' '),
        viewport: viewport
      })
    }

    return {
      imagePages,
      pdfPages
    }
  }

  return (
    <div className="file-upload">
      <div className="upload-container">
        <input
          type="file"
          id="file-input"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          disabled={processing}
        />
        <label htmlFor="file-input" className="upload-label">
          {processing ? (
            <span>Processing...</span>
          ) : fileName ? (
            <span>{fileName}</span>
          ) : (
            <>
              <span className="upload-icon">&#128196;</span>
              <span>Upload PDF or Image</span>
            </>
          )}
        </label>
      </div>
      <div className="upload-hint">
        Supported formats: PDF, PNG, JPG, JPEG
      </div>
    </div>
  )
}

export default FileUpload
