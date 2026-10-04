import { Matrix4, Vector3 } from 'three';
import type { VisualConfig } from '../app/config';
import type { CameraDriver, ObserverState } from '../core/contracts';

// One continuous observational move: establish, graze, inspect, rise, return.
// Values are normalized art direction, not a dynamical orbital solution.
const KEYS = [
  { at: 0, dolly: 0, azimuth: -0.34, height: 0, lens: 0 },
  { at: 0.24, dolly: 0.63, azimuth: -0.12, height: -0.4, lens: 0.35 },
  { at: 0.47, dolly: 1, azimuth: 0.25, height: 0.2, lens: 1 },
  { at: 0.73, dolly: 0.5, azimuth: 0.5, height: 1, lens: 0.35 },
  { at: 1, dolly: 0, azimuth: -0.34, height: 0, lens: 0 },
];
export class CameraTrajectory implements CameraDriver {
  private readonly target = new Vector3(0, 0.08, 0);
  private readonly up = new Vector3(0, 1, 0);
  private readonly matrix = new Matrix4();
  private readonly before = new Vector3();
  private readonly after = new Vector3();
  constructor(private readonly config: VisualConfig['camera']) {}

  private parametersAt(time: number) {
    const phase = ((time / this.config.period) % 1 + 1) % 1;
    const index = Math.min(KEYS.length - 2, KEYS.findIndex((key, i) => i < KEYS.length - 1 && phase >= key.at && phase < KEYS[i + 1].at));
    const from = KEYS[Math.max(0, index)], to = KEYS[Math.max(0, index) + 1];
    const t = (phase - from.at) / (to.at - from.at);
    const ease = t * t * t * (t * (t * 6 - 15) + 10);
    const mix = (a: number, b: number) => a + (b - a) * ease;
    return { dolly: mix(from.dolly, to.dolly), azimuth: mix(from.azimuth, to.azimuth), height: mix(from.height, to.height), lens: mix(from.lens, to.lens) };
  }
  private positionAt(time: number, position: Vector3): void {
    const p = this.parametersAt(time);
    const distance = this.config.distance - this.config.approach * p.dolly;
    const elevation = this.config.elevation + this.config.elevationRange * p.height;
    position.set(Math.sin(p.azimuth) * Math.cos(elevation) * distance, Math.sin(elevation) * distance, Math.cos(p.azimuth) * Math.cos(elevation) * distance);
  }
  fieldOfViewAt(time: number): number {
    return this.config.fov - this.config.lensTightening * this.parametersAt(time).lens;
  }
  sample(time: number, observer: ObserverState): void {
    this.positionAt(time, observer.position);
    this.matrix.lookAt(observer.position, this.target, this.up);
    observer.orientation.setFromRotationMatrix(this.matrix);
    this.positionAt(time - 0.01, this.before);
    this.positionAt(time + 0.01, this.after);
    observer.velocity.subVectors(this.after, this.before).multiplyScalar(50);
  }
}
