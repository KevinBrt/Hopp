import tailwindcss from '@tailwindcss/postcss';

/**
 * The palette lives inside a shadow root on arbitrary websites, where `rem`
 * is relative to the host page's <html> font-size (often 62.5%, 10px…).
 * Converting to px keeps sizing identical everywhere.
 */
const remToPx = () => ({
  postcssPlugin: 'hop-rem-to-px',
  Declaration(decl) {
    if (!decl.value.includes('rem')) return;
    decl.value = decl.value.replace(
      /(-?\d*\.?\d+)rem\b/g,
      (_, n) => `${+(parseFloat(n) * 16).toFixed(3)}px`,
    );
  },
});
remToPx.postcss = true;

export default { plugins: [tailwindcss(), remToPx()] };
