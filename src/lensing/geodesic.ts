/** Schwarzschild null orbits in u=Rs/r, in a static local observer frame. */
export const CRITICAL_IMPACT = 1.5 * Math.sqrt(3);
export function captureAngle(radiusInRs: number): number {
  if (!(radiusInRs > 1.5)) throw new Error('External photon-sphere observer required');
  return Math.asin(CRITICAL_IMPACT / radiusInRs * Math.sqrt(1 - 1 / radiusInRs));
}

/** Azimuth of the ray at infinity; null denotes capture. RK4 in orbital azimuth.
 * Camera alpha is measured from the inward radial direction. No time-of-flight is solved.
 */
export function escapeAzimuth(radiusInRs: number, alpha: number, step = 0.012): number | null {
  if (alpha <= captureAngle(radiusInRs)) return null;
  if (alpha >= Math.PI - 1e-8) return 0;
  let u = 1 / radiusInRs;
  let v = u * Math.sqrt(1 - u) / Math.tan(alpha);
  const force = (x: number) => -x + 1.5 * x * x;
  let phi = 0;
  for (let i = 0; i < 10000; i++) {
    const a = force(u);
    const bU = v + step * a / 2, bV = force(u + step * v / 2);
    const cU = v + step * bV / 2, cV = force(u + step * bU / 2);
    const dU = v + step * cV, dV = force(u + step * cU);
    const nextU = u + step * (v + 2 * bU + 2 * cU + dU) / 6;
    const nextV = v + step * (a + 2 * bV + 2 * cV + dV) / 6;
    if (nextU <= 0) return phi + step * u / (u - nextU);
    if (nextU >= 1 || !Number.isFinite(nextU)) throw new Error('Numerical capture of an escaping ray');
    u = nextU; v = nextV; phi += step;
  }
  throw new Error('Geodesic integration did not converge');
}

export const LUT = { width: 1536, height: 80, minInverseRadius: 1 / 96, maxInverseRadius: 1 / 8, angularEpsilon: 0.00002 } as const;
export function alphaForColumn(radiusInRs: number, q: number): number {
  const edge = captureAngle(radiusInRs) + LUT.angularEpsilon;
  return edge + (Math.PI - edge) * q * q;
}

/** Same unwrapped-azimuth interpolation as the GPU. Never interpolate sin/cos across windings. */
export function sampleTransfer(data: Float32Array, radiusInRs: number, alpha: number): number | null {
  const edge = captureAngle(radiusInRs);
  if (alpha <= edge) return null;
  const inverse = 1 / radiusInRs;
  if (inverse < LUT.minInverseRadius - 1e-9 || inverse > LUT.maxInverseRadius + 1e-9) throw new Error('Observer outside transfer-table domain');
  const q = Math.sqrt(Math.max(0, (alpha - edge - LUT.angularEpsilon) / (Math.PI - edge - LUT.angularEpsilon)));
  const x = Math.min(LUT.width - 1, q * (LUT.width - 1));
  const y = Math.max(0, Math.min(LUT.height - 1, (inverse - LUT.minInverseRadius) / (LUT.maxInverseRadius - LUT.minInverseRadius) * (LUT.height - 1)));
  const x0 = Math.floor(x), x1 = Math.min(x0 + 1, LUT.width - 1), y0 = Math.floor(y), y1 = Math.min(y0 + 1, LUT.height - 1);
  const a = data[y0 * LUT.width + x0] * (1 - x + x0) + data[y0 * LUT.width + x1] * (x - x0);
  const b = data[y1 * LUT.width + x0] * (1 - x + x0) + data[y1 * LUT.width + x1] * (x - x0);
  return a * (1 - y + y0) + b * (y - y0);
}
