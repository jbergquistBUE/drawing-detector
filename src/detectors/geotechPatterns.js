/**
 * Geotechnical Report Pattern Matching
 * Regex patterns for extracting seismic design values from geotechnical reports
 */

/**
 * Seismic value patterns with multiple format variations
 * Each pattern array contains regex patterns that match different formatting styles
 */
export const SEISMIC_PATTERNS = {
  Sds: {
    label: 'Sds',
    fullName: 'Design Spectral Response Acceleration (Short Period)',
    patterns: [
      /S\s*DS\s*:\s*(\d+\.?\d+)/gi,         // Table format: "S DS : 1.2"
      /SDS\s*:\s*(\d+\.?\d+)/gi,            // Table format: "SDS : 1.2"
      /S[_\s]?DS\s*=\s*(\d+\.?\d*)/gi,      // Drawing format: "SDS = 0.77"
      /S_DS\s+(\d+\.\d+)\s*g/gi,            // Geotech table: "S_DS 0.77 g"
      /SDS\s+(\d+\.\d+)\s*g/gi,             // Geotech table variant: "SDS 0.77 g"
      /S\s+DS\s+(\d+\.\d+)\s*g/gi,          // Geotech table with space: "S DS 0.77 g"
      /Design\s+Spectral\s+Response\s+Acceleration\s+.*?\(.*?short.*?period.*?\).*?[=:]\s*(\d+\.\d+)/gi,
      /Short\s+Period\s+Design\s+Spectral\s+Response\s+Acceleration\s*[=:]\s*(\d+\.\d+)/gi,
      /Adjusted\s+Short\s+Period\s+Spectral\s+Acceleration\s*[=:]\s*(\d+\.\d+)/gi
    ],
    type: 'numeric'
  },

  Sd1: {
    label: 'Sd1',
    fullName: 'Design Spectral Response Acceleration (1-Second)',
    patterns: [
      /S\s*D1\s*:\s*(\d+\.?\d+)/gi,         // Table format: "S D1 : 0.56"
      /SD1\s*:\s*(\d+\.?\d+)/gi,            // Table format: "SD1 : 0.56"
      /S[_\s]?D1\s*=\s*(\d+\.?\d*)/gi,      // Drawing format: "SD1 = 0.5"
      /S_D1\s+(\d+\.\d+)\s*g/gi,            // Geotech table: "S_D1 0.50 g"
      /SD1\s+(\d+\.\d+)\s*g/gi,             // Geotech table variant: "SD1 0.50 g"
      /S\s+D1\s+(\d+\.\d+)\s*g/gi,          // Geotech table with space: "S D1 0.50 g"
      /Design\s+Spectral\s+Response\s+Acceleration\s+.*?\(.*?1.*?second.*?\).*?[=:]\s*(\d+\.\d+)/gi,
      /1\s*[-–]\s*Second\s+Design\s+Spectral\s+Response\s+Acceleration\s*[=:]\s*(\d+\.\d+)/gi,
      /Adjusted\s+1\s*[-–]\s*Second\s+Spectral\s+Acceleration\s*[=:]\s*(\d+\.\d+)/gi
    ],
    type: 'numeric'
  },

  Sms: {
    label: 'Sms',
    fullName: 'Site-Modified MCER Spectral Response (Short Period)',
    patterns: [
      /S\s*MS\s*:\s*(\d+\.?\d+)/gi,         // Table format: "S MS : 1.8"
      /SMS\s*:\s*(\d+\.?\d+)/gi,            // Table format: "SMS : 1.8"
      /S_MS\s+(\d+\.\d+)\s*g/gi,            // Geotech table: "S_MS 1.15 g"
      /SMS\s+(\d+\.\d+)\s*g/gi,             // Geotech table variant: "SMS 1.15 g"
      /S\s+MS\s+(\d+\.\d+)\s*g/gi,          // Geotech table with space: "S MS 1.15 g"
      /S_MS\s*=\s*(\d+\.\d+)/gi,
      /SMS\s*=\s*(\d+\.\d+)/gi
    ],
    type: 'numeric'
  },

  Sm1: {
    label: 'Sm1',
    fullName: 'Site-Modified MCER Spectral Response (1-Second)',
    patterns: [
      /S\s*M1\s*:\s*(\d+\.?\d+)/gi,         // Table format: "S M1 : 0.84"
      /SM1\s*:\s*(\d+\.?\d+)/gi,            // Table format: "SM1 : 0.84"
      /S_M1\s+(\d+\.\d+)\s*g/gi,            // Geotech table: "S_M1 0.75 g"
      /SM1\s+(\d+\.\d+)\s*g/gi,             // Geotech table variant: "SM1 0.75 g"
      /S\s+M1\s+(\d+\.\d+)\s*g/gi,          // Geotech table with space: "S M1 0.75 g"
      /S_M1\s*=\s*(\d+\.\d+)/gi,
      /SM1\s*=\s*(\d+\.\d+)/gi
    ],
    type: 'numeric'
  },

  Ss: {
    label: 'Ss',
    fullName: 'MCER Spectral Response Acceleration (Short Period)',
    patterns: [
      /Mapped\s+Spectral\s+Response\s+Acceleration\s+at\s+0\.2-second\s+period,?\s+S[sS]\s+(\d{1,2}(?:\.\d+)?)\s*g/gi,  // Table row format
      /\bS\s+S\s*[=:,]\s*(\d{1,2}(?:\.\d+)?)\s*g?\b/gi,    // Table format: "S S : 1.5" or "S S, 1.5g"
      /\bSS\s*[=:,]\s*(\d{1,2}(?:\.\d+)?)\s*g?\b/gi,       // Compact: "SS: 1.5" or "SS, 1.5g"
      /\bSs\s*=\s*(\d{1,2}(?:\.\d+)?)\b/gi,                // Drawing format: "Ss = 1.22"
      /MCER\s+.*?Short\s+Period\s+.*?[=:]\s*(\d{1,2}\.\d+)/gi,
      /Mapped\s+Spectral\s+Acceleration\s+.*?Short\s+Period.*?[=:]\s*(\d{1,2}\.\d+)/gi,
      /Risk\s*[-–]\s*Targeted\s+.*?Short\s+Period.*?[=:]\s*(\d{1,2}\.\d+)/gi
    ],
    type: 'numeric'
  },

  S1: {
    label: 'S1',
    fullName: 'MCER Spectral Response Acceleration (1-Second)',
    patterns: [
      /Mapped\s+Spectral\s+Response\s+Acceleration\s+at\s+1\.0-second\s+period,?\s+S[1₁]\s+(\d{1,2}(?:\.\d+)?)\s*g/gi,  // Table row format
      /\bS\s+1\s*[=:,]\s*(\d{1,2}(?:\.\d+)?)\s*g?\b/gi,    // Table format: "S 1 : 0.6" or "S 1, 0.6g"
      /\bS1\s*[=:,]\s*(\d{1,2}(?:\.\d+)?)\s*g?\b/gi,       // Compact: "S1: 0.6" or "S1, 0.6g"
      /MCER\s+.*?1\s*[-–]\s*Second.*?[=:]\s*(\d{1,2}\.\d+)/gi,
      /Mapped\s+Spectral\s+Acceleration\s+.*?1\s*[-–]\s*Second.*?[=:]\s*(\d{1,2}\.\d+)/gi,
      /Risk\s*[-–]\s*Targeted\s+.*?1\s*[-–]\s*Second.*?[=:]\s*(\d{1,2}\.\d+)/gi
    ],
    type: 'numeric'
  },

  Fa: {
    label: 'Fa',
    fullName: 'Site Coefficient (Short Period)',
    patterns: [
      /Site\s+Coefficient,?\s+Fa\s+(\d+\.\d+)/gi,        // Table row: "Site Coefficient, Fa 1.0"
      /FA\s*[=:,]\s*(\d+\.\d+)/gi,
      /F[_\s]?A\s*[=:,]\s*(\d+\.\d+)/gi,
      /Site\s+Coefficient\s+.*?Short\s+Period.*?[=:]\s*(\d+\.\d+)/gi,
      /Site\s+Class\s+Modification\s+Factor\s+.*?0\.2.*?[=:]\s*(\d+\.\d+)/gi,
      /FPGA\s*[=:]\s*(\d+\.\d+)/gi
    ],
    type: 'numeric'
  },

  Fv: {
    label: 'Fv',
    fullName: 'Site Coefficient (1-Second)',
    patterns: [
      /FV\s*[=:]\s*(\d+\.\d+)/gi,
      /F[_\s]?V\s*[=:]\s*(\d+\.\d+)/gi,
      /Site\s+Coefficient\s+.*?1\s*[-–]\s*Second.*?[=:]\s*(\d+\.\d+)/gi,
      /Site\s+Class\s+Modification\s+Factor\s+.*?1\.0.*?[=:]\s*(\d+\.\d+)/gi
    ],
    type: 'numeric'
  },

  siteClass: {
    label: 'Site Class',
    fullName: 'Site Classification',
    patterns: [
      /Site\s+Class\s+([A-F])\b/gi,
      /Site\s+Class\s*[=:]\s*([A-F])\b/gi,
      /Site\s+Classification\s*[=:]\s*([A-F])\b/gi,
      /ASCE\s+7.*?Site\s+Class\s*[=:]\s*([A-F])\b/gi,
      /Seismic\s+Site\s+Class\s*[=:]\s*([A-F])\b/gi,
      /The\s+site\s+class\s+is\s+([A-F])\b/gi
    ],
    type: 'category',
    validValues: ['A', 'B', 'C', 'D', 'E', 'F']
  },

  riskCategory: {
    label: 'Risk Category',
    fullName: 'Risk Category',
    patterns: [
      /RISK\s+CATEGORY:\s*(I{1,3}|IV)\b/gi,
      /Risk\s+Category\s*[=:]\s*(I{1,3}|IV)\b/gi,
      /Seismic\s+Risk\s+Category\s*[=:]\s*(I{1,3}|IV)\b/gi,
      /ASCE\s+7.*?Risk\s+Category\s*[=:]\s*(I{1,3}|IV)\b/gi,
      /Occupancy\s+Category\s*[=:]\s*(I{1,3}|IV)\b/gi,
      /The\s+risk\s+category\s+is\s+(I{1,3}|IV)\b/gi
    ],
    type: 'category',
    validValues: ['I', 'II', 'III', 'IV']
  },

  seismicDesignCategory: {
    label: 'SDC',
    fullName: 'Seismic Design Category',
    patterns: [
      /Seismic\s+Design\s+Category\s+for\s+Risk\s+Category[^,\n]*?([A-F])\b/gi,  // Table row: "Seismic Design Category for Risk Category I, II, or III D"
      /SEISMIC\s+DESIGN\s+CATEGORY:\s*([A-F])\b/gi,
      /Seismic\s+Design\s+Category\s+([A-F])\b/gi,
      /Seismic\s+Design\s+Category\s*[=:]\s*([A-F])\b/gi,
      /SDC\s*[=:]\s*([A-F])\b/gi
    ],
    type: 'category',
    validValues: ['A', 'B', 'C', 'D', 'E', 'F']
  }
}

/**
 * Normalizes extracted values
 * @param {string} value - Raw extracted value
 * @param {string} type - Value type (numeric or category)
 * @returns {string} Normalized value
 */
export function normalizeValue(value, type) {
  if (type === 'numeric') {
    // Convert to number and back to ensure consistent formatting
    const num = parseFloat(value)
    if (isNaN(num)) return value

    // Remove unnecessary trailing zeros
    return num.toString()
  }

  if (type === 'category') {
    // Uppercase for consistent comparison
    return value.toUpperCase().trim()
  }

  return value.trim()
}

/**
 * Compares two values with appropriate tolerance
 * @param {string} value1 - First value
 * @param {string} value2 - Second value
 * @param {string} type - Value type
 * @returns {boolean} True if values match within tolerance
 */
export function valuesMatch(value1, value2, type) {
  if (type === 'numeric') {
    const num1 = parseFloat(value1)
    const num2 = parseFloat(value2)

    if (isNaN(num1) || isNaN(num2)) {
      return false
    }

    // Allow ±0.005 tolerance for decimal values
    return Math.abs(num1 - num2) <= 0.005
  }

  if (type === 'category') {
    // Exact match required for categories
    return value1.toUpperCase().trim() === value2.toUpperCase().trim()
  }

  return value1.trim() === value2.trim()
}
