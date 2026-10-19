'use client';

import { useEffect, useMemo } from 'react';
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';

/**
 * A pointed (Islamic) arch drawn as a gold tube: two circular arcs meeting at an apex,
 * standing on two straight jambs.
 */
export function archCurve(width: number, height: number, segments = 48): Vector3[] {
  const half = width / 2;
  const spring = height * 0.55; // where the arcs start
  const apex = height;
  // Two-centred pointed arch: each arc's centre sits on the springing line, on the far side of
  // the axis, with the radius that makes both arcs meet exactly at the apex.
  const radius = (half * half + (apex - spring) ** 2) / (2 * half);
  const points: Vector3[] = [new Vector3(-half, 0, 0), new Vector3(-half, spring, 0)];
  const left = new Vector3(-half + radius, spring, 0);
  const right = new Vector3(half - radius, spring, 0);
  const steps = segments / 2;
  const angleTop = (c: Vector3) => Math.atan2(apex - c.y, 0 - c.x);
  const aStartL = Math.PI;
  const aEndL = angleTop(left);
  for (let i = 1; i <= steps; i++) {
    const a = aStartL + ((aEndL - aStartL) * i) / steps;
    points.push(new Vector3(left.x + Math.cos(a) * radius, left.y + Math.sin(a) * radius, 0));
  }
  const aStartR = angleTop(right);
  for (let i = 1; i <= steps; i++) {
    const a = aStartR + ((0 - aStartR) * i) / steps;
    points.push(new Vector3(right.x + Math.cos(a) * radius, right.y + Math.sin(a) * radius, 0));
  }
  points.push(new Vector3(half, 0, 0));
  return points;
}

export function GoldArch({
  width = 4.2,
  height = 5.6,
  thickness = 0.05,
  color = '#C9A96E',
  emissive = '#000000',
  emissiveIntensity = 0,
  materialRef,
}: {
  width?: number;
  height?: number;
  thickness?: number;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  materialRef?: React.Ref<import('three').MeshStandardMaterial>;
}) {
  const geometries = useMemo(() => {
    const outer = new TubeGeometry(new CatmullRomCurve3(archCurve(width, height), false, 'centripetal'), 160, thickness, 10, false);
    const inner = new TubeGeometry(
      new CatmullRomCurve3(archCurve(width * 0.9, height * 0.94), false, 'centripetal'),
      160,
      thickness * 0.4,
      8,
      false,
    );
    return [outer, inner];
  }, [width, height, thickness]);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  return (
    <group position={[0, -height / 2, 0]}>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g} castShadow position={[0, i ? height * 0.012 : 0, i ? 0.02 : 0]}>
          <meshStandardMaterial
            ref={i === 0 ? materialRef : undefined}
            color={color}
            metalness={1}
            roughness={0.28}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      ))}
    </group>
  );
}
