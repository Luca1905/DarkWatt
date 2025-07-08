export interface RGBA {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface HSLA {
  h: number;
  s: number;
  l: number;
  a?: number;
}

// https://en.wikipedia.org/wiki/HSL_and_HSV
export function hslToRGB({ h, s, l, a = 1 }: HSLA): RGBA {
  if (s === 0) {
    const [r, b, g] = [l, l, l].map((x) => Math.round(x * 255));
    return { r, g, b, a };
  }

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = (
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  ).map((n) => Math.round((n + m) * 255));

  return { r, g, b, a };
}

// https://en.wikipedia.org/wiki/HSL_and_HSV
export function rgbToHSL({ r: r255, g: g255, b: b255, a = 1 }: RGBA): HSLA {
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const c = max - min;

  const l = (max + min) / 2;

  if (c === 0) {
    return { h: 0, s: 0, l, a };
  }
  let h =
    (max === r
      ? ((g - b) / c) % 6
      : max === g
        ? (b - r) / c + 2
        : (r - g) / c + 4) * 60;
  if (h < 0) {
    h += 360;
  }

  const s = c / (1 - Math.abs(2 * l - 1));

  return { h, s, l, a };
}

export function rgbToString(rgb: RGBA): string {
  const { r, g, b, a } = rgb;
  if (a != null && a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgba(${r}, ${g}, ${b})`;
}

const rgbMatch = /^rgba?\([^()]+\)$/;
const hslMatch = /^hsla?\([^()]+\)$/;
const hexMatch = /^#[0-9a-f]+$/i;

export function parse($color: string): RGBA | null {
  const color = $color.trim().toLowerCase();

  if (color.match(rgbMatch)) {
    return parseRGB(color);
  }

  if (color.match(hslMatch)) {
    return parseHSL(color);
  }

  if (color.match(hexMatch)) {
    return parseHex(color);
  }

  if (color === "transparent") {
    return {
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    };
  }

  if (color.endsWith(")")) {
    return parseUsingDOM(color);
  }

  return null;
}

const rgbRange = [255, 255, 255, 1];
const rgbUnits = { "%": 100 };
function parseRGB($rgb: string) {
  const [r, g, b, a = 1] = getNumbersFromString($rgb, rgbRange, rgbUnits);
  if (r == null || g == null || b == null || a == null) {
    return null;
  }
  return {
    r,
    g,
    b,
    a,
  };
}

const hslRange = [360, 1, 1, 1];
const hslUnits = { "%": 100, deg: 360, rad: 2 * Math.PI, turn: 1 };
function parseHSL($hsl: string): RGBA | null {
  const [h, s, l, a = 1] = getNumbersFromString($hsl, hslRange, hslUnits);
  if (h == null || s == null || s == null || a == null) {
    return null;
  }
  return hslToRGB({ h, s, l, a });
}

function parseHex($hex: string): RGBA | null {
  const h = $hex.substring(1);
  if (h.length !== 6) {
    return null;
  }
  const [r, g, b] = [0, 2, 4].map((i) =>
    Number.parseInt(h.substring(i, i + 2), 16),
  );
  const a = 1;
  return {
    r,
    g,
    b,
    a,
  };
}

function getNumbers(input: string) {
  const numbers: string[] = [];
  let prev = 0;
  let isMining = false;

  const start = input.indexOf("(");
  const $color = input.substring(start + 1, input.length - 1);
  for (let i = 0; i < $color.length; i++) {
    const c = $color[i];
    if ((c >= "0" && c <= "9") || c === "." || c === "+" || c === "-") {
      isMining = true;
    } else if (isMining && (c === " " || c === "," || c === "/")) {
      numbers.push($color.substring(prev, i));
      isMining = false;
      prev = i + 1;
    } else if (!isMining) {
      prev = i + 1;
    }
  }

  if (isMining) {
    numbers.push($color.substring(prev, $color.length));
  }
  return numbers;
}

function getNumbersFromString(
  str: string,
  range: number[],
  units: { [unit: string]: number },
) {
  const raw = getNumbers(str);
  const unitsList = Object.entries(units);
  const numbers = raw
    .map((r) => r.trim())
    .map((r, i) => {
      let n: number;
      const unit = unitsList.find(([u]) => r.endsWith(u));
      if (unit) {
        n =
          (Number.parseFloat(r.substring(0, r.length - unit[0].length)) /
            unit[1]) *
          range[i];
      } else {
        n = Number.parseFloat(r);
      }
      if (range[i] > 1) {
        return Math.round(n);
      }
      return n;
    });
  return numbers;
}

export function getSRGBLightness(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;

function parseUsingDOM($color: string) {
  if (!context) {
    canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    // biome
    context = canvas.getContext("2d", { willReadFrequently: true })!;
  }
  context.fillStyle = $color;
  context.fillRect(0, 0, 1, 1);
  const d = context.getImageData(0, 0, 1, 1).data;
  const color = `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${(d[3] / 255).toFixed(2)})`;
  return parseRGB(color);
}
