(function () {
  const DARK_CLASS_NAMES = [
    'dark',
    'dark-mode',
    'theme-dark',
    'mode-dark',
    'night',
    'darktheme',
    'dark_background',
  ];

  function hasDarkClass(el) {
    if (!el || !el.classList) return false;
    return DARK_CLASS_NAMES.some((cls) => el.classList.contains(cls));
  }

  function relativeLuminance(r, g, b) {
    const srgbToLinear = (c) => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const R = srgbToLinear(r);
    const G = srgbToLinear(g);
    const B = srgbToLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  function isDarkByBg(element) {
    if (!element) return false;
    const style = getComputedStyle(element);
    const bg = style.backgroundColor || style.color;
    if (!bg || bg === 'transparent') return false;

    const rgbMatch = bg.match(/rgba?\(([^)]+)\)/);
    if (!rgbMatch) return false;
    const [r, g, b] = rgbMatch[1]
      .split(',')
      .slice(0, 3)
      .map((v) => parseInt(v.trim(), 10));

    if ([r, g, b].some((x) => Number.isNaN(x))) return false;

    return relativeLuminance(r, g, b) < 0.2;
  }

  function detectPageMode() {
    const body = document.body;

    if (hasDarkClass(body)) {
      console.log('[SCRIPT] Detected dark class');
      return 'dark';
    }
    if (isDarkByBg(body)) {
      console.log(`[SCRIPT] Detected dark background`);
      return 'dark';
    }

    return 'light';
  }

  function notifyBackground(mode) {
    try {
      chrome.runtime.sendMessage({ action: 'page_mode_detected', mode });
    } catch (err) {
      console.warn('[SCRIPT] Unable to send page mode message:', err);
    }
  }

  function init() {
    const mode = detectPageMode();
    console.log(`[SCRIPT] Detected page mode: ${mode}`);
    notifyBackground(mode);
  }

  if (
    document.readyState === 'complete' ||
    document.readyState === 'interactive'
  ) {
    init();
  } else {
    window.addEventListener('DOMContentLoaded', init, { once: true });
  }

  window.DarkWatt_checkTheme = init;
})();
