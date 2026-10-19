/**
 * Two swans whose necks meet in a heart, as SVG paths (viewBox 0 0 100 84). Shared by the
 * basmala plaque on the content page and the 2D fallback.
 */
export const SWAN_PATH =
  'M8 70C14 60 24 56 31 60C34.5 62 37.5 63 40 62C32 52 28 40 31 31C34 22 44 20 48 27C50 30 50.5 34 50 40C48 36 46.5 32 45 30C42 26 36 27 35.5 34C35 42 38 52 46 62C49 66 48.5 73 44 76L14 76C10 75 7 73 8 70Z';
export const BEAK_PATH = 'M50 40C49.4 37.8 48.6 36.4 47.6 35.4L49.2 33.6C50 35.6 50.3 37.6 50 40Z';

export function SwanHeart({ className, stroke, fill = 'none', beak }: { className?: string; stroke?: string; fill?: string; beak?: string }) {
  const swan = (
    <>
      <path d={SWAN_PATH} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.2 : 0} strokeLinejoin="round" />
      {beak && <path d={BEAK_PATH} fill={beak} />}
    </>
  );
  return (
    <svg viewBox="0 0 100 84" className={className} aria-hidden="true">
      {swan}
      <g transform="translate(100 0) scale(-1 1)">{swan}</g>
    </svg>
  );
}
