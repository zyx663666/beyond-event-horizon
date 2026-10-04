import { GLSL3, ShaderMaterial, type ShaderMaterialParameters, type WebGLRenderer, type Scene, type Camera } from 'three';
import { shaderDefinitions, type ShaderId } from './definitions';
import { createFrameUniforms } from './uniforms';

/** Owns custom materials. Three.js remains responsible for program caching. */
export class ShaderManager {
  readonly frame = createFrameUniforms();
  private readonly materials = new Set<ShaderMaterial>();

  create(id: ShaderId, options: ShaderMaterialParameters = {}): ShaderMaterial {
    const material = new ShaderMaterial({ ...options, ...shaderDefinitions[id], glslVersion: GLSL3, name: `BEH/${id}`, toneMapped: false });
    this.materials.add(material);
    return material;
  }

  async warmup(renderer: WebGLRenderer, scene: Scene, camera: Camera): Promise<void> {
    await renderer.compileAsync(scene, camera);
  }

  update(time: number): void { this.frame.uTime.value = time; }
  resize(pixelRatio: number): void { this.frame.uPixelRatio.value = pixelRatio; }
  dispose(): void {
    for (const material of this.materials) material.dispose();
    this.materials.clear();
  }
}
