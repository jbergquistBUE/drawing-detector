/**
 * Geotechnical Verification Detector
 * Compares seismic values from geotech report against engineering drawing general notes
 */

import { findGeneralNotesSection, compareValuesInNotes } from './geotechExtractor.js'
import { SEISMIC_PATTERNS } from './geotechPatterns.js'

/**
 * Detects mismatches between geotech report values and drawing general notes
 * @param {string} imageData - Base64 encoded image data (not used for text-based detection)
 * @param {Object} geotechData - Extracted geotech report data
 * @param {Array} pdfPages - PDF page objects with text content
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Detection results with matches, mismatches, and missing values
 */
export async function detectGeotechMismatches(imageData, geotechData, pdfPages, onProgress) {
  // If no geotech data uploaded, return early
  if (!geotechData || !geotechData.extractedValues) {
    return {
      detected: false,
      count: 0,
      matches: [],
      mismatches: [],
      missing: [],
      message: 'No geotechnical report data available for verification'
    }
  }

  // If no PDF pages (image upload instead of PDF), return message
  if (!pdfPages || pdfPages.length === 0) {
    return {
      detected: false,
      count: 0,
      matches: [],
      mismatches: [],
      missing: [],
      message: 'Text verification requires PDF upload (images not supported)'
    }
  }

  try {
    console.log('[GeotechVerification] Starting verification with', pdfPages.length, 'pages')
    console.log('[GeotechVerification] Expected values from geotech:', geotechData.extractedValues)

    // Find GENERAL NOTES section in the drawing
    const notesSection = findGeneralNotesSection(pdfPages)

    console.log('[GeotechVerification] Notes section found:', notesSection)

    if (!notesSection) {
      return {
        detected: false,
        count: 0,
        matches: [],
        mismatches: [],
        missing: [],
        message: 'GENERAL NOTES section not found in drawing'
      }
    }

    console.log('[GeotechVerification] Notes text (first 500 chars):', notesSection.text.substring(0, 500))

    // Compare expected values against what's in the notes
    const comparison = compareValuesInNotes(notesSection.text, geotechData.extractedValues)

    console.log('[GeotechVerification] Comparison results:', comparison)

    // Count total issues (mismatches + missing)
    const totalIssues = comparison.mismatches.length + comparison.missing.length

    // Call progress callback
    if (onProgress) {
      onProgress(totalIssues)
    }

    // Add location information for visualization
    // Scale factor: PDF is rendered at 3.0 scale in FileUpload.jsx
    const SCALE = 3.0
    const pdfTextItems = pdfPages[0].items || []

    // Find actual text positions for matches
    const matchesWithLocations = comparison.matches.map((match) => {
      const config = SEISMIC_PATTERNS[match.parameter]
      const position = findParameterPosition(pdfTextItems, match.parameter, match.label, config)

      if (position) {
        return {
          ...match,
          x: position.x * SCALE,
          y: position.y * SCALE,
          width: position.width * SCALE,
          height: position.height * SCALE
        }
      }
      // Fallback if position not found
      return null
    }).filter(Boolean)

    // Find actual text positions for mismatches
    const mismatchesWithLocations = comparison.mismatches.map((mismatch) => {
      const config = SEISMIC_PATTERNS[mismatch.parameter]
      const position = findParameterPosition(pdfTextItems, mismatch.parameter, mismatch.label, config)

      if (position) {
        return {
          ...mismatch,
          x: position.x * SCALE,
          y: position.y * SCALE,
          width: position.width * SCALE,
          height: position.height * SCALE
        }
      }
      // Fallback if position not found
      return null
    }).filter(Boolean)

    // Missing values don't have positions on the drawing
    const missingWithLocations = comparison.missing

    return {
      detected: totalIssues > 0,
      count: totalIssues,
      matches: matchesWithLocations,
      mismatches: mismatchesWithLocations,
      missing: missingWithLocations,
      notesPageNumber: notesSection.pageNumber,
      message: totalIssues > 0
        ? `Found ${comparison.mismatches.length} mismatch(es) and ${comparison.missing.length} missing value(s)`
        : `All ${comparison.matches.length} seismic value(s) verified successfully`
    }
  } catch (error) {
    console.error('Error in geotech verification:', error)
    return {
      detected: false,
      count: 0,
      matches: [],
      mismatches: [],
      missing: [],
      message: `Verification error: ${error.message}`
    }
  }
}

/**
 * Finds the position of a seismic parameter in the PDF text items
 * @param {Array} textItems - Array of PDF text items with positions
 * @param {string} parameterKey - Key from SEISMIC_PATTERNS (e.g., 'Sds', 'siteClass')
 * @param {string} label - Display label for the parameter
 * @param {Object} config - Configuration object from SEISMIC_PATTERNS
 * @returns {Object|null} Position object {x, y, width, height} or null
 */
function findParameterPosition(textItems, parameterKey, label, config) {
  // Build search terms based on parameter type
  const searchTerms = []

  if (parameterKey === 'Sds') {
    searchTerms.push('SDS', 'S_DS', 'S DS')
  } else if (parameterKey === 'Sd1') {
    searchTerms.push('SD1', 'S_D1', 'S D1')
  } else if (parameterKey === 'Sms') {
    searchTerms.push('SMS', 'S_MS', 'S MS')
  } else if (parameterKey === 'Sm1') {
    searchTerms.push('SM1', 'S_M1', 'S M1')
  } else if (parameterKey === 'Ss') {
    searchTerms.push('SS', 'S_S', 'S S', 'Ss')
  } else if (parameterKey === 'S1') {
    searchTerms.push('S1', 'S_1', 'S 1')
  } else if (parameterKey === 'Fa') {
    searchTerms.push('FA', 'F_A', 'F A')
  } else if (parameterKey === 'Fv') {
    searchTerms.push('FV', 'F_V', 'F V')
  } else if (parameterKey === 'siteClass') {
    searchTerms.push('SITE CLASS', 'Site Class', 'SITE', 'CLASS')
  } else if (parameterKey === 'riskCategory') {
    searchTerms.push('RISK CATEGORY', 'Risk Category', 'RISK')
  } else if (parameterKey === 'seismicDesignCategory') {
    searchTerms.push('SEISMIC DESIGN CATEGORY', 'Seismic Design Category', 'SDC', 'CATEGORY')
  }

  console.log(`[Geotech] Searching for ${parameterKey} with terms:`, searchTerms)

  // Search through text items for any matching term
  for (const searchTerm of searchTerms) {
    for (let i = 0; i < textItems.length; i++) {
      const item = textItems[i]
      const itemText = item.text || ''

      // Check if this item contains the search term
      if (itemText.toUpperCase().includes(searchTerm.toUpperCase())) {
        console.log(`[Geotech] Found ${parameterKey} at text item:`, itemText, 'at position:', item)

        // Found the label, now find the value nearby
        // Look at the next few items for the actual value
        let combinedWidth = item.width || 0
        let combinedHeight = item.height || 0
        let maxX = item.x + item.width

        // Check next 10 items to include the value (increased from 5)
        for (let j = i + 1; j < Math.min(i + 10, textItems.length); j++) {
          const nextItem = textItems[j]
          const nextText = nextItem.text || ''

          // If we find a number or category value, include it
          if (/[\d\.]+|[A-F]|I{1,3}|IV/.test(nextText)) {
            const rightEdge = (nextItem.x || 0) + (nextItem.width || 0)
            if (rightEdge > maxX) {
              maxX = rightEdge
            }
            combinedHeight = Math.max(combinedHeight, nextItem.height || 0)
          }
        }

        combinedWidth = maxX - item.x

        const position = {
          x: item.x || 0,
          y: item.y || 0,
          width: Math.max(combinedWidth, 100), // Minimum width for visibility
          height: Math.max(combinedHeight, 20)  // Minimum height for visibility
        }

        console.log(`[Geotech] Returning position for ${parameterKey}:`, position)
        return position
      }
    }
  }

  console.log(`[Geotech] No position found for ${parameterKey}`)
  return null
}
