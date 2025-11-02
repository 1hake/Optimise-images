// Global type definitions for the Electron API
import type { ElectronAPI } from '../main/preload';

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}