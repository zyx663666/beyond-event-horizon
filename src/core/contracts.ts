import type { Camera, Quaternion, Scene, Vector3 } from 'three';

export interface FrameState { elapsed: number; delta: number }
export interface ObserverState { position: Vector3; orientation: Quaternion; velocity: Vector3 }
export interface CameraDriver { sample(time: number, observer: ObserverState): void }
/** Future ray-traced cores may replace this scene adapter without changing App. */
export interface VisualCore {
  readonly scene: Scene;
  readonly camera: Camera;
  update(frame: FrameState): void;
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}
