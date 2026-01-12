/**
 * Geotechnical Value Extraction
 * Extracts seismic design values from geotechnical report text
 */

import { SEISMIC_PATTERNS, normalizeValue } from './geotechPatterns.js'

/**
 * Extracts seismic values from PDF page texts
 * @param {Array} pages - Array of page objects with text content
 * @returns {Object} Object containing found values, positions, and page numbers
 */
export function extractSeismicValues(pages) {
  const extractedValues = {}

  // Iterate through each seismic parameter
  for (const [key, config] of Object.entries(SEISMIC_PATTERNS)) {
    extractedValues[key] = {
      label: config.label,
      fullName: config.fullName,
      value: null,
      pageNumber: null,
      confidence: 0,
      type: config.type
    }

    // Try each pattern for this parameter
    for (const pattern of config.patterns) {
      let found = false

      // Search through all pages
      for (const page of pages) {
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0

        const matches = [...page.fullText.matchAll(pattern)]

        if (matches.length > 0) {
          // If multiple matches found, prioritize "Site Specific" over "ASCE" values
          let bestMatch = null
          let bestPriority = -1

          for (const match of matches) {
            const rawValue = match[1]
            if (!rawValue) continue

            // Validate if category type
            if (config.type === 'category' && config.validValues) {
              if (!config.validValues.includes(rawValue.toUpperCase().trim())) {
                continue
              }
            }

            // Check context around the match to determine priority
            const contextStart = Math.max(0, match.index - 100)
            const contextEnd = Math.min(page.fullText.length, match.index + 100)
            const context = page.fullText.substring(contextStart, contextEnd).toUpperCase()

            let priority = 0
            // Highest priority: Site Specific column (look for "SITE SPECIFIC" nearby)
            if (context.includes('SITE SPECIFIC') || context.includes('SITE-SPECIFIC')) {
              priority = 2
            }
            // Medium priority: Not in ASCE column
            else if (!context.includes('ASCE') && !context.includes('SECTION 11')) {
              priority = 1
            }
            // Lowest priority: ASCE/Section 11.4 column
            else {
              priority = 0
            }

            if (priority > bestPriority) {
              bestMatch = match
              bestPriority = priority
            }
          }

          if (bestMatch) {
            const rawValue = bestMatch[1]
            extractedValues[key].value = normalizeValue(rawValue, config.type)
            extractedValues[key].pageNumber = page.pageNumber
            extractedValues[key].confidence = calculateConfidence(bestMatch[0], config.label)
            found = true
            break
          }
        }
      }

      if (found) {
        break // Stop trying patterns once we found a match
      }
    }
  }

  return extractedValues
}

/**
 * Calculate confidence score for a match
 * @param {string} matchedText - The full matched text
 * @param {string} label - The parameter label
 * @returns {number} Confidence score (0-1)
 */
function calculateConfidence(matchedText, label) {
  let confidence = 0.5 // Base confidence

  // Increase confidence if label is explicitly mentioned
  if (matchedText.toLowerCase().includes(label.toLowerCase())) {
    confidence += 0.3
  }

  // Increase confidence if format looks standard (has = or :)
  if (matchedText.includes('=') || matchedText.includes(':')) {
    confidence += 0.2
  }

  return Math.min(confidence, 1.0)
}

/**
 * Searches for "GENERAL NOTES" section in page text
 * @param {Array} pages - Array of page objects with text content
 * @returns {Object|null} Object with page number and extracted text, or null if not found
 */
export function findGeneralNotesSection(pages) {
  const headingPatterns = [
    /LATERAL\s+LOADS\s+SEISMIC:/gi,
    /SEISMIC:/gi,
    /GENERAL\s+NOTES?/gi,
    /GEN\.\s+NOTES?/gi,
    /STRUCTURAL\s+NOTES?/gi,
    /SEISMIC\s+DESIGN\s+CRITERIA/gi
  ]

  for (const page of pages) {
    for (const pattern of headingPatterns) {
      pattern.lastIndex = 0
      const match = page.fullText.match(pattern)

      if (match) {
        const startIndex = match.index
        // Extract text from heading onwards (next 2000 characters or until next major section)
        const extractedText = page.fullText.substring(startIndex, startIndex + 2000)

        return {
          pageNumber: page.pageNumber,
          text: extractedText,
          startIndex: startIndex
        }
      }
    }
  }

  // Fallback: search entire first page if GENERAL NOTES not found
  if (pages.length > 0) {
    return {
      pageNumber: pages[0].pageNumber,
      text: pages[0].fullText,
      startIndex: 0,
      fallback: true
    }
  }

  return null
}

/**
 * Searches for seismic values in GENERAL NOTES section
 * @param {string} notesText - Text from GENERAL NOTES section
 * @param {Object} expectedValues - Expected values from geotech report
 * @returns {Object} Comparison results with matches, mismatches, and missing
 */
export function compareValuesInNotes(notesText, expectedValues) {
  const results = {
    matches: [],
    mismatches: [],
    missing: []
  }

  for (const [key, expected] of Object.entries(expectedValues)) {
    if (!expected.value) {
      // Skip if no expected value from geotech report
      continue
    }

    const config = SEISMIC_PATTERNS[key]
    let foundInNotes = false
    let foundValue = null

    // Search for this parameter in the notes
    for (const pattern of config.patterns) {
      pattern.lastIndex = 0
      const matches = [...notesText.matchAll(pattern)]

      if (matches.length > 0) {
        foundValue = normalizeValue(matches[0][1], config.type)
        foundInNotes = true
        break
      }
    }

    if (foundInNotes) {
      // Check if values match
      const { valuesMatch } = require('./geotechPatterns.js')

      if (valuesMatch(expected.value, foundValue, expected.type)) {
        results.matches.push({
          parameter: key,
          label: expected.label,
          value: expected.value,
          foundValue: foundValue
        })
      } else {
        results.mismatches.push({
          parameter: key,
          label: expected.label,
          expectedValue: expected.value,
          foundValue: foundValue
        })
      }
    } else {
      results.missing.push({
        parameter: key,
        label: expected.label,
        expectedValue: expected.value
      })
    }
  }

  return results
}
