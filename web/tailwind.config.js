/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./pages/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
    plugins: [require("@tailwindcss/typography"), require("daisyui")],
    daisyui: {
      themes: ["light"],
    },
}
