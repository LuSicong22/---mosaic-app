# Mosaic Image Editor

A modern, responsive web application for adding mosaic and blur effects to images. Built with React, TypeScript, and Fabric.js, this app works seamlessly on both desktop and mobile devices.

## Features

- **Multiple Effect Types:**

  - **Ground Glass Mosaic**: Creates a frosted glass effect similar to screenshot blurring
  - **Blur**: Applies a subtle blur effect
  - **Traditional Mosaic**: Creates pixelated/blocked mosaic effect

- **User-Friendly Interface:**

  - Simple image upload
  - Adjustable blur strength (0–100) mapped to 5–40px radius
  - Real-time drawing with visual feedback
  - Responsive design for all devices

- **Professional Tools:**

  - Undo/Redo functionality (up to 20 states)
  - Clear effects option
  - High-quality image export (PNG format)

- **Progressive Web App (PWA):**
  - Installable on mobile devices
  - Works offline
  - Native app-like experience

## How to Use

1. **Upload Image**: Click "Upload Image" to select an image file
2. **Set Blur Strength**: Use the strength slider (0–100). Internally this maps linearly to a blur radius of 5–40px.
3. **Select Area**: Click and drag on the image to select a rectangle to blur
4. **Edit**: Use Undo/Redo buttons to adjust your work
5. **Save**: Click "Save Image" to download your edited image

## Installation

### Development

```bash
# Clone the repository
git clone <repository-url>
cd mosaic-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Mobile Installation

1. Open the app in your mobile browser
2. Look for the "📱 Install App" button in the header
3. Tap to install the app on your device
4. The app will now work like a native application

## Technical Details

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Canvas Library**: Fabric.js
- **Styling**: CSS3 with modern features
- **PWA**: Service Worker + Web App Manifest

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
