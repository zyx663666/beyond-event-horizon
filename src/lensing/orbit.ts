import { captureAngle } from './geodesic';
/** Values: u=Rs/r and c*t/Rs. External static chart only. */
export const ORBIT = { width: 1024, height: 320, layers: 48, maxPhi: 3 * Math.PI, minInverseRadius: 1 / 96, maxInverseRadius: 1 / 8, split: 0.25 } as const;
export function orbitAlpha(radius: number, q: number): number {
  const edge = captureAngle(radius);
  return q <= ORBIT.split ? edge * (1 - (1 - q / ORBIT.split) ** 2) : edge + (Math.PI - edge) * ((q - ORBIT.split) / (1 - ORBIT.split)) ** 2;
}
export function orbitQ(radius: number, alpha: number): number {
  const edge = captureAngle(radius);
  return alpha <= edge ? ORBIT.split * (1 - Math.sqrt(Math.max(0, 1 - alpha / edge))) : ORBIT.split + (1 - ORBIT.split) * Math.sqrt((alpha - edge) / (Math.PI - edge));
}
/** Adaptive RK4. Terminal values are sentinels, not an interior spacetime solution. */
export function orbitSamples(radius: number, alpha: number, phiStep = ORBIT.maxPhi / (ORBIT.height - 1), count = ORBIT.height): Float32Array {
  const result = new Float32Array(count * 2);
  let u = 1 / radius, v = u * Math.sqrt(1 - u) / Math.tan(alpha), t = 0, phi = 0, stopped = false;
  const b = Math.sin(alpha) / (u * Math.sqrt(1 - u));
  const force = (x: number) => -x + 1.5 * x * x;
  const timeSlope = (x: number) => 1 / Math.max(1e-8, b * Math.max(0.002, x) ** 2 * Math.max(0.02, 1 - x));
  if (alpha < 1e-9 || alpha > Math.PI - 1e-9) stopped = true;
  for (let row = 0; row < count; row++) {
    const target = row * phiStep;
    while (!stopped && phi < target - 1e-10) {
      const h = Math.min(0.006, Math.max(0.00001, 0.035 * Math.max(u, 0.002) / (Math.abs(v) + 1e-9)), target - phi);
      const av = force(u), bu = u + h * v / 2, bv = v + h * av / 2;
      const cu = u + h * bv / 2, cv = v + h * force(bu) / 2;
      const du = u + h * cv, dv = v + h * force(cu);
      const next = u + h * (v + 2 * bv + 2 * cv + dv) / 6;
      t = Math.min(30000, t + h * (timeSlope(u) + 2 * timeSlope(bu) + 2 * timeSlope(cu) + timeSlope(du)) / 6);
      v += h * (av + 2 * force(bu) + 2 * force(cu) + force(du)) / 6;
      u = next; phi += h;
      if (u <= 0) { u = 0; stopped = true; }
      if (u >= 0.98) { u = 1; stopped = true; }
    }
    result[row * 2] = row === 0 ? 1 / radius : alpha < 1e-9 ? 1 : alpha > Math.PI - 1e-9 ? 0 : Math.max(0, u);
    result[row * 2 + 1] = t;
  }
  return result;
}
import { DataUtils } from 'three';
/** CPU equivalent of shader interpolation, for annotations and error checks. */
export function sampleOrbit(data: Uint16Array, radius: number, alpha: number, phi: number): { u: number; time: number; v: number } {
  const x = Math.max(0, Math.min(ORBIT.width - 1, orbitQ(radius, alpha) * (ORBIT.width - 1)));
  const y = Math.max(0, Math.min(ORBIT.height - 1.00001, phi / ORBIT.maxPhi * (ORBIT.height - 1)));
  const z = Math.max(0, Math.min(ORBIT.layers - 1, (1 / radius - ORBIT.minInverseRadius) / (ORBIT.maxInverseRadius - ORBIT.minInverseRadius) * (ORBIT.layers - 1)));
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), tx = x - ix, ty = y - iy, tz = z - iz;
  const value = (xx: number, yy: number, zz: number, channel: number) => DataUtils.fromHalfFloat(data[((zz * ORBIT.height + yy) * ORBIT.width + xx) * 2 + channel]);
  const row = (yy: number, channel: number) => {
    const layer = (zz: number) => value(ix, yy, zz, channel) * (1 - tx) + value(Math.min(ix+1,ORBIT.width-1), yy, zz, channel) * tx;
    return layer(iz) * (1 - tz) + layer(Math.min(iz+1,ORBIT.layers-1)) * tz;
  };
  const a = row(iy,0), b = row(iy+1,0);
  return { u: a * (1-ty)+b*ty, time: row(iy,1)*(1-ty)+row(iy+1,1)*ty + radius + Math.log(radius-1), v: (b-a)*(ORBIT.height-1)/ORBIT.maxPhi };
}
