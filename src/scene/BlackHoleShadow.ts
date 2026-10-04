import { Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import type { VisualConfig } from '../app/config';

/** Geometric occluder only; this is not a GR shadow or an emitting surface. */
export class BlackHoleShadow {
  readonly object: Mesh<SphereGeometry, MeshBasicMaterial>;
  constructor(config: VisualConfig) {
    this.object = new Mesh(new SphereGeometry(config.blackHole.radius, 96, 64), new MeshBasicMaterial({ color: 0x000000, toneMapped: false }));
    this.object.name = 'Shadow approximation';
  }
  dispose(): void { this.object.geometry.dispose(); this.object.material.dispose(); }
}
