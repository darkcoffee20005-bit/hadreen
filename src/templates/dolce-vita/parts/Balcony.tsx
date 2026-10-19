'use client';

import { useEffect, useMemo } from 'react';
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  LatheGeometry,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type Texture,
} from 'three';
import { mixHex } from '@/lib/invite/stage/color';
import { balusterProfile, leafGeometry, pedestalProfile, roseGeometry, vaseProfile, worldBoxUV } from '../geometry';
import { BALCONY_HALF, RAIL_DEPTH, RAIL_TOP, roseCluster, TABLE, TABLE_TOP, type Leaf, type Rose, type V3 } from '../world';

export const POSTS = [-BALCONY_HALF, -3.1, 3.3, BALCONY_HALF];

/** Where the roses grow: round the card, along the rail, in the urn by the table and in the vase. */
export function roseBeds(low: boolean): { roses: Rose[]; leaves: Leaf[] } {
  const beds: [V3, number, number, number, number?, number?][] = [
    // Framing the card.
    [[-0.37, RAIL_TOP + 0.02, 0.03], 0.15, 8, 101, 0.75],
    [[0.39, RAIL_TOP + 0.02, 0.02], 0.14, 7, 102, 0.75],
    [[0.04, RAIL_TOP + 0.05, -0.21], 0.12, 5, 103, 0.6],
    // Spilling over the rail's front for the crane shot.
    [[-1.25, RAIL_TOP - 0.02, 0.06], 0.32, 12, 104, 0.6],
    [[-2.3, RAIL_TOP - 0.02, 0.04], 0.28, 10, 105, 0.6],
    [[1.05, RAIL_TOP - 0.02, 0.05], 0.3, 11, 106, 0.6],
    [[2.4, RAIL_TOP - 0.02, 0.04], 0.26, 9, 107, 0.6],
    [[-4.1, RAIL_TOP - 0.02, 0.04], 0.3, 10, 108, 0.6],
    [[4.3, RAIL_TOP - 0.02, 0.04], 0.3, 10, 109, 0.6],
    // The urn on the post beside the table.
    [[3.3, RAIL_TOP + 0.42, 0.02], 0.3, 12, 110, 0.85, 1.4],
    // Bouquet in the bud vase on the table.
    [[TABLE[0] - 0.23, TABLE_TOP + 0.2, TABLE[2] - 0.14], 0.06, 4, 111, 0.9, 0.8],
  ];
  const roses: Rose[] = [];
  const leaves: Leaf[] = [];
  for (const [c, r, n, seed, squash, size] of beds) {
    const k = low ? Math.max(2, Math.round(n * 0.6)) : n;
    const b = roseCluster(c, r, k, seed, squash ?? 0.7, size ?? 1);
    roses.push(...b.roses);
    leaves.push(...b.leaves);
  }
  return { roses, leaves };
}

const ROSE_TONES = (rose: string) => [rose, mixHex(rose, '#FFFFFF', 0.45), mixHex(rose, '#C9566F', 0.35), '#F6E7DA'];

export function Balcony({ stone, stoneMap, cotto, rose, powder, gold, low, shadows }: { stone: string; stoneMap: Texture | null; cotto: Texture | null; rose: string; powder: string; gold: string; low: boolean; shadows: boolean }) {
  const parts = useMemo(() => {
    const stoneMat = new MeshStandardMaterial({ color: stone, map: stoneMap, roughness: 0.92 });
    const floorMat = new MeshStandardMaterial({ map: cotto, roughness: 0.85 });
    if (cotto) cotto.repeat.set(5, 3.6);
    const len = BALCONY_HALF * 2 + 0.3;
    const box = (w: number, h: number, d: number) => worldBoxUV(new BoxGeometry(w, h, d), w, h, d, 0.9);
    const rail = box(len, 0.09, RAIL_DEPTH).translate(0, RAIL_TOP - 0.045, 0);
    const railUnder = box(len, 0.05, RAIL_DEPTH - 0.09).translate(0, RAIL_TOP - 0.115, 0);
    const plinth = box(len, 0.14, RAIL_DEPTH - 0.04).translate(0, 0.07, 0);
    const wall = box(len + 2, 3.2, 0.4).translate(0, -1.6, -0.1);
    const floor = new PlaneGeometry(len + 2, 9).rotateX(-Math.PI / 2).translate(0, 0, 4.4);
    const post = box(0.38, RAIL_TOP + 0.04, 0.42).translate(0, (RAIL_TOP + 0.04) / 2, 0);
    const postCap = box(0.46, 0.06, 0.5).translate(0, RAIL_TOP + 0.07, 0);

    // Balusters between the posts.
    const h = RAIL_TOP - 0.14 - 0.14;
    const baluster = new LatheGeometry(balusterProfile(), low ? 8 : 12).scale(0.42, h, 0.42).translate(0, 0.14, 0);
    const xs: number[] = [];
    for (let x = -BALCONY_HALF + 0.3; x <= BALCONY_HALF - 0.3; x += 0.21) {
      if (POSTS.some((p) => Math.abs(p - x) < 0.3)) continue;
      xs.push(x);
    }
    const balusters = new InstancedMesh(baluster, stoneMat, xs.length);
    const o = new Object3D();
    xs.forEach((x, i) => {
      o.position.set(x, 0, 0);
      o.updateMatrix();
      balusters.setMatrixAt(i, o.matrix);
    });
    balusters.castShadow = shadows;
    balusters.receiveShadow = shadows;
    const posts = new InstancedMesh(post, stoneMat, POSTS.length);
    const caps = new InstancedMesh(postCap, stoneMat, POSTS.length);
    POSTS.forEach((x, i) => {
      o.position.set(x, 0, 0);
      o.updateMatrix();
      posts.setMatrixAt(i, o.matrix);
      caps.setMatrixAt(i, o.matrix);
    });
    posts.castShadow = caps.castShadow = shadows;

    // Terracotta urn on the post by the table.
    const urn = new LatheGeometry(vaseProfile(), 16).scale(0.62, 0.36, 0.62);
    const urnMat = new MeshStandardMaterial({ color: '#C8714F', roughness: 0.8 });

    // Bistro table: marble top on an iron pedestal; a powder-blue bud vase.
    const top = new CylinderGeometry(0.36, 0.36, 0.028, 40).translate(0, TABLE_TOP - 0.014, 0);
    const marble = new MeshStandardMaterial({ color: '#F7F3EE', roughness: 0.28, map: stoneMap });
    const pedestal = new LatheGeometry(pedestalProfile(), 20).scale(1.0, TABLE_TOP - 0.028, 1.0);
    const iron = new MeshStandardMaterial({ color: '#2B3A4A', roughness: 0.45, metalness: 0.6 });
    const vase = new LatheGeometry(vaseProfile(), 20).scale(0.13, 0.17, 0.13);
    const ceramic = new MeshStandardMaterial({ color: powder, roughness: 0.18, metalness: 0.05 });
    const brass = new MeshStandardMaterial({ color: gold, roughness: 0.3, metalness: 0.9 });

    // Roses and leaves.
    const beds = roseBeds(low);
    const roseGeo = roseGeometry(low ? 2 : 4);
    const roseMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: DoubleSide });
    const roses = new InstancedMesh(roseGeo, roseMat, beds.roses.length);
    const tones = ROSE_TONES(rose);
    const up = new Vector3(0, 1, 0);
    const fwd = new Vector3(0, 0, 1);
    const dir = new Vector3();
    const q = new Quaternion();
    const spin = new Quaternion();
    const c = new Color();
    beds.roses.forEach((r, i) => {
      dir.set(...r.facing).normalize();
      q.setFromUnitVectors(up, dir);
      spin.setFromAxisAngle(up, i * 2.1);
      o.quaternion.copy(q).multiply(spin);
      o.position.set(...r.position);
      o.scale.setScalar(r.scale);
      o.updateMatrix();
      roses.setMatrixAt(i, o.matrix);
      roses.setColorAt(i, c.set(tones[r.tone % tones.length]!));
    });
    roses.castShadow = shadows;
    const leafMat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, side: DoubleSide });
    const leaves = new InstancedMesh(leafGeometry(), leafMat, beds.leaves.length);
    beds.leaves.forEach((l, i) => {
      dir.set(...l.facing).normalize();
      q.setFromUnitVectors(fwd, dir);
      spin.setFromAxisAngle(fwd, l.spin);
      o.quaternion.copy(q).multiply(spin);
      o.position.set(...l.position);
      o.scale.setScalar(l.scale);
      o.updateMatrix();
      leaves.setMatrixAt(i, o.matrix);
      leaves.setColorAt(i, c.set(mixHex('#3F6B3E', '#5E8A4E', (i * 0.618) % 1)));
    });
    leaves.castShadow = shadows;

    return {
      stoneMat, floorMat, rail, railUnder, plinth, wall, floor, balusters, posts, caps, urn, urnMat,
      top, marble, pedestal, iron, vase, ceramic, brass, roses, leaves,
    };
  }, [stone, stoneMap, cotto, rose, powder, gold, low, shadows]);

  useEffect(
    () => () => {
      for (const v of Object.values(parts)) {
        if (v instanceof InstancedMesh) {
          v.geometry.dispose();
          v.dispose();
        } else (v as { dispose?: () => void }).dispose?.();
      }
      (parts.roses.material as MeshStandardMaterial).dispose();
      (parts.leaves.material as MeshStandardMaterial).dispose();
    },
    [parts],
  );

  const p = parts;
  return (
    <group>
      <mesh geometry={p.floor} material={p.floorMat} receiveShadow={shadows} />
      <mesh geometry={p.wall} material={p.stoneMat} />
      <mesh geometry={p.rail} material={p.stoneMat} castShadow={shadows} receiveShadow={shadows} />
      <mesh geometry={p.railUnder} material={p.stoneMat} />
      <mesh geometry={p.plinth} material={p.stoneMat} receiveShadow={shadows} />
      <primitive object={p.balusters} />
      <primitive object={p.posts} />
      <primitive object={p.caps} />
      <mesh geometry={p.urn} material={p.urnMat} position={[3.3, RAIL_TOP + 0.1, 0]} castShadow={shadows} />
      <group position={[TABLE[0], 0, TABLE[2]]}>
        <mesh geometry={p.top} material={p.marble} castShadow={shadows} receiveShadow={shadows} />
        <mesh geometry={p.pedestal} material={p.iron} castShadow={shadows} />
        <mesh geometry={p.vase} material={p.ceramic} position={[-0.23, TABLE_TOP, -0.14]} castShadow={shadows} />
      </group>
      <primitive object={p.roses} />
      <primitive object={p.leaves} />
    </group>
  );
}
