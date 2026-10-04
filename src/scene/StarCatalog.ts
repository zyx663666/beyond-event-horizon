import { Color } from 'three';

/** Data is independent of Points and can later feed a lensing environment map. */
export function createStarCatalog(count: number, seed: number, radius: number) {
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const brightness = new Float32Array(count);
  const palette = ['#a9c8ff', '#e1eaff', '#fff4db', '#ffd2a0'].map(hex => new Color(hex));
  for (let i = 0; i < count; i++) {
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - z * z);
    positions.set([Math.cos(angle) * ring * radius, z * radius, Math.sin(angle) * ring * radius], i * 3);
    const luminosity = random();
    const bright = luminosity > 0.985;
    sizes[i] = bright ? 3.5 + random() * 2 : 1.2 + random() * 1.5;
    brightness[i] = bright ? 1.2 + random() * 1.8 : 0.1 + luminosity * luminosity * 0.65;
    palette[Math.floor(random() * palette.length)].toArray(colors, i * 3);
  }
  return { positions, colors, sizes, brightness };
}
