import { HalfFloatType, UnsignedByteType, Vector2, WebGLRenderTarget, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import type { VisualConfig } from '../app/config';
import type { VisualCore } from '../core/contracts';

/** Linear scene -> optional HDR bloom -> one display conversion. */
export class RenderPipeline {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass | null;
  private readonly smaa: SMAAPass | null;
  private readonly output = new OutputPass();
  private readonly scenePass: RenderPass;
  readonly label: string;

  constructor(renderer: WebGLRenderer, core: VisualCore, config: VisualConfig, hdr: boolean) {
    const size = renderer.getSize(new Vector2());
    const target = new WebGLRenderTarget(size.x, size.y, {
      type: hdr ? HalfFloatType : UnsignedByteType,
      // Post-process AA also covers the procedural radiance edges, without MSAA resolves.
      samples: 0,
    });
    this.composer = new EffectComposer(renderer, target);
    this.scenePass = new RenderPass(core.scene, core.camera);
    this.composer.addPass(this.scenePass);
    this.bloom = hdr && config.quality.bloom
      ? new UnrealBloomPass(size, config.output.bloomStrength, config.output.bloomRadius, config.output.bloomThreshold) : null;
    if (this.bloom) this.composer.addPass(this.bloom);
    this.smaa = hdr && config.quality.smaa ? new SMAAPass() : null;
    if (this.smaa) this.composer.addPass(this.smaa);
    this.composer.addPass(this.output);
    this.label = hdr ? 'HDR / ACES' + (this.bloom ? ' / BLOOM' : '') + (this.smaa ? ' / SMAA' : '') : 'LDR fallback / ACES';
    this.resize(size.x, size.y, renderer.getPixelRatio());
  }

  render(delta: number): void { this.composer.render(delta); }
  resize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }
  dispose(): void {
    this.scenePass.dispose();
    this.bloom?.dispose();
    this.smaa?.dispose();
    this.output.dispose();
    this.composer.dispose();
  }
}
