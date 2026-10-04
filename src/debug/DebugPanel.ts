import type { VisualConfig } from '../app/config';
import type { RendererHost } from '../core/RendererHost';
import type { BlackHoleScene } from '../scene/BlackHoleScene';
import type { PerformanceSnapshot } from './PerformanceMonitor';

export class DebugPanel {
  private lastUpdate = -Infinity;
  private readonly fields = new Map<string, HTMLElement>();
  constructor(config: VisualConfig, host: RendererHost, pipeline: string) {
    document.querySelector<HTMLElement>('#debug')!.hidden = !config.debug;
    document.querySelector<HTMLElement>('#quality')!.textContent = config.qualityName.toUpperCase();
    document.querySelectorAll<HTMLElement>('[data-field]').forEach(element => this.fields.set(element.dataset.field!, element));
    this.set('pipeline', pipeline);
    this.set('gpu', host.gpuName);
    this.set('config', JSON.stringify(config, null, 2));
    this.set('geometry', config.quality.starCount.toLocaleString() + ' stars / 1024 × 320 × 48 RG16F orbits');
    this.set('model', 'Null capture · opaque curved disk · g⁴ transfer · static exterior chart');
  }
  private set(name: string, value: string): void { const field = this.fields.get(name); if (field) field.textContent = value; }
  update(now: number, elapsed: number, host: RendererHost, scene: BlackHoleScene, stats: PerformanceSnapshot | null): void {
    if (now - this.lastUpdate < 250) return;
    this.lastUpdate = now;
    if (stats) {
      this.set('fps', stats.fps.toFixed(1));
      this.set('frame', stats.mean.toFixed(2) + ' ms');
      this.set('p95', stats.p95.toFixed(2) + ' ms');
      this.set('cpu', stats.cpu.toFixed(2) + ' ms');
    }
    this.set('resolution', host.drawingSize.x + ' × ' + host.drawingSize.y);
    this.set('elapsed', elapsed.toFixed(2) + ' s');
    this.set('position', scene.camera.position.toArray().map(n => n.toFixed(2)).join(' / '));
    this.set('distance', scene.camera.position.length().toFixed(2) + ' u');
    this.set('velocity', scene.observer.velocity.length().toFixed(3) + ' u/s');
    this.set('orientation', scene.camera.quaternion.toArray().map(n => n.toFixed(3)).join(' / '));
    this.set('drawcalls', String(host.renderer.info.render.calls));
    this.set('resources', host.renderer.info.memory.geometries + ' geo / ' + host.renderer.info.memory.textures + ' tex');
    this.set('errors', String(host.shaderErrors));
    this.set('visibility', document.visibilityState + (document.hasFocus() ? ' / focused' : ' / unfocused'));
    document.querySelector<HTMLElement>('#timecode')!.textContent = elapsed.toFixed(1).padStart(6, '0');
  }
}
