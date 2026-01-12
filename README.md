# Engineering Drawing Detector

A modular React application for detecting potential issues in engineering drawings.

## Features

- PDF and image upload support
- Modular detector system with four detection modules:
  - **Red Elements**: Detects red-colored elements
  - **Highlights**: Detects highlighted areas (yellow/bright colors)
  - **No-Refs**: Detects missing reference callouts
  - **Overlapping Text**: Detects overlapping text elements

## Project Structure

```
drawing-detector/
├── src/
│   ├── components/
│   │   ├── FileUpload.jsx          # File upload component (PDF & images)
│   │   ├── FileUpload.css
│   │   ├── DetectionResults.jsx    # Results display component
│   │   └── DetectionResults.css
│   ├── detectors/
│   │   ├── redElements.js          # Red elements detector module
│   │   ├── highlights.js           # Highlights detector module
│   │   ├── noRefs.js               # Missing references detector module
│   │   └── overlappingText.js      # Overlapping text detector module
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.js
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Customizing Detectors

Each detector module in `src/detectors/` is a standalone function that:
- Takes `imageData` (base64 data URL) as input
- Returns a Promise with detection results
- Results include: `detected`, `count`, `locations`, and `message`

### Example Detector Structure

```javascript
export async function detectExample(imageData) {
  // Your detection logic here
  return {
    detected: boolean,      // Whether issue was detected
    count: number,          // Number of issues found
    locations: array,       // Array of {x, y} coordinates
    message: string         // Human-readable message
  }
}
```

## Adding Your Existing Code

Replace the placeholder implementations in the detector modules with your existing detection code. Each module is independent, so you can update them one at a time.

## Technologies

- React 18
- Vite 5
- PDF.js 4
