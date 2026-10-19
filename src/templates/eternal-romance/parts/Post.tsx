'use client';

import { Bloom, DepthOfField, EffectComposer, LUT, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { LookupTexture, ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing';
import { useEffect, useMemo } from 'react';
import { HalfFloatType } from 'three';
import { useInvite } from '@/lib/invite/machine';
import { TIER_SETTINGS } from '@/lib/invite/quality/tiers';
import { bakeGradeData, type GradeParams } from '@/lib/invite/stage/grade';
import { Grade } from '@/lib/invite/stage/Grade';

/**
 * The engine's film look, plus depth of field where the tier allows it (high only: shallow focus
 * on the candlelit table during the opening and while scrolling). Medium/low use the shared Grade
 * as is. The DOF variant mirrors Grade's chain exactly, with DepthOfField first.
 */
export function Post({ grade, dofRef }: { grade: GradeParams; dofRef: React.Ref<DepthOfFieldEffect> }) {
  const tier = useInvite((s) => s.tier);
  const mini = useInvite((s) => s.mode === 'mini');
  const s = TIER_SETTINGS[tier];
  if (!s.dof || !s.post || mini) return <Grade grade={grade} />;
  return <GradeWithDof grade={grade} dofRef={dofRef} />;
}

function GradeWithDof({ grade, dofRef }: { grade: GradeParams; dofRef: React.Ref<DepthOfFieldEffect> }) {
  const tier = useInvite((s) => s.tier);
  const s = TIER_SETTINGS[tier];
  const lut = useMemo(() => new LookupTexture(bakeGradeData(grade, 32), 32), [grade]);
  useEffect(() => () => lut.dispose(), [lut]);
  const effects = [
    <DepthOfField key="dof" ref={dofRef} target={[0, 1, -3]} focusRange={1.2} bokehScale={0} />,
    s.bloom !== 'off' && (
      <Bloom key="bloom" mipmapBlur levels={s.bloom === 'half' ? 5 : 8} intensity={grade.bloom} luminanceThreshold={0.82} luminanceSmoothing={0.18} />
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
