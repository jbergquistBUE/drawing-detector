/**
 * PDF Text Extraction Utility
 * Extracts text content with positions from PDF files using pdf.js
 */

import * as pdfjsLib from 'pdfjs-dist'

/**
 * Extracts text content from a PDF file
 * @param {File} file - PDF file object
 * @returns {Promise<Array>} Array of page objects with text items and positions
 */
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    const numPages = pdf.numPages
    const pages = []

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      // Get viewport for coordinate transformations
      const viewport = page.getViewport({ scale: 1.0 })

      // Process text items with positions
      const items = textContent.items.map(item => ({
        text: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5], // Flip Y coordinate
        width: item.width,
        height: item.height
      }))

      pages.push({
        pageNumber: pageNum,
        items: items,
        fullText: items.map(item => item.text).join(' ')
      })
    }

    return pages
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw new Error(`Failed to extract text from PDF: ${error.message}`)
  }
}

/**
 * Searches for text pattern in extracted pages
 * @param {Array} pages - Array of page objects from extractTextFromPDF
 * @param {RegExp} pattern - Regular expression to search for
 * @returns {Array} Array of matches with page numbers and positions
 */
export function searchTextInPages(pages, pattern) {
  const matches = []

  pages.forEach(page => {
    const pageMatches = page.fullText.matchAll(pattern)

    for (const match of pageMatches) {
      matches.push({
        pageNumber: page.pageNumber,
        match: match[0],
        capturedGroups: match.slice(1),
        index: match.index
      })
    }
  })

  return matches
}
