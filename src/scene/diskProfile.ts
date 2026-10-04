/** Normalized zero-torque, Newtonian thin-disk flux envelope. Not a GR disk solver. */
export function diskEmission(radius: number, innerRadius: number): number {
  if (radius <= innerRadius) return 0;
  const x = innerRadius / radius;
  return Math.pow(x, 3) * (1 - Math.sqrt(x)) / (Math.pow(36 / 49, 3) / 7);
}

/** Perspective tangent radius on a plane through a spherical occluder's center. */
export function projectedRimRadius(radius: number, distance: number): number {
  if (distance <= radius) throw new Error('Optical proxy requires an external observer');
  return radius / Math.sqrt(1 - (radius / distance) ** 2);
}
