import { AdditiveBlending, Matrix4, Mesh, PlaneGeometry, Vector3, type PerspectiveCamera } from 'three';
import type { VisualConfig } from '../app/config';
import type { ShaderManager } from '../shaders/ShaderManager';
import { createRimUniforms } from '../shaders/uniforms';
import { projectedRimRadius } from './diskProfile';

/** Explicit artistic optical proxy; not a photon-ring or event-horizon calculation. */
export class OpticalRim {
  readonly object: Mesh;
  private readonly geometry = new PlaneGeometry(2, 2);
  private readonly facing = new Matrix4();
  private readonly origin = new Vector3();
  private readonly up = new Vector3(0, 1, 0);
  constructor(private readonly config: VisualConfig, shaders: ShaderManager) {
    this.object = new Mesh(this.geometry, shaders.create('rim', {
      uniforms: createRimUniforms(config), transparent: true,
      blending: AdditiveBlending, depthWrite: false, depthTest: false,
    }));
    this.object.name = 'Optical rim — artistic proxy';
    this.object.renderOrder = 3;
    this.object.visible = config.optics.enabled;
  }
  update(camera: PerspectiveCamera): void {
    const scale = projectedRimRadius(this.config.blackHole.radius, camera.position.length()) * 1.45;
    this.object.scale.setScalar(scale);
    this.facing.lookAt(camera.position, this.origin, this.up);
    this.object.quaternion.setFromRotationMatrix(this.facing);
  }
  dispose(): void { this.geometry.dispose(); }
}
