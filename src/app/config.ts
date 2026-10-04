export type QualityName = 'preview' | 'target' | 'ultra';
export interface QualityProfile {
  maxPixelRatio: number;
  maxWidth: number;
  maxHeight: number;
  starCount: number;
  diskSegments: number;
  noiseOctaves: number;
  bloom: boolean;
  smaa: boolean;
}
export const QUALITY_PROFILES: Record<QualityName, Readonly<QualityProfile>> = {
  preview: { maxPixelRatio: 1, maxWidth: 1280, maxHeight: 720, starCount: 4500, diskSegments: 192, noiseOctaves: 3, bloom: true, smaa: false },
  target: { maxPixelRatio: 1.5, maxWidth: 2560, maxHeight: 1440, starCount: 14000, diskSegments: 384, noiseOctaves: 5, bloom: true, smaa: true },
  ultra: { maxPixelRatio: 2, maxWidth: 3840, maxHeight: 2160, starCount: 24000, diskSegments: 512, noiseOctaves: 6, bloom: true, smaa: true },
};

export interface VisualConfig {
  qualityName: QualityName;
  quality: QualityProfile;
  blackHole: { radius: number };
  disk: { innerRadius: number; outerRadius: number; intensity: number; temperature: number; rotationSpeed: number; tilt: number; hotColor: string; coolColor: string; thickness: number; beta: number; turbulence: number };
  optics: { enabled: boolean; intensity: number; width: number; halo: number; color: string };
  stars: { seed: number; radius: number; brightness: number; galaxyIntensity: number };
  camera: { fov: number; distance: number; approach: number; elevation: number; period: number; elevationRange: number; lensTightening: number };
  output: { exposure: number; bloomStrength: number; bloomRadius: number; bloomThreshold: number };
  observation: { schwarzschildRadius: number; signalSpeed: number; relayDelay: number; beacon: [number, number, number]; maxZoom: number };
  lensing: { enabled: boolean; cubeSize: number; frequency: boolean; orders: boolean };
  journey: { enabled: boolean; duration: number; farRadius: number; nearRadius: number };
  debug: boolean;
  frozenTime: number | null;
}

/** URL options remain developer entry points; observation controls live in ObserverRig. */
export function createConfig(search = ''): VisualConfig {
  const params = new URLSearchParams(search);
  const requested = params.get('quality') ?? 'target';
  if (!Object.hasOwn(QUALITY_PROFILES, requested)) throw new Error(`Unknown quality: ${requested}`);
  const qualityName = requested as QualityName;
  const time = params.get('t');
  const config: VisualConfig = {
    qualityName, quality: { ...QUALITY_PROFILES[qualityName] },
    blackHole: { radius: 1.24 },
    disk: { innerRadius: 1.48, outerRadius: 4.8, intensity: 2.8, temperature: 6500, rotationSpeed: 0.3, tilt: -0.08, hotColor: '#ffecd0', coolColor: '#bf4424', thickness: 0.055, beta: 0.24, turbulence: 0.85 },
    optics: { enabled: params.get('rim') !== '0', intensity: 1.65, width: 0.013, halo: 0.13, color: '#ffc98d' },
    stars: { seed: 760, radius: 100, brightness: 1.1, galaxyIntensity: 0.045 },
    camera: { fov: 46, distance: 14.4, approach: 2.3, elevation: 0.24, period: 180, elevationRange: 0.18, lensTightening: 4 },
    output: { exposure: 1.0, bloomStrength: 0.07, bloomRadius: 0.32, bloomThreshold: 1.15 },
    observation: { schwarzschildRadius: 1.24 / (1.5 * Math.sqrt(3)), signalSpeed: 4, relayDelay: 0.4, beacon: [5.5, 2.2, 0], maxZoom: 1.6 },
    lensing: { enabled: params.get('lensing') !== '0', cubeSize: qualityName === 'preview' ? 512 : 2048, frequency: params.get('frequency') !== '0', orders: params.get('orders') === '1' },
    journey: { enabled: params.get('journey') !== 'orbit', duration: 300, farRadius: 32, nearRadius: 7.2 },
    debug: params.get('debug') === '1', frozenTime: time === null ? null : Number(time),
  };
  validateConfig(config);
  return config;
}

export function validateConfig(c: VisualConfig): void {
  const positive = (name: string, n: number) => {
    if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} must be positive and finite`);
  };
  positive('blackHole.radius', c.blackHole.radius);
  for (const key of ['duration', 'farRadius', 'nearRadius'] as const) positive(`journey.${key}`, c.journey[key]);
  if (c.journey.nearRadius <= c.disk.outerRadius * 1.4 || c.journey.farRadius <= c.journey.nearRadius || c.journey.farRadius / c.observation.schwarzschildRadius > 96 || c.journey.nearRadius / c.observation.schwarzschildRadius < 8) throw new Error('Journey must remain in the external transfer-table domain');
  for (const key of ['schwarzschildRadius', 'signalSpeed', 'relayDelay', 'maxZoom'] as const) positive(`observation.${key}`, c.observation[key]);
  if (c.observation.schwarzschildRadius >= c.blackHole.radius || c.observation.maxZoom < 1 || c.observation.maxZoom > 3 || !c.observation.beacon.every(Number.isFinite) || Math.hypot(...c.observation.beacon) <= c.disk.outerRadius) throw new Error('Invalid observer laboratory configuration');
  positive('disk.innerRadius', c.disk.innerRadius);
  positive('disk.outerRadius', c.disk.outerRadius);
  if (c.disk.innerRadius < 3 * c.observation.schwarzschildRadius) throw new Error('Stable Schwarzschild disk requires inner radius >= 3 Rs');
  if (c.disk.innerRadius <= c.blackHole.radius || c.disk.outerRadius <= c.disk.innerRadius) throw new Error('Disk radii must satisfy core < inner < outer');
  for (const key of ['intensity', 'temperature', 'rotationSpeed'] as const) positive(`disk.${key}`, c.disk[key]);
  if (!Number.isFinite(c.disk.tilt)) throw new Error('disk.tilt must be finite');
  if (!Number.isFinite(c.disk.thickness) || c.disk.thickness < 0 || c.disk.thickness > 0.2) throw new Error('Disk thickness must be in [0, 0.2]');
  if (!Number.isFinite(c.disk.beta) || c.disk.beta < 0 || c.disk.beta > 0.5) throw new Error('Approximate orbital beta must be in [0, 0.5]');
  if (!Number.isFinite(c.disk.turbulence) || c.disk.turbulence < 0 || c.disk.turbulence > 1) throw new Error('Turbulence must be in [0, 1]');
  for (const key of ['intensity', 'width', 'halo'] as const) positive(`optics.${key}`, c.optics[key]);
  if (c.optics.width > 0.1 || c.optics.halo > 1) throw new Error('Optical proxy must remain a thin rim');
  for (const key of ['maxPixelRatio', 'maxWidth', 'maxHeight', 'starCount', 'diskSegments', 'noiseOctaves'] as const) positive(`quality.${key}`, c.quality[key]);
  for (const key of ['starCount', 'diskSegments', 'noiseOctaves'] as const) {
    if (!Number.isInteger(c.quality[key])) throw new Error(`quality.${key} must be an integer`);
  }
  if (c.quality.noiseOctaves > 8) throw new Error('Invalid shader quality budget');
  for (const key of ['fov', 'distance', 'period', 'elevation'] as const) positive(`camera.${key}`, c.camera[key]);
  if (c.camera.fov >= 120 || c.camera.elevation >= 1.2 || !Number.isFinite(c.camera.approach) || c.camera.approach < 0 || c.camera.distance - c.camera.approach <= c.disk.outerRadius * 1.4) throw new Error('Camera must remain outside the disk');
  if (!Number.isFinite(c.camera.elevationRange) || c.camera.elevationRange < 0 || c.camera.elevation + c.camera.elevationRange >= 1.2 || c.camera.elevation <= 0.45 * c.camera.elevationRange + Math.abs(c.disk.tilt)) throw new Error('Camera elevation must keep a clear view above the disk');
  if (!Number.isFinite(c.camera.lensTightening) || c.camera.lensTightening < 0 || c.camera.fov - c.camera.lensTightening < 20) throw new Error('Invalid lens range');
  positive('stars.radius', c.stars.radius);
  positive('stars.brightness', c.stars.brightness);
  positive('stars.galaxyIntensity', c.stars.galaxyIntensity);
  if (!Number.isInteger(c.stars.seed) || c.stars.radius <= c.camera.distance + c.disk.outerRadius) throw new Error('Invalid star catalog');
  for (const key of ['exposure', 'bloomStrength', 'bloomRadius', 'bloomThreshold'] as const) positive(`output.${key}`, c.output[key]);
  if (c.output.bloomRadius > 1) throw new Error('Bloom radius must not exceed 1');
  if (![c.disk.hotColor, c.disk.coolColor, c.optics.color].every(color => /^#[0-9a-f]{6}$/i.test(color))) throw new Error('Colors must be six-digit hex strings');
  if (c.frozenTime !== null && (!Number.isFinite(c.frozenTime) || c.frozenTime < 0 || c.frozenTime > 86400)) throw new Error('t must be between 0 and 86400 seconds');
}
