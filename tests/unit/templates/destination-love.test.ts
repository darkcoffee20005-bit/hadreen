import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { evaluateTrack } from '@/lib/invite/stage/rig';
import { arcPath, ortho } from '@/templates/destination-love/ortho';
import { barcode, passContent, tearPose } from '@/templates/destination-love/pass';
import {
  altitudeAt,
  chaseQuat,
  destinationPoint,
  dirAt,
  gateQuat,
  GATE_ELEVATION,
  headingAt,
  makeRoute,
  positionAt,
  R,
  toLatLon,
  unit,
} from '@/templates/destination-love/route';
import { buildTrack, END_SHOT, flightProgress, GATE_SHOT, globeQuat, INTRO, introState, planeWorld, shotAt, T_LAND } from '@/templates/destination-love/timeline';

const IST = { lat: 41.008, lon: 28.978 };
const BGD = { lat: 33.315, lon: 44.366 };

describe('destination-love route', () => {
  const route = makeRoute(IST, BGD);

  it('flies the great circle from origin to destination', () => {
    expect(dirAt(route, 0, new Vector3()).distanceTo(unit(IST))).toBeLessThan(1e-9);
    expect(dirAt(route, 1, new Vector3()).distanceTo(unit(BGD))).toBeLessThan(1e-9);
    for (const s of [0.2, 0.5, 0.8]) {
      const d = dirAt(route, s, new Vector3());
      expect(d.length()).toBeCloseTo(1, 9);
      expect(Math.abs(d.dot(route.axis))).toBeLessThan(1e-9); // stays in the great-circle plane
      expect(headingAt(route, s, new Vector3()).dot(d)).toBeCloseTo(0, 9);
    }
    expect(route.virtual).toBe(false);
    expect(route.theta).toBeCloseTo(0.252, 2); // ≈ 1 600 km
  });

  it('takes off and lands at surface height, cruising above it', () => {
    expect(altitudeAt(route, 0)).toBe(0);
    expect(altitudeAt(route, 1)).toBe(0);
    expect(altitudeAt(route, 0.5)).toBeCloseTo(route.hMax, 9);
    expect(positionAt(route, 0.5, new Vector3()).length()).toBeGreaterThan(R + 0.1);
  });

  it('comes in from over the horizon when there is no origin (or the same city)', () => {
    for (const r of [makeRoute(null, BGD), makeRoute(BGD, BGD), makeRoute(null, null)]) {
      expect(r.virtual).toBe(true);
      expect(r.theta).toBeCloseTo(0.62, 6);
      expect(r.b.distanceTo(unit(BGD))).toBeLessThan(1e-9);
      expect(altitudeAt(r, 0)).toBeCloseTo(r.hMax, 9);
    }
  });

  it('computes destination points and lat/lon round trips', () => {
    const p = destinationPoint({ lat: 0, lon: 0 }, Math.PI / 2, Math.PI / 2);
    expect(p.lat).toBeCloseTo(0, 9);
    expect(p.lon).toBeCloseTo(90, 9);
    const back = toLatLon(unit(BGD));
    expect(back.lat).toBeCloseTo(BGD.lat, 9);
    expect(back.lon).toBeCloseTo(BGD.lon, 9);
  });

  it('turns the globe: gate faces the focus city north-up, chase puts the plane on top heading away', () => {
    const g = unit(IST).applyQuaternion(gateQuat(unit(IST)));
    expect(g.x).toBeCloseTo(0, 9);
    expect(Math.asin(g.y)).toBeCloseTo(GATE_ELEVATION, 9);
    const north = new Vector3(0, 1, 0).applyQuaternion(gateQuat(unit(IST)));
    expect(north.x).toBeCloseTo(0, 9);
    expect(north.y).toBeGreaterThan(0.5);
    const p = dirAt(route, 0.4, new Vector3());
    const h = headingAt(route, 0.4, new Vector3());
    const q = chaseQuat(p, h, new Quaternion());
    expect(p.clone().applyQuaternion(q).distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-9);
    expect(h.clone().applyQuaternion(q).distanceTo(new Vector3(0, 0, -1))).toBeLessThan(1e-9);
  });

  it('handles very long and near-antipodal routes', () => {
    const r = makeRoute({ lat: -36.849, lon: 174.763 }, BGD);
    expect(r.theta).toBeGreaterThan(2);
    expect(r.hMax).toBeLessThanOrEqual(R * 0.3);
    const anti = makeRoute({ lat: -33.315, lon: 44.366 - 180 }, BGD);
    expect(Number.isFinite(anti.axis.x) && anti.axis.length()).toBeCloseTo(1, 6);
  });
});

describe('destination-love timeline', () => {
  const route = makeRoute(IST, BGD);

  it('progresses monotonically and lands on the pin at T_LAND', () => {
    let prev = -1;
    for (let t = 0; t <= INTRO; t += 0.05) {
      const s = flightProgress(t);
      expect(s).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = s;
    }
    expect(flightProgress(0)).toBe(0);
    expect(flightProgress(T_LAND)).toBe(1);
    expect(flightProgress(T_LAND - 0.01)).toBeGreaterThan(0.999);
    expect(flightProgress(4, true)).toBeGreaterThan(flightProgress(4)); // already cruising
  });

  it('starts at the gate and ends with the pass risen and the city lit', () => {
    const a = introState(0);
    expect(a.gateToChase).toBe(0);
    expect(a.peek).toBe(1);
    expect(a.rise).toBe(0);
    const z = introState(INTRO);
    expect(z.rise).toBe(1);
    expect(z.cityGlow).toBe(1);
    expect(z.clouds).toBe(0);
    expect(z.sFrame).toBe(1);
  });

  it('keeps the camera on the plane through the chase and lands on the track ends', () => {
    expect(shotAt(route, 0)).toEqual(GATE_SHOT);
    expect(shotAt(route, INTRO)).toEqual(END_SHOT);
    for (const t of [2, 3.5, 5]) {
      const p = planeWorld(route, t);
      const s = shotAt(route, t);
      const cam = new Vector3(...s.position);
      expect(cam.distanceTo(p)).toBeLessThan(1);
      expect(cam.y).toBeGreaterThan(p.y); // behind and above
      expect(p.x).toBeCloseTo(0, 6); // the globe turns, the plane stays on top
    }
    const track = buildTrack(route);
    expect(track[0]!.at).toBe(0);
    expect(track[track.length - 1]!.at).toBeCloseTo(INTRO, 9);
    const mid = evaluateTrack(track, 4.25).position;
    const exact = shotAt(route, 4.25).position;
    mid.forEach((v, i) => expect(v).toBeCloseTo(exact[i]!, 2));
  });

  it('ends with the destination on top of the world', () => {
    const top = route.b.clone().applyQuaternion(globeQuat(route, INTRO));
    expect(top.distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-6);
  });
});

describe('destination-love boarding pass', () => {
  const base = {
    lang: 'ar' as const,
    groom: 'سيف',
    bride: 'ياسمين',
    monogram: 'س & ي',
    guestName: null,
    dateLine: 'الخميس ٣ / ١٢ (ديسمبر) ٢٠٢٦',
    timeLine: '٨:٠٠ مساءً',
    venueName: 'قاعة الضيافة',
    from: { ar: 'إسطنبول', en: 'Istanbul' },
    to: null,
  };

  it('fills the pass from the invitation, with a warm generic passenger', () => {
    const c = passContent(base);
    expect(c.rtl).toBe(true);
    expect(c.passenger.value).toBe('ضيفنا العزيز');
    expect(c.flight.value).toBe('سيف و ياسمين');
    expect(c.date.value).toBe(base.dateLine);
    expect(c.gate.value).toBe('قاعة الضيافة');
    expect(c.from).toBe('إسطنبول');
    expect(c.to).toBe('بغداد');
    const en = passContent({ ...base, lang: 'en', guestName: '  The Karims ' });
    expect(en.rtl).toBe(false);
    expect(en.passenger.value).toBe('The Karims');
    expect(en.flight.value).toBe('سيف & ياسمين');
    expect(en.from).toBe('Istanbul');
  });

  it('draws a deterministic barcode', () => {
    expect(barcode('سيف و ياسمين')).toEqual(barcode('سيف و ياسمين'));
    expect(barcode('a')).not.toEqual(barcode('b'));
    expect(barcode('x', 20).every((w) => w >= 1 && w <= 4)).toBe(true);
  });

  it('tears the stub toward the guest, then lets it fall away', () => {
    const still = tearPose(-1, -1);
    expect(still.visible && still.hingeY === 0).toBe(true);
    const peel = tearPose(0.2, -1);
    expect(peel.hingeY).toBeGreaterThan(0.4); // left stub swings toward the camera
    const right = tearPose(0.2, 1);
    expect(right.hingeY).toBeLessThan(-0.4);
    const fall = tearPose(1.2, -1);
    expect(fall.position[1]).toBeLessThan(-1);
    expect(fall.opacity).toBeLessThan(1);
    expect(tearPose(2, -1).visible).toBe(false);
  });
});

describe('destination-love 2D globe', () => {
  it('projects the route onto the visible face of the orthographic globe', () => {
    const route = makeRoute(IST, BGD);
    const o = ortho(dirAt(route, 0.5, new Vector3()), 100, 100, 86, GATE_ELEVATION);
    expect(o.dots.length).toBeGreaterThan(1000);
    expect(o.dots.startsWith('M')).toBe(true);
    const mid = o.project(dirAt(route, 0.5, new Vector3()));
    expect(mid.x).toBeCloseTo(100, 6);
    expect(mid.y).toBeCloseTo(100, 6);
    const arc = arcPath(route, o);
    expect(arc.d.split('L').length).toBe(49);
    expect(arc.start.x).toBeGreaterThan(arc.end.x - 200);
  });
});
