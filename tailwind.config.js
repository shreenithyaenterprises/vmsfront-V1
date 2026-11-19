/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./index.html',
		'./src/**/*.{js,jsx,ts,tsx}',
	],
	theme: {
		extend: {
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				slideDown: {
					'0%': { opacity: '0', transform: 'translateY(-30px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				slideUp: {
					'0%': { opacity: '0', transform: 'translateY(30px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				bounce: {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-8px)' },
				},
			},
			animation: {
				fadeIn: 'fadeIn 0.8s ease-out',
				slideDown: 'slideDown 0.6s ease-out',
				slideUp: 'slideUp 0.8s ease-out',
				bounce: 'bounce 1s ease-out',
			},
		},
	},
	plugins: [],
};
