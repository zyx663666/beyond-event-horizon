import { Color, Uniform, Vector3 } from 'three';
import type { VisualConfig } from '../app/config';

export function createFrameUniforms() {
  return { uTime: new Uniform(0), uPixelRatio: new Uniform(1) };
}
export type FrameUniforms = ReturnType<typeof createFrameUniforms>;
export function createStarUniforms(config: VisualConfig, frame: FrameUniforms) {
  return { uPixelRatio: frame.uPixelRatio, uBrightness: new Uniform(config.stars.brightness) };
}
export function createSkyUniforms(config: VisualConfig) {
  return { uGalaxyIntensity: new Uniform(config.stars.galaxyIntensity) };
}
export function createDiskUniforms(config: VisualConfig, frame: FrameUniforms) {
  return {
    uTime: frame.uTime,
    uInnerRadius: new Uniform(config.disk.innerRadius),
    uOuterRadius: new Uniform(config.disk.outerRadius),
    uIntensity: new Uniform(config.disk.intensity),
    uRotationSpeed: new Uniform(config.disk.rotationSpeed),
    uBeta: new Uniform(config.disk.beta),
    uTurbulence: new Uniform(config.disk.turbulence),
    uObserverLocal: new Uniform(new Vector3()),
    uHotColor: new Uniform(new Color(config.disk.hotColor)),
    uCoolColor: new Uniform(new Color(config.disk.coolColor)),
  };
}

export function createRimUniforms(config: VisualConfig) {
  return {
    uIntensity: new Uniform(config.optics.intensity), uWidth: new Uniform(config.optics.width),
    uHalo: new Uniform(config.optics.halo), uColor: new Uniform(new Color(config.optics.color)),
    uInnerRadius: new Uniform(config.disk.innerRadius), uOuterRadius: new Uniform(config.disk.outerRadius),
    uDiskNormal: new Uniform(new Vector3(-Math.sin(config.disk.tilt), Math.cos(config.disk.tilt), 0)),
    uDiskHeight: new Uniform(config.disk.thickness),
  };
}
