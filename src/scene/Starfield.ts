import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Group, Mesh, Points, SphereGeometry, type Vector3 } from 'three';
import type { VisualConfig } from '../app/config';
import type { ShaderManager } from '../shaders/ShaderManager';
import { createStarCatalog } from './StarCatalog';
import { createSkyUniforms, createStarUniforms } from '../shaders/uniforms';

export class Starfield {
  readonly object = new Group();
  private readonly starGeometry = new BufferGeometry();
  private readonly skyGeometry: SphereGeometry;

  constructor(config: VisualConfig, shaders: ShaderManager) {
    const catalog = createStarCatalog(config.quality.starCount, config.stars.seed, config.stars.radius);
    this.starGeometry.setAttribute('position', new BufferAttribute(catalog.positions, 3));
    this.starGeometry.setAttribute('aColor', new BufferAttribute(catalog.colors, 3));
    this.starGeometry.setAttribute('aSize', new BufferAttribute(catalog.sizes, 1));
    this.starGeometry.setAttribute('aBrightness', new BufferAttribute(catalog.brightness, 1));
    const stars = new Points(this.starGeometry, shaders.create('stars', {
      uniforms: createStarUniforms(config, shaders.frame),
      transparent: true, blending: AdditiveBlending, depthWrite: false, depthTest: true,
    }));
    stars.renderOrder = 1;
    this.skyGeometry = new SphereGeometry(config.stars.radius * 1.1, 32, 16);
    const sky = new Mesh(this.skyGeometry, shaders.create('sky', {
      uniforms: createSkyUniforms(config),
      defines: { NOISE_OCTAVES: 3 }, side: BackSide, depthWrite: false,
    }));
    sky.renderOrder = -10;
    this.object.add(sky, stars);
    this.object.name = 'Distant sky';
  }

  update(position: Vector3): void { this.object.position.copy(position); }
  dispose(): void { this.starGeometry.dispose(); this.skyGeometry.dispose(); }
}
