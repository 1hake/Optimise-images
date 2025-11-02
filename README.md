# Image Optimizer

A minimal, fast macOS desktop app built by **onehake** for optimizing images with WebP and PNG compression.

![Image Optimizer Screenshot](screenshot.png)

## Features

- **Drag & Drop Interface**: Simply drag images into the app or use the file picker
- **Batch Processing**: Convert multiple images at once with progress tracking
- **Smart Defaults**: Optimized settings for best size/quality ratio
- **Configurable Settings**: Adjust quality, enable lossless mode, set max width, and more
- **Format Support**: JPG, PNG, TIFF, HEIC, WebP, GIF, BMP
- **File Safety**: Never overwrites files - automatically generates unique names
- **macOS Integration**: Native file dialogs, Finder integration, and system notifications

## Tech Stack

- **Electron 28+** - Cross-platform desktop framework
- **TypeScript** - Type-safe development
- **React 18** - Modern UI framework
- **Tailwind CSS** - Utility-first styling
- **Sharp** - High-performance image processing
- **Vite** - Fast development and building
- **Electron Builder** - App packaging and distribution

## Quick Start

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm** or **yarn**
- **macOS 10.15+** (Catalina or later)

### Installation

```bash
# Clone the repository
git clone https://github.com/1hake/Optimise-images.git
cd Optimise-images

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open automatically with hot reload enabled for development.

### Building

```bash
# Build for production
npm run build

# Package for macOS (creates .dmg)
npm run dist:mac

# Development packaging (faster, no signing)
npm run pack:mac
```

Built applications will be in the `release/` directory.

## Usage

### Basic Conversion

1. **Open the app** - Launch Image Optimizer
2. **Add images** - Drag & drop files or click "Choose Images"
3. **Convert** - Processing starts automatically with smart defaults
4. **Access results** - Use "Reveal in Finder" or "Copy Path" buttons

### Settings Configuration

Click the gear icon to access settings:

- **Quality**: 1-100 (default: 80) - Higher = better quality, larger files
- **Lossless**: Toggle for perfect quality preservation (ignores quality setting)
- **Max Width**: Optional resize limit (maintains aspect ratio)
- **Preserve Metadata**: Keep EXIF data (stripped by default for privacy)
- **Output Folder**: Choose custom location or use "Same folder" (default)

### Batch Processing

- Drop multiple files simultaneously
- Each file processes independently with individual progress
- Failed conversions don't stop the batch
- View results and errors for each file

## Configuration Details

### Default Settings
```typescript
{
  quality: 80,           // Good balance of size/quality
  lossless: false,       // Lossy compression enabled
  maxWidth: undefined,   // No resizing
  preserveMetadata: false, // Strip EXIF for privacy
  outputFolder: undefined  // Same folder as source
}
```

### Supported Formats
- **Input**: `.jpg`, `.jpeg`, `.png`, `.tif`, `.tiff`, `.webp`, `.gif`, `.heic`, `.heif`, `.bmp`
- **Output**: `.webp` (always)

### File Naming
- Output: `originalname.webp`
- Conflicts: `originalname (1).webp`, `originalname (2).webp`, etc.
- Never overwrites existing files

## Development

### Project Structure
```
src/
├── main/           # Electron main process
│   ├── main.ts     # App initialization, window management
│   └── preload.ts  # Secure IPC bridge
└── renderer/       # React frontend
    ├── App.tsx     # Main UI component
    ├── main.tsx    # React entry point
    ├── index.css   # Tailwind styles
    └── types.d.ts  # TypeScript definitions
```

### Scripts

```bash
# Development
npm run dev              # Start dev server + Electron
npm run dev:vite         # Vite dev server only
npm run dev:electron     # Electron only (needs Vite running)

# Building
npm run build            # Build renderer + main process
npm run build:renderer   # Build React app only
npm run build:main       # Build Electron main process only

# Packaging
npm run pack:mac         # Quick package (no signing)
npm run dist:mac         # Production build with signing
```

### Architecture

#### Security Model
- **Context Isolation**: Enabled - renderer can't access Node.js directly
- **Node Integration**: Disabled - prevents security vulnerabilities  
- **Preload Script**: Secure IPC bridge with typed API
- **CSP Ready**: Content Security Policy compatible

#### IPC Communication
```typescript
// Main → Renderer
window.electronAPI.selectImages()
window.electronAPI.convertImagesBatch(files, settings)
window.electronAPI.revealInFinder(path)

// Renderer listens to Main
window.electronAPI.onConversionProgress(callback)
```

#### Image Processing
- **Sharp Library**: Industry-standard image processing
- **Streaming**: Large files processed without full memory load
- **Error Handling**: Graceful failure with detailed error messages
- **Animation Detection**: Warns about animated GIF/WebP limitations

## Building for Production

### Code Signing (Optional)

For distribution outside the App Store:

1. **Get Developer Certificate**:
   ```bash
   # List available certificates
   security find-identity -v -p codesigning
   ```

2. **Update electron-builder.yml**:
   ```yaml
   mac:
     identity: "Developer ID Application: Your Name (TEAM_ID)"
   ```

3. **Build signed app**:
   ```bash
   npm run dist:mac
   ```

### Universal Binary

The app builds as a universal binary by default, supporting both Intel and Apple Silicon Macs:

```yaml
# electron-builder.yml
mac:
  target:
    - target: dmg
      arch: [universal]  # Intel + Apple Silicon
```

For separate builds:
```bash
# Intel only
npx electron-builder --mac --x64

# Apple Silicon only  
npx electron-builder --mac --arm64
```

## Known Limitations

### Image Format Support
- **Animated GIFs**: Not supported - shows warning, converts first frame only
- **Animated WebP**: Not supported - Sharp limitation
- **HEIC/HEIF**: Requires system codec support (available macOS 10.13+)

### File Size Limits
- **Large files**: Sharp handles efficiently, but very large files (>100MB) may be slow
- **Memory usage**: Optimized for streaming, but peak usage depends on image dimensions

### Platform Support
- **Current**: macOS only (Catalina 10.15+)
- **Future**: Windows/Linux support possible with minimal changes

### WebP Limitations
- **Browser support**: Modern browsers only
- **Transparency**: Preserved when present in source
- **Color space**: sRGB recommended for best compatibility

## Troubleshooting

### Common Issues

**"Sharp install failed"**
```bash
# Rebuild Sharp for current platform
npm rebuild sharp
```

**"Electron app won't start"**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**"Permission denied" on macOS**
- App needs file system access permissions
- Grant in System Preferences > Security & Privacy

**"Unsupported image format"**
- Check file extension is in supported list
- Verify file isn't corrupted
- Try converting with another tool first

### Development Issues

**TypeScript errors**
```bash
# Install missing type definitions
npm install --save-dev @types/node @types/electron
```

**Hot reload not working**
- Ensure Vite dev server starts before Electron
- Check port 5173 is available
- Restart development process

### Performance Tips

**Large batch processing**:
- Process files in smaller batches (10-20 files)
- Use lower quality settings for faster conversion
- Enable lossless only when necessary

**Memory usage**:
- Close other applications during large conversions
- Monitor Activity Monitor for memory pressure

## Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow existing code style and formatting
- Add JSDoc comments for public APIs
- Test on both Intel and Apple Silicon Macs
- Update README for user-facing changes

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Built by onehake

**Developer:** [onehake](https://github.com/1hake)  
**Repository:** [Optimise-images](https://github.com/1hake/Optimise-images)

### Technologies Used
- **Sharp** - High-performance image processing
- **Electron** - Cross-platform desktop framework  
- **React** - Modern UI framework
- **Tailwind CSS** - Utility-first styling

*Image Optimizer - A minimal, fast macOS desktop app for image optimization*