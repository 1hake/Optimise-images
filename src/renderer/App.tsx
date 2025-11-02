import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import type { ConversionSettings, ConversionResult, ConversionProgress } from '../main/preload';

interface ProcessingFile {
    path: string;
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    result?: ConversionResult;
}

const App: React.FC = () => {
    const [files, setFiles] = useState<ProcessingFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [settings, setSettings] = useState<ConversionSettings>({
        quality: 80,
        lossless: false,
        maxWidth: undefined,
        preserveMetadata: false,
        outputFolder: undefined,
        outputFormats: {
            webp: true,
            png: false
        }
    });
    const [dragOver, setDragOver] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [outputFolderPath, setOutputFolderPath] = useState<string>('Same folder');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Listen for conversion progress
        window.electronAPI.onConversionProgress((progress: ConversionProgress) => {
            setFiles(prev => prev.map(file =>
                file.path === progress.currentFile
                    ? { ...file, status: progress.result.success ? 'completed' : 'error', result: progress.result }
                    : file
            ));
        });

        return () => {
            window.electronAPI.removeConversionProgressListener();
        };
    }, []);

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const droppedFiles = Array.from(e.dataTransfer.files).map(file => file.path);
        await handleFiles(droppedFiles);
    };

    const handleFiles = async (filePaths: string[]) => {
        if (isProcessing) return;

        try {
            const { validFiles, invalidFiles } = await window.electronAPI.validateFiles(filePaths);

            if (invalidFiles.length > 0) {
                toast.error(`${invalidFiles.length} unsupported file(s) skipped`);
            }

            if (validFiles.length === 0) {
                toast.error('No valid image files selected');
                return;
            }

            const newFiles: ProcessingFile[] = validFiles.map(path => ({
                path,
                name: path.split('/').pop() || path,
                status: 'pending'
            }));

            setFiles(newFiles);
            await processFiles(validFiles);
        } catch (error) {
            toast.error('Failed to process files');
            console.error(error);
        }
    };

    const processFiles = async (filePaths: string[]) => {
        // Validate that at least one output format is selected
        if (!settings.outputFormats.webp && !settings.outputFormats.png) {
            toast.error('Please select at least one output format');
            return;
        }

        setIsProcessing(true);

        try {
            await window.electronAPI.convertImagesBatch(filePaths, settings);
            const formatNames = [];
            if (settings.outputFormats.webp) formatNames.push('WebP');
            if (settings.outputFormats.png) formatNames.push('PNG');
            toast.success(`Converted ${filePaths.length} file(s) to ${formatNames.join(' and ')}`);
        } catch (error) {
            toast.error('Conversion failed');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileSelect = async () => {
        try {
            const selectedFiles = await window.electronAPI.selectImages();
            if (selectedFiles.length > 0) {
                await handleFiles(selectedFiles);
            }
        } catch (error) {
            toast.error('Failed to select files');
        }
    };

    const handleSelectOutputFolder = async () => {
        try {
            const folder = await window.electronAPI.selectOutputFolder();
            if (folder) {
                setSettings(prev => ({ ...prev, outputFolder: folder }));
                setOutputFolderPath(folder.split('/').pop() || folder);
            } else {
                setSettings(prev => ({ ...prev, outputFolder: undefined }));
                setOutputFolderPath('Same folder');
            }
        } catch (error) {
            toast.error('Failed to select output folder');
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const clearResults = () => {
        setFiles([]);
    };

    return (
        <div className="h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col">
            {/* Elegant Title Bar with macOS Traffic Light Spacing */}
            <div className="title-bar glass-panel border-0 border-b border-gray-200/30 pl-20 pr-6 py-4 flex items-center justify-between relative">
                {/* Subtle traffic light indicator - only visible in development */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="absolute left-5 top-1/2 transform -translate-y-1/2 flex space-x-2 opacity-20">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                )}
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-lg font-semibold text-gradient">Image Optimizer</h1>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 rounded-lg hover:bg-gray-900/5 transition-all duration-200 group"
                >
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>

            {/* Elegant Settings Panel */}
            {showSettings && (
                <div className="glass-panel border-0 border-b border-gray-200/30 mx-6 mt-3 rounded-xl p-5 space-y-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-800">Quality</label>
                            <span className="text-xs text-gray-500">Higher values = better quality</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={settings.quality}
                                onChange={(e) => setSettings(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                                disabled={settings.lossless}
                                className="elegant-slider w-24"
                            />
                            <div className="w-10 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-800">{settings.quality}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-800">Lossless</label>
                            <span className="text-xs text-gray-500">Perfect quality preservation</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.lossless}
                                onChange={(e) => setSettings(prev => ({ ...prev, lossless: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-800">Max Width</label>
                            <span className="text-xs text-gray-500">Resize large images (pixels)</span>
                        </div>
                        <input
                            type="number"
                            placeholder="No limit"
                            value={settings.maxWidth || ''}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                maxWidth: e.target.value ? parseInt(e.target.value) : undefined
                            }))}
                            className="elegant-input w-28 text-center"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-800">Preserve Metadata</label>
                            <span className="text-xs text-gray-500">Keep EXIF data</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.preserveMetadata}
                                onChange={(e) => setSettings(prev => ({ ...prev, preserveMetadata: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                        </label>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-200/50">
                        <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-800 mb-2">Output Formats</label>
                            <span className="text-xs text-gray-500 mb-3">Choose which formats to generate</span>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-md flex items-center justify-center">
                                            <span className="text-xs font-bold text-blue-700">W</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">WebP</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.outputFormats.webp}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                outputFormats: { ...prev.outputFormats, webp: e.target.checked }
                                            }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                                    </label>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-6 h-6 bg-gradient-to-br from-green-100 to-green-200 rounded-md flex items-center justify-center">
                                            <span className="text-xs font-bold text-green-700">P</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Optimized PNG</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.outputFormats.png}
                                            onChange={(e) => setSettings(prev => ({
                                                ...prev,
                                                outputFormats: { ...prev.outputFormats, png: e.target.checked }
                                            }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-800">Output Location</label>
                            <span className="text-xs text-gray-500">Where to save converted files</span>
                        </div>
                        <button
                            onClick={handleSelectOutputFolder}
                            className="elegant-button-secondary max-w-32 truncate"
                        >
                            {outputFolderPath}
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 p-6">
                {files.length === 0 ? (
                    // Elegant Drop Zone
                    <div
                        className={`h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${dragOver
                                ? 'drag-over border-gray-900/30 bg-gray-50/50 scale-[0.98]'
                                : 'border-gray-300/60 hover:border-gray-400/70 hover:bg-gray-50/30'
                            }`}
                        onDrop={handleDrop}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                    >
                        <div className="text-center p-12">
                            <div className="relative mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                                    <svg className="w-8 h-8 text-gray-600" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                {dragOver && (
                                    <div className="absolute -inset-2 bg-gradient-to-r from-gray-900/10 to-gray-700/10 rounded-3xl animate-pulse-elegant"></div>
                                )}
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Drop your images here</h3>
                            <p className="text-sm text-gray-500 mb-6">Drag and drop to optimize and convert instantly</p>
                            <div className="flex items-center justify-center mb-6">
                                <div className="h-px bg-gray-300 flex-1"></div>
                                <span className="px-4 text-xs text-gray-400 font-medium">OR</span>
                                <div className="h-px bg-gray-300 flex-1"></div>
                            </div>
                            <button
                                onClick={handleFileSelect}
                                disabled={isProcessing}
                                className="elegant-button disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Choose Images
                            </button>
                            <div className="mt-6 pt-4 border-t border-gray-200/50">
                                <p className="text-xs text-gray-400 font-medium mb-1">Supported formats</p>
                                <p className="text-xs text-gray-500">
                                    JPG, PNG, TIFF, HEIC, WebP, GIF, BMP
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Elegant Results View
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {isProcessing ? 'Converting Images...' : 'Conversion Complete'}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {files.length} {files.length === 1 ? 'file' : 'files'} processed
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={clearResults}
                                disabled={isProcessing}
                                className="elegant-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear All
                            </button>
                        </div>

                        <div className="space-y-3 max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {files.map((file, index) => (
                                <div key={index} className="glass-panel rounded-xl p-4 hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                                                    {file.result && (
                                                        <div className="mt-1">
                                                            {file.result.success ? (
                                                                <div className="space-y-1">
                                                                    {file.result.outputSizes?.webp && (
                                                                        <div className="flex items-center space-x-2 text-xs">
                                                                            <div className="w-4 h-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center">
                                                                                <span className="text-xs font-bold text-blue-700">W</span>
                                                                            </div>
                                                                            <span className="text-gray-600">
                                                                                {formatBytes(file.result.inputSize!)} → {formatBytes(file.result.outputSizes.webp)}
                                                                            </span>
                                                                            <div className={`px-2 py-0.5 rounded-full font-medium ${(file.result.savings?.webp || 0) > 0
                                                                                    ? 'bg-green-100 text-green-800'
                                                                                    : 'bg-gray-100 text-gray-600'
                                                                                }`}>
                                                                                {(file.result.savings?.webp || 0) > 0 ? `-${file.result.savings?.webp}%` : 'No savings'}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {file.result.outputSizes?.png && (
                                                                        <div className="flex items-center space-x-2 text-xs">
                                                                            <div className="w-4 h-4 bg-gradient-to-br from-green-100 to-green-200 rounded flex items-center justify-center">
                                                                                <span className="text-xs font-bold text-green-700">P</span>
                                                                            </div>
                                                                            <span className="text-gray-600">
                                                                                {formatBytes(file.result.inputSize!)} → {formatBytes(file.result.outputSizes.png)}
                                                                            </span>
                                                                            <div className={`px-2 py-0.5 rounded-full font-medium ${(file.result.savings?.png || 0) > 0
                                                                                    ? 'bg-green-100 text-green-800'
                                                                                    : 'bg-gray-100 text-gray-600'
                                                                                }`}>
                                                                                {(file.result.savings?.png || 0) > 0 ? `-${file.result.savings?.png}%` : 'No savings'}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-red-600 font-medium">{file.result.error}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            {file.status === 'processing' && (
                                                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                                            )}

                                            {file.status === 'completed' && file.result?.success && (
                                                <>
                                                    {/* Reveal in Finder - use first available output */}
                                                    <button
                                                        onClick={() => {
                                                            const firstOutputPath = file.result!.outputPaths?.webp || file.result!.outputPaths?.png;
                                                            if (firstOutputPath) {
                                                                window.electronAPI.revealInFinder(firstOutputPath);
                                                            }
                                                        }}
                                                        className="p-2 rounded-lg hover:bg-gray-900/5 text-gray-600 hover:text-gray-900 transition-all duration-200"
                                                        title="Reveal in Finder"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </button>

                                                    {/* Copy paths - create dropdown for multiple formats */}
                                                    {Object.keys(file.result!.outputPaths || {}).length === 1 ? (
                                                        <button
                                                            onClick={() => {
                                                                const firstOutputPath = file.result!.outputPaths?.webp || file.result!.outputPaths?.png;
                                                                if (firstOutputPath) {
                                                                    window.electronAPI.copyPath(firstOutputPath);
                                                                    toast.success('Path copied to clipboard');
                                                                }
                                                            }}
                                                            className="p-2 rounded-lg hover:bg-gray-900/5 text-gray-600 hover:text-gray-900 transition-all duration-200"
                                                            title="Copy Path"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        </button>
                                                    ) : (
                                                        <div className="relative group">
                                                            <button className="p-2 rounded-lg hover:bg-gray-900/5 text-gray-600 hover:text-gray-900 transition-all duration-200">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                            </button>
                                                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                {file.result!.outputPaths?.webp && (
                                                                    <button
                                                                        onClick={() => {
                                                                            window.electronAPI.copyPath(file.result!.outputPaths!.webp!);
                                                                            toast.success('WebP path copied');
                                                                        }}
                                                                        className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-50"
                                                                    >
                                                                        Copy WebP path
                                                                    </button>
                                                                )}
                                                                {file.result!.outputPaths?.png && (
                                                                    <button
                                                                        onClick={() => {
                                                                            window.electronAPI.copyPath(file.result!.outputPaths!.png!);
                                                                            toast.success('PNG path copied');
                                                                        }}
                                                                        className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-50"
                                                                    >
                                                                        Copy PNG path
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {file.status === 'completed' && (
                                                <div className="w-5 h-5 text-green-600">
                                                    <svg fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}

                                            {file.status === 'error' && (
                                                <div className="w-5 h-5 text-red-500">
                                                    <svg fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.tif,.tiff,.webp,.gif,.heic,.heif,.bmp"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []).map(file => file.path);
                    if (files.length > 0) handleFiles(files);
                    e.target.value = '';
                }}
                className="hidden"
            />
        </div>
    );
};

export default App;