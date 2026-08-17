// Utilidades de color: dado el hex de un módulo (general.modules.color_hex),
// derivar variantes claras/oscuras en tiempo real — en el proyecto Angular
// anterior esto eran variables SCSS fijas por página ($seg/$seg-light/$seg-dark);
// acá se calcula desde la base de datos, no se hardcodea por pantalla.

function hexToHsl(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) =>
    lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const toHex = (n: number) =>
    Math.round(f(n) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

/** Versión bien clara del color (~95% luminosidad) — fondos tipo chip/badge. */
export function lighten(hex: string, targetLightness = 95): string {
  const [h, s] = hexToHsl(hex);
  return hslToHex(h, Math.min(s, 60), targetLightness);
}

/** Versión más oscura del color — para degradados y texto sobre fondo claro. */
export function darken(hex: string, amount = 15): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(l - amount, 10));
}

// ─── Variantes "teñido" conscientes de tema ────────────────────────────────
// lighten()/darken() de arriba se usan tal cual para cosas que deben verse
// IGUAL sin importar el tema (ej. el degradado de PageHeader — es un banner
// de color, no una superficie de la página). Estas tres son específicamente
// para el patrón "fondo tenue del color del módulo + texto legible encima"
// (encabezados de tabla, badges, stat chips) — en modo oscuro invierten el
// criterio: el fondo pasa a ser una versión OSCURA teñida en vez de casi
// blanca, y el texto pasa a ser una versión clara/pastel en vez de oscura.

/** Fondo tenue del color de un módulo — claro en light, oscuro-teñido en dark. */
export function tintBackground(hex: string, isDark: boolean): string {
  return lighten(hex, isDark ? 20 : 95);
}

/** Texto legible sobre tintBackground() del mismo color. */
export function tintForeground(hex: string, isDark: boolean, amount = 25): string {
  return isDark ? lighten(hex, 78) : darken(hex, amount);
}

/** Borde sutil a juego con tintBackground(). */
export function tintBorder(hex: string, isDark: boolean): string {
  return lighten(hex, isDark ? 30 : 88);
}
