import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
        <Toaster
            position="top-center"
            toastOptions={{
                duration: 3000,
                style: {
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#171717',
                    fontSize: '14px',
                    fontWeight: '500',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(229, 229, 229, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                },
                success: {
                    iconTheme: {
                        primary: '#059669',
                        secondary: '#ffffff',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#dc2626',
                        secondary: '#ffffff',
                    },
                },
            }}
        />
    </React.StrictMode>,
)