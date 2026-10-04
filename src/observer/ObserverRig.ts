import { Euler, Quaternion } from 'three';
import type { VisualConfig } from '../app/config';
import type { FrameState, ObserverState } from '../core/contracts';
import { CameraTrajectory } from '../camera/CameraTrajectory';
import { ApproachTrajectory } from '../camera/ApproachTrajectory';

/** The observer rides a directed platform and owns the viewing orientation and lens. */
export class ObserverRig {
  readonly trajectory: CameraTrajectory | ApproachTrajectory;
  held = false;
  yaw = 0;
  pitch = 0;
  zoom = 1;
  private phase: number;
  private readonly offset = new Quaternion();
  private readonly euler = new Euler(0, 0, 0, 'YXZ');
  constructor(private readonly config: VisualConfig) {
    this.trajectory = config.journey.enabled ? new ApproachTrajectory(config.journey) : new CameraTrajectory(config.camera);
    this.phase = config.frozenTime ?? 0;
  }
  get looking(): boolean { return Math.abs(this.yaw) + Math.abs(this.pitch) > 0.001; }
  get journeyTime(): number { return this.phase; }
  get arrived(): boolean { return this.config.journey.enabled && this.phase >= this.config.journey.duration; }
  get fieldOfView(): number { return 2 * Math.atan(Math.tan(this.trajectory.fieldOfViewAt(this.phase) * Math.PI / 360) / this.zoom) * 180 / Math.PI; }
  look(dx: number, dy: number): void {
    this.yaw = Math.max(-0.48, Math.min(0.48, this.yaw + dx));
    this.pitch = Math.max(-0.3, Math.min(0.3, this.pitch + dy));
  }
  recenter(): void { this.yaw = this.pitch = 0; }
  setZoom(value: number): void { if (Number.isFinite(value)) this.zoom = Math.max(1, Math.min(this.config.observation.maxZoom, value)); }
  update(frame: FrameState, observer: ObserverState): void {
    if (!this.held) this.phase += frame.delta;
    if (this.config.journey.enabled) this.phase = Math.min(this.phase, this.config.journey.duration);
    this.trajectory.sample(this.phase, observer);
    if (this.held) observer.velocity.set(0, 0, 0);
    this.offset.setFromEuler(this.euler.set(this.pitch, this.yaw, 0));
    observer.orientation.multiply(this.offset);
  }
}
