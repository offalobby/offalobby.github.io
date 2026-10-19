/**
 * The palette, authored in sRGB.
 * Shaders receive these raw (no linear conversion) so what you pick here is
 * what you see on screen. Mirrored as CSS custom properties in styles/tokens.css.
 */
export const palette = {
  forest: '#343B29', // deep forest green
  olive: '#767C5A', // muted olive / sage
  moss: '#B6AD78', // earthy moss
  copper: '#AD7A4E', // heartwood copper
  lichen: '#7F8E88', // blue-gray seam (from the layered-formation reference)
  ochre: '#A69A52', // sunlit moss-gold layers (from the fine-strand reference)
  haze: '#93A69C', // cool sage-teal mist (the air is cool, the light is warm)
  deep: '#111814', // painted dark ground of the atmosphere
  parchment: '#F1EBD9', // aged ivory paper
  ink: '#2A2820', // woodcut ink
  loam: '#161812', // darkest ground, near-black with green in it
} as const;

export type PaletteKey = keyof typeof palette;

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
