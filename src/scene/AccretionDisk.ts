import { DoubleSide, Group, Mesh, RingGeometry, type Vector3 } from 'three';
import type { VisualConfig } from '../app/config';
import type { ShaderManager } from '../shaders/ShaderManager';
import { createDiskUniforms } from '../shaders/uniforms';

export class AccretionDisk {
  readonly object = new Group();
  private readonly geometry: RingGeometry;
  private readonly surface: Mesh;
  private readonly uniforms: ReturnType<typeof createDiskUniforms>;
  constructor(config: VisualConfig, shaders: ShaderManager) {
    this.geometry = new RingGeometry(config.disk.innerRadius, config.disk.outerRadius, config.quality.diskSegments, 32);
    const positions = this.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const r = Math.hypot(positions.getX(i), positions.getY(i));
      const radial = (r - config.disk.innerRadius) / (config.disk.outerRadius - config.disk.innerRadius);
      positions.setZ(i, config.disk.thickness * (0.15 + 0.85 * Math.pow(Math.max(0, radial), 1.4)));
    }
    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
    this.uniforms = createDiskUniforms(config, shaders.frame);
    this.surface = new Mesh(this.geometry, shaders.create('disk', {
      uniforms: this.uniforms, defines: { NOISE_OCTAVES: config.quality.noiseOctaves },
      side: DoubleSide, transparent: true, depthTest: true, depthWrite: false,
    }));
    this.surface.rotation.x = -Math.PI / 2;
    this.surface.renderOrder = 2;
    this.object.rotation.z = config.disk.tilt;
    this.object.name = 'Sheared emissive disk surface';
    this.object.add(this.surface);
  }
  update(observer: Vector3): void {
    this.surface.updateWorldMatrix(true, false);
    this.surface.worldToLocal(this.uniforms.uObserverLocal.value.copy(observer));
  }
  dispose(): void { this.geometry.dispose(); }
}
