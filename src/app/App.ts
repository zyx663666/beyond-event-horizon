import { createConfig } from './config';
import { FrameClock } from '../core/FrameClock';
import { RendererHost } from '../core/RendererHost';
import { BlackHoleScene } from '../scene/BlackHoleScene';
import { RenderPipeline } from '../rendering/RenderPipeline';
import { PerformanceMonitor } from '../debug/PerformanceMonitor';
import { DebugPanel } from '../debug/DebugPanel';
import { ObservationPanel } from '../instruments/ObservationPanel';
import { Vector3 } from 'three';
import { ObserverInput } from '../observer/ObserverInput';
import { ObserverSession } from '../observer/ObserverSession';
import { SchwarzschildPropagation } from '../observer/SchwarzschildPropagation';
import { SignalExperiment } from '../observer/SignalExperiment';
import { LensingPanel } from '../instruments/LensingPanel';
import { ObserverConsole } from '../instruments/ObserverConsole';
import { CinematicDirector } from '../instruments/CinematicDirector';

export class App {
  private readonly config = createConfig(location.search);
  private readonly clock = new FrameClock(this.config.frozenTime);
  private readonly monitor = new PerformanceMonitor();
  private readonly host: RendererHost;
  private readonly core: BlackHoleScene;
  private pipeline: RenderPipeline;
  private readonly panel: DebugPanel;
  private readonly instruments: ObservationPanel;
  private readonly session: ObserverSession;
  private readonly input: ObserverInput;
  private readonly lensPanel: LensingPanel;
  private readonly console: ObserverConsole;
  private readonly director: CinematicDirector;
  private frameId = 0;
  private disposed = false;
  private ready = false;

  constructor(canvas: HTMLCanvasElement) {
    this.host = new RendererHost(canvas, this.config, message => this.setStatus(message, true), () => { void this.restore(); });
    this.core = new BlackHoleScene(this.config);
    this.pipeline = new RenderPipeline(this.host.renderer, this.core, this.config, this.host.hdr);
    this.panel = new DebugPanel(this.config, this.host, this.pipeline.label);
    this.instruments = new ObservationPanel(this.config);
    const o = this.config.observation;
    const signal = new SignalExperiment(new Vector3(...o.beacon), new SchwarzschildPropagation(this.core.spacetime), o.relayDelay / Math.sqrt(this.core.spacetime.lapse(new Vector3(...o.beacon).length())), event => this.session.record(event));
    this.session = new ObserverSession(this.core.spacetime, signal);
    this.session.update(0, this.core.observer);
    this.input = new ObserverInput(canvas, this.core.rig);
    this.console = new ObserverConsole(this.config, this.core, this.session);
    this.lensPanel = new LensingPanel(this.config, this.core);
    this.director = new CinematicDirector(this.config, this.core, this.session);
    this.resize();
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private setStatus(message: string, error = false): void {
    const status = document.querySelector<HTMLElement>('#status')!;
    status.textContent = message;
    status.dataset.error = String(error);
  }

  async start(): Promise<void> {
    this.setStatus('LOADING GEODESIC TABLES');
    await this.core.prepare(this.host.renderer, this.host.hdr);
    if (this.disposed) return;
    this.setStatus('COMPILING VISUAL CORE');
    await this.core.shaders.warmup(this.host.renderer, this.core.scene, this.core.camera);
    if (this.disposed || this.host.contextLost) return;
    // Warm the post-processing programs before collecting performance samples.
    this.pipeline.render(0);
    if (this.host.shaderErrors) throw new Error('Shader compilation failed.');
    this.clock.suspend();
    this.monitor.reset();
    this.ready = true;
    this.setStatus(this.host.hdr ? 'VISUAL CORE ONLINE' : 'LDR PREVIEW · HDR UNAVAILABLE');
    this.schedule();
  }

  private schedule(): void {
    if (!this.frameId && !this.disposed && this.ready && !document.hidden) this.frameId = requestAnimationFrame(this.animate);
  }
  private readonly animate = (now: number): void => {
    try { this.renderFrame(now); }
    catch (error) {
      this.ready = false;
      this.setStatus(error instanceof Error ? error.message : String(error), true);
      console.error('[BEH observer]', error);
    }
  };
  private renderFrame(now: number): void {
    this.frameId = 0;
    if (this.disposed || document.hidden || this.host.contextLost) return;
    const before = performance.now();
    const frame = this.clock.tick(now);
    this.core.update(frame);
    this.session.update(frame.delta, this.core.observer);
    this.host.renderer.info.reset();
    this.pipeline.render(frame.delta);
    if (this.host.shaderErrors) { this.ready = false; return; }
    this.monitor.record(now, performance.now() - before);
    this.panel.update(now, frame.elapsed, this.host, this.core, this.monitor.snapshot());
    this.instruments.update(now, this.core);
    this.console.update(now);
    this.lensPanel.update(now);
    this.director.update(now);
    this.schedule();
  }
  private readonly resize = (): void => {
    if (this.disposed) return;
    this.host.resize();
    const { width, height, pixelRatio } = this.host;
    this.core.resize(width, height, pixelRatio);
    this.pipeline.resize(width, height, pixelRatio);
    this.monitor.reset();
  };
  private readonly onVisibility = (): void => {
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.clock.suspend();
    this.monitor.reset();
    this.schedule();
  };
  private async restore(): Promise<void> {
    if (this.disposed) return;
    this.ready = false;
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
    this.pipeline.dispose();
    this.pipeline = new RenderPipeline(this.host.renderer, this.core, this.config, this.host.hdr);
    this.resize();
    try { await this.start(); } catch (error) { this.setStatus(String(error), true); }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.input.dispose();
    this.console.dispose();
    this.lensPanel.dispose();
    this.director.dispose();
    this.pipeline.dispose();
    this.core.dispose();
    this.host.dispose();
  }
}

