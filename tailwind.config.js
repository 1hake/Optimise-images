/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/renderer/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'system': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
            },
            backdropBlur: {
                'xs': '2px',
            },
            animation: {
                'pulse-elegant': 'pulse-elegant 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                'pulse-elegant': {
                    '0%, 100%': {
                        opacity: '1',
                    },
                    '50%': {
                        opacity: '0.7',
                    },
                }
            },
            colors: {
                gray: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                }
            }
        },
    },
    plugins: [
        function ({ addUtilities }) {
            const newUtilities = {
                '.scrollbar-thin': {
                    'scrollbar-width': 'thin',
                },
                '.scrollbar-thumb-gray-300': {
                    'scrollbar-color': '#d4d4d4 transparent',
                },
                '.scrollbar-track-gray-100': {
                    'scrollbar-track-color': '#f5f5f5',
                },
            }
            addUtilities(newUtilities)
        }
    ],
}