import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

// Types
interface ConversionSettings {
    quality: number;
    lossless: boolean;
    maxWidth?: number;
    preserveMetadata: boolean;
    outputFolder?: string;
    outputFormats: {
        webp: boolean;
        png: boolean;
    };
}

interface ConversionResult {
    success: boolean;
    inputPath: string;
    outputPaths?: {
        webp?: string;
        png?: string;
    };
    inputSize?: number;
    outputSizes?: {
        webp?: number;
        png?: number;
    };
    savings?: {
        webp?: number;
        png?: number;
    };
    error?: string;
}

let mainWindow: BrowserWindow;

function createWindow(): void {
    // Create the browser window
    mainWindow = new BrowserWindow({
        height: 520,
        width: 420,
        minHeight: 520,
        minWidth: 420,
        maxHeight: 520,
        maxWidth: 420,
        resizable: false,
        titleBarStyle: 'hiddenInset',
        titleBarOverlay: false,
        title: 'Image Optimizer',
        trafficLightPosition: { x: 20, y: 18 },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Load the app
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Supported image extensions
const SUPPORTED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.tif', '.tiff',
    '.webp', '.gif', '.heic', '.heif', '.bmp'
];

function isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
}

function generateUniqueFilename(outputPath: string): string {
    let counter = 1;
    let finalPath = outputPath;

    while (true) {
        try {
            // Check if file exists synchronously
            require('fs').accessSync(finalPath);
            const parsed = path.parse(outputPath);
            finalPath = path.join(parsed.dir, `${parsed.name} (${counter})${parsed.ext}`);
            counter++;
        } catch {
            // File doesn't exist, we can use this path
            break;
        }
    }

    return finalPath;
}

async function convertImage(
    inputPath: string,
    settings: ConversionSettings
): Promise<ConversionResult> {
    try {
        // Get input file stats
        const inputStats = await fs.stat(inputPath);
        const inputSize = inputStats.size;

        // Determine output directory
        const parsed = path.parse(inputPath);
        const outputDir = settings.outputFolder || parsed.dir;

        // Configure Sharp base instance
        let sharpInstance = sharp(inputPath);

        // Get image metadata first to check for animation
        const metadata = await sharpInstance.metadata();

        // Check for animated GIFs or WebP
        if (metadata.pages && metadata.pages > 1) {
            return {
                success: false,
                inputPath,
                error: 'Animated images are not supported. Only the first frame would be converted.'
            };
        }

        // Apply resize if specified
        if (settings.maxWidth && metadata.width && metadata.width > settings.maxWidth) {
            sharpInstance = sharpInstance.resize(settings.maxWidth, null, {
                withoutEnlargement: true,
                fit: 'inside'
            });
        }

        // Strip metadata unless preserve is enabled
        if (!settings.preserveMetadata) {
            sharpInstance = sharpInstance.withMetadata({});
        }

        const outputPaths: { webp?: string; png?: string } = {};
        const outputSizes: { webp?: number; png?: number } = {};
        const savings: { webp?: number; png?: number } = {};

        // Convert to WebP if requested
        if (settings.outputFormats.webp) {
            const webpOutputName = `${parsed.name}.webp`;
            const webpOutputPath = generateUniqueFilename(path.join(outputDir, webpOutputName));

            const webpOptions: sharp.WebpOptions = {
                lossless: settings.lossless,
            };

            if (!settings.lossless) {
                webpOptions.quality = settings.quality;
            }

            await sharpInstance.clone().webp(webpOptions).toFile(webpOutputPath);

            const webpStats = await fs.stat(webpOutputPath);
            outputPaths.webp = webpOutputPath;
            outputSizes.webp = webpStats.size;
            savings.webp = Math.round(((inputSize - webpStats.size) / inputSize) * 100);
        }

        // Convert to optimized PNG if requested
        if (settings.outputFormats.png) {
            const pngOutputName = `${parsed.name}_optimized.png`;
            const pngOutputPath = generateUniqueFilename(path.join(outputDir, pngOutputName));

            const pngOptions: sharp.PngOptions = {
                compressionLevel: 9, // Maximum compression
                progressive: false,
                quality: settings.lossless ? 100 : settings.quality,
            };

            await sharpInstance.clone().png(pngOptions).toFile(pngOutputPath);

            const pngStats = await fs.stat(pngOutputPath);
            outputPaths.png = pngOutputPath;
            outputSizes.png = pngStats.size;
            savings.png = Math.round(((inputSize - pngStats.size) / inputSize) * 100);
        }

        return {
            success: true,
            inputPath,
            outputPaths,
            inputSize,
            outputSizes,
            savings
        };

    } catch (error) {
        console.error('Conversion error:', error);
        return {
            success: false,
            inputPath,
            error: error instanceof Error ? error.message : 'Unknown conversion error'
        };
    }
}

// IPC Handlers
ipcMain.handle('select-images', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
            {
                name: 'Images',
                extensions: ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp', 'gif', 'heic', 'heif', 'bmp']
            }
        ]
    });

    if (result.canceled) {
        return [];
    }

    return result.filePaths.filter(isImageFile);
});

ipcMain.handle('convert-image', async (_event, inputPath: string, settings: ConversionSettings) => {
    return convertImage(inputPath, settings);
});

ipcMain.handle('convert-images-batch', async (_event, inputPaths: string[], settings: ConversionSettings) => {
    const results: ConversionResult[] = [];

    for (const inputPath of inputPaths) {
        if (isImageFile(inputPath)) {
            const result = await convertImage(inputPath, settings);
            results.push(result);

            // Send progress update
            mainWindow.webContents.send('conversion-progress', {
                completed: results.length,
                total: inputPaths.length,
                currentFile: inputPath,
                result
            });
        } else {
            results.push({
                success: false,
                inputPath,
                error: 'Unsupported file type'
            });
        }
    }

    return results;
});

ipcMain.handle('reveal-in-finder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
});

ipcMain.handle('copy-path', async (_event, filePath: string) => {
    const { clipboard } = require('electron');
    clipboard.writeText(filePath);
});

ipcMain.handle('select-output-folder', async (_event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (result.canceled) {
        return null;
    }

    return result.filePaths[0];
});

ipcMain.handle('validate-files', async (_event, filePaths: string[]) => {
    const validFiles: string[] = [];
    const invalidFiles: string[] = [];

    for (const filePath of filePaths) {
        try {
            const stats = await fs.stat(filePath);
            if (stats.isFile() && isImageFile(filePath)) {
                validFiles.push(filePath);
            } else {
                invalidFiles.push(filePath);
            }
        } catch {
            invalidFiles.push(filePath);
        }
    }

    return { validFiles, invalidFiles };
});