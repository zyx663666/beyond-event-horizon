import { PerspectiveCamera, Quaternion, Scene, Vector3, type WebGLRenderer } from 'three';
import type { VisualConfig } from '../app/config';
import type { FrameState, ObserverState, VisualCore } from '../core/contracts';
import { ObserverRig } from '../observer/ObserverRig';
import { ShaderManager } from '../shaders/ShaderManager';
import { LensedSky } from '../lensing/LensedSky';
import { SchwarzschildSpacetime } from '../observer/SchwarzschildSpacetime';

export class BlackHoleScene implements VisualCore {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly observer: ObserverState = { position: new Vector3(), orientation: new Quaternion(), velocity: new Vector3() };
  readonly shaders = new ShaderManager();
  readonly rig: ObserverRig;
  readonly lensedSky: LensedSky;
  readonly spacetime: SchwarzschildSpacetime;
  private aspect = 1;

  constructor(config: VisualConfig) {
    this.camera = new PerspectiveCamera(config.camera.fov, 1, 0.1, config.stars.radius * 2);
    this.rig = new ObserverRig(config);
    this.spacetime = new SchwarzschildSpacetime(config.observation.schwarzschildRadius, config.observation.signalSpeed);
    this.lensedSky = new LensedSky(config, this.shaders, this.spacetime);
    this.scene.add(this.lensedSky.object);
    this.update({ elapsed: config.frozenTime ?? 0, delta: 0 });
  }

  update(frame: FrameState): void {
    this.shaders.update(frame.elapsed);
    this.rig.update(frame, this.observer);
    this.camera.position.copy(this.observer.position);
    this.camera.quaternion.copy(this.observer.orientation);
    this.updateLens();
    this.camera.updateMatrixWorld();
    this.lensedSky.update(this.camera, this.observer);
  }
  async prepare(renderer: WebGLRenderer, hdr: boolean): Promise<void> { await this.lensedSky.prepare(renderer, hdr); }
  resize(width: number, height: number, pixelRatio: number): void {
    this.aspect = width / height;
    // Reserve lower-screen space for the observer console without reducing render resolution.
    this.camera.setViewOffset(width, height, 0, document.body.classList.contains('film-mode') ? 0 : height * 0.08, width, height);
    this.updateLens();
    this.shaders.resize(pixelRatio);
  }
  private updateLens(): void {
    this.camera.aspect = this.aspect;
    const directedFov = this.rig.fieldOfView;
    this.camera.fov = Math.min(130, 2 * Math.atan(Math.tan(directedFov * Math.PI / 360) * Math.max(1, 1.45 / this.aspect)) * 180 / Math.PI);
    this.camera.updateProjectionMatrix();
  }
  dispose(): void {
    this.lensedSky.dispose();

    this.shaders.dispose();
    this.scene.clear();
  }
}

