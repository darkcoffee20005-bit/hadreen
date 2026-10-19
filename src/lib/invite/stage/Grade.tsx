'use client';

import { Bloom, EffectComposer, LUT, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { LookupTexture, ToneMappingMode } from 'postprocessing';
import { useEffect, useMemo } from 'react';
import { HalfFloatType } from 'three';
import { useInvite } from '../machine';
import { TIER_SETTINGS } from '../quality/tiers';
import { bakeGradeData, type GradeParams } from './grade';

/**
 * The film look: bloom, neutral tone mapping (keeps the brand's emerald and gold true), the
 * template's LUT grade, vignette and grain. Low tier skips the composer entirely (the renderer
 * tone-maps instead).
 */
export function Grade({ grade, bloomBoost = 1 }: { grade: GradeParams; bloomBoost?: number }) {
  const tier = useInvite((s) => s.tier);
  const s = TIER_SETTINGS[tier];
  const lut = useMemo(() => new LookupTexture(bakeGradeData(grade, 32), 32), [grade]);
  useEffect(() => () => lut.dispose(), [lut]);

  if (!s.post) return null;
  // Mipmap blur already works down a resolution chain; fewer levels is the cheap setting.
  // (Its deprecated resolutionScale option corrupts the result at small sizes — don't pass it.)
  const effects = [
    s.bloom !== 'off' && (
      <Bloom
        key="bloom"
        mipmapBlur
        levels={s.bloom === 'half' ? 5 : 8}
        intensity={grade.bloom * bloomBoost}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.18}
      />
    ),
    <ToneMapping key="tone" mode={ToneMappingMode.NEUTRAL} />,
    <LUT key="lut" lut={lut} />,
    <Vignette key="vignette" offset={0.28} darkness={grade.vignette} />,
    <Noise key="grain" premultiply opacity={grade.grain} />,
    s.smaa && <SMAA key="smaa" />,
  ].filter(Boolean) as React.ReactElement[];

  return (
    <EffectComposer multisampling={s.msaa} frameBufferType={HalfFloatType} enableNormalPass={false}>
      {effects}
    </EffectComposer>
  );
}
