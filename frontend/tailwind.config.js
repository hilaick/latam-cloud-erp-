/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Huawei Cloud brand palette
        huawei: {
          red:       '#E60012',
          'red-hover': '#C4000F',
          'red-active': '#A8000D',
          orange:    '#F24E1E',
          blue:      '#006CE3',
          green:     '#00A18C',
          navy:      '#1F2D3D',
          'navy-light': '#2A3A4D',
          surface:   '#FFFFFF',
          'surface-alt': '#F5F7FA',
          'text-primary': '#1F2D3D',
          'text-secondary': '#4A5A6E',
          'text-tertiary': '#8A8E99',
          'text-disabled': '#C2C2C2',
          border:    '#E4E7ED',
          'border-light': '#EEEEEE',
        },
        // Ant Design compatible semantic colors (mapped to Huawei Cloud values)
        ant: {
          primary:   '#E60012',
          'primary-hover': '#C4000F',
          success:   '#00A18C',
          warning:   '#F24E1E',
          error:     '#E60012',
          info:      '#006CE3',
          'text-primary':   '#1F2D3D',
          'text-secondary': '#4A5A6E',
          'text-disabled':  '#C2C2C2',
          'bg-layout':   '#F5F7FA',
          'bg-container':'#FFFFFF',
          'bg-hover':    '#F5F7FA',
          'border':      '#E4E7ED',
          'border-light':'#EEEEEE',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
