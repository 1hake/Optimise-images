import { contextBridge, ipcRenderer } from 'electron';

// Types for IPC communication
export interface ConversionSettings {
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

export interface ConversionResult {
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

export interface ConversionProgress {
    completed: number;
    total: number;
    currentFile: string;
    result: ConversionResult;
}

export interface ValidationResult {
    validFiles: string[];
    invalidFiles: string[];
}

// Exposed API for renderer process
const electronAPI = {
    // File operations
    selectImages: (): Promise<string[]> =>
        ipcRenderer.invoke('select-images'),

    selectOutputFolder: (): Promise<string | null> =>
        ipcRenderer.invoke('select-output-folder'),

    validateFiles: (filePaths: string[]): Promise<ValidationResult> =>
        ipcRenderer.invoke('validate-files', filePaths),

    // Conversion operations
    convertImage: (inputPath: string, settings: ConversionSettings): Promise<ConversionResult> =>
        ipcRenderer.invoke('convert-image', inputPath, settings),

    convertImagesBatch: (inputPaths: string[], settings: ConversionSettings): Promise<ConversionResult[]> =>
        ipcRenderer.invoke('convert-images-batch', inputPaths, settings),

    // System operations
    revealInFinder: (filePath: string): Promise<void> =>
        ipcRenderer.invoke('reveal-in-finder', filePath),

    copyPath: (filePath: string): Promise<void> =>
        ipcRenderer.invoke('copy-path', filePath),

    // Event listeners
    onConversionProgress: (callback: (progress: ConversionProgress) => void) => {
        ipcRenderer.on('conversion-progress', (_event, progress) => callback(progress));
    },

    removeConversionProgressListener: () => {
        ipcRenderer.removeAllListeners('conversion-progress');
    }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Export types for TypeScript
export type ElectronAPI = typeof electronAPI;