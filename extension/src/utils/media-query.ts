//https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries

let query: MediaQueryList | null = null;
const onChange: ({ matches }: { matches: boolean }) => void = ({ matches }) =>
  listeners.forEach((listener) => listener(matches));
const listeners = new Set<(isDark: boolean) => void>();

export function runColorSchemeChangeDetector(
  callback: (isDark: boolean) => void,
): void {
  listeners.add(callback);
  if (query) {
    return;
  }
  query = matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", onChange);
}

export function stopColorSchemeChangeDetector(): void {
  if (!query || !onChange) {
    return;
  }
  query.removeEventListener("change", onChange);
  listeners.clear();
  query = null;
}
