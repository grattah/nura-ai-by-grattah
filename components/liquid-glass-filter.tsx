/**
 * Reusable SVG filter for the "liquid glass" effect. Rendered once (in the root
 * layout) so any `.liquid-glass` element can reference it via
 * `backdrop-filter: url(#liquid-glass)`.
 *
 * feTurbulence generates soft noise; feDisplacementMap bends the backdrop by it,
 * giving a liquid refraction on top of the blur/tint. Two knobs to tune:
 *   - feTurbulence baseFrequency = ripple size (smaller = larger, slower waves)
 *   - feDisplacementMap scale     = distortion strength
 *
 * Note: `url()` in backdrop-filter is Chromium-only; Safari/iOS ignores it and
 * keeps the frosted fallback defined in globals.css.
 */
export function LiquidGlassFilter() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <filter
        id="liquid-glass"
        x="-25%"
        y="-25%"
        width="150%"
        height="150%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.012 0.012"
          numOctaves="2"
          seed="7"
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="2" result="blurredNoise" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="blurredNoise"
          scale="18"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
