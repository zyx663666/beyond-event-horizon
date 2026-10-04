import { Matrix4, Vector3 } from 'three';
import type { CameraDriver, ObserverState } from '../core/contracts';
import type { VisualConfig } from '../app/config';

// A five-minute shot plan, not story beats or a free-fall orbit. Ends at a stable external station.
const KEYS = [
  { at: 0, progress: 0, azimuth: -0.34, elevation: 0.24, fov: 46 },
  { at: 0.22, progress: 0.24, azimuth: -0.20, elevation: 0.28, fov: 46 },
  { at: 0.45, progress: 0.565, azimuth: -0.05, elevation: 0.24, fov: 50 },
  { at: 0.75, progress: 0.855, azimuth: 0.14, elevation: 0.20, fov: 58 },
  { at: 0.94, progress: 1, azimuth: 0.23, elevation: 0.24, fov: 66 },
  { at: 1, progress: 1, azimuth: 0.23, elevation: 0.24, fov: 66 },
];
export class ApproachTrajectory implements CameraDriver {
  private readonly matrix = new Matrix4();
  private readonly target = new Vector3(0, 0.08, 0);
  private readonly up = new Vector3(0, 1, 0);
  private readonly before = new Vector3();
  private readonly after = new Vector3();
  constructor(private readonly config: VisualConfig['journey']) {}
  private at(time: number) {
    const phase = Math.max(0, Math.min(1, time / this.config.duration));
    const i = Math.min(KEYS.length - 2, Math.max(0, KEYS.findIndex((key, index) => index < KEYS.length - 1 && phase >= key.at && phase < KEYS[index + 1].at)));
    if (phase >= 1) return KEYS[KEYS.length - 1];
    const a = KEYS[i], b = KEYS[i + 1], t = (phase - a.at) / (b.at - a.at);
    const s = t * t * t * (t * (t * 6 - 15) + 10);
    const mix = (x: number, y: number) => x + (y - x) * s;
    return { progress: mix(a.progress, b.progress), azimuth: mix(a.azimuth, b.azimuth), elevation: mix(a.elevation, b.elevation), fov: mix(a.fov, b.fov) };
  }
  private positionAt(time: number, result: Vector3): void {
    const p = this.at(time), r = this.config.farRadius + (this.config.nearRadius - this.config.farRadius) * p.progress;
    result.set(Math.sin(p.azimuth) * Math.cos(p.elevation) * r, Math.sin(p.elevation) * r, Math.cos(p.azimuth) * Math.cos(p.elevation) * r);
  }
  fieldOfViewAt(time: number): number { return this.at(time).fov; }
  sample(time: number, observer: ObserverState): void {
    this.positionAt(time, observer.position);
    this.matrix.lookAt(observer.position, this.target, this.up);
    observer.orientation.setFromRotationMatrix(this.matrix);
    this.positionAt(time - 0.01, this.before); this.positionAt(time + 0.01, this.after);
    observer.velocity.subVectors(this.after, this.before).multiplyScalar(50);
  }
}
