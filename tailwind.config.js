/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                gold: {
                    DEFAULT: '#C9A84C',
                    muted: 'rgba(201, 168, 76, 0.4)',
                    dim: 'rgba(201, 168, 76, 0.15)',
                },
                black: '#0A0A0A',
                gray: {
                    900: '#111111',
                    800: '#1A1A1A',
                    700: '#2A2A2A',
                    600: '#444444',
                    500: '#666666',
                    400: '#888888',
                }
            },
            fontFamily: {
                syne: ['Syne', 'sans-serif'],
                mono: ['DM Mono', 'monospace'],
                serif: ['DM Serif Display', 'serif'],
            },
            borderRadius: {
                'xl': '16px',
                '2xl': '24px',
            }
        },
    },
    plugins: [],
}
