'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { GoldText } from '@/lib/invite/text3d/GoldText';
import { cssFontVar } from '@/lib/invite/text3d/fonts';
import { canvas, cssFontFamily } from '@/lib/invite/stage/textures';

/** Width-to-height ratio of the plane GoldText will draw for `text` (same font, size and padding). */
async function textAspect(text: string, family: string, weight: number, px: number): Promise<number> {
  const font = `${weight} ${px}px ${family}`;
  try {
    await document.fonts.load(font, text);
  } catch {
    // measure with whatever font is available
  }
  const [, ctx] = canvas(8, 8);
  ctx.font = font;
  const m = ctx.measureText(text);
  const ascent = m.actualBoundingBoxAscent || px * 0.9;
  const descent = m.actualBoundingBoxDescent || px * 0.4;
  const pad = px * 0.25;
  return (m.width + pad * 2) / (ascent + descent + pad * 2);
}

/** GoldText that never grows wider than `maxWidth` (long names shrink to fit the cartouche). */
export function FitGoldText({ maxWidth, height, ...props }: ComponentProps<typeof GoldText> & { maxWidth: number }) {
  const [fitted, setFitted] = useState<number | null>(null);
  const role = props.role ?? 'display';
  const [variable, fallback] = cssFontVar(props.lang, role);
  useEffect(() => {
    let cancelled = false;
    const family = cssFontFamily(variable, fallback);
    textAspect(props.text, family, role === 'display' ? 700 : 400, role === 'display' ? 180 : 120).then((aspect) => {
      if (!cancelled) setFitted(Math.min(height, maxWidth / Math.max(0.1, aspect)));
    });
    return () => {
      cancelled = true;
    };
  }, [props.text, role, variable, fallback, height, maxWidth]);
  if (fitted == null) return null;
  return <GoldText {...props} height={fitted} />;
}
