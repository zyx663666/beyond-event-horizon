import { Vector3 } from 'three';
import type { VisualConfig } from '../app/config';
import type { BlackHoleScene } from '../scene/BlackHoleScene';
import { captureAngle } from '../lensing/geodesic';

/** Readouts derive from the same transfer table as the rendered distant source. */
export class LensingPanel {
  private readonly abort = new AbortController();
  private readonly toggle = document.querySelector<HTMLButtonElement>('#lensing-toggle')!;
  private readonly grid = document.querySelector<HTMLButtonElement>('#grid-toggle')!;
  private readonly markers = ['reference-a', 'reference-b'].map(id => document.getElementById(id)!);
  private readonly point = new Vector3();
  private readonly frequency = document.querySelector<HTMLButtonElement>('#frequency-toggle')!;
  private readonly orders = document.querySelector<HTMLButtonElement>('#orders-toggle')!;
  private last = -Infinity;
  constructor(private readonly config: VisualConfig, private readonly core: BlackHoleScene) {
    const options = { signal: this.abort.signal };
    this.toggle.addEventListener('click', () => { core.lensedSky.enabled = !core.lensedSky.enabled; this.last = -Infinity; }, options);
    this.frequency.addEventListener('click', () => { core.lensedSky.frequency = !core.lensedSky.frequency; this.last = -Infinity; }, options);
    this.orders.addEventListener('click', () => { core.lensedSky.orders = !core.lensedSky.orders; this.last = -Infinity; }, options);
    this.grid.addEventListener('click', () => { core.lensedSky.grid = !core.lensedSky.grid; this.last = -Infinity; }, options);
  }
  update(now: number): void {
    if (now - this.last < 100) return;
    this.last = now;
    const { camera, lensedSky: sky, rig } = this.core;
    const images = sky.referenceImages(camera);
    this.markers.forEach((marker, i) => {
      const image = images[i];
      if (!image) { marker.hidden = true; return; }
      this.point.copy(camera.position).addScaledVector(image.direction, camera.far * 0.5).project(camera);
      marker.hidden = image.occluded || this.point.z > 1 || this.point.z < -1 || Math.abs(this.point.x) > 0.85 || Math.abs(this.point.y) > 0.9;
      marker.style.left = `${(this.point.x + 1) * 50}%`;
      marker.style.top = `${(1 - this.point.y) * 50}%`;
    });
    this.toggle.textContent = sky.enabled ? '弯曲光路' : '直线对照';
    this.toggle.setAttribute('aria-pressed', String(sky.enabled));
    this.grid.setAttribute('aria-pressed', String(sky.grid));
    this.frequency.textContent = sky.frequency ? '频移开启' : '频移对照';
    this.frequency.setAttribute('aria-pressed', String(sky.frequency));
    this.orders.setAttribute('aria-pressed', String(sky.orders));
    const gravity = Math.sqrt(this.core.spacetime.lapse(this.config.disk.innerRadius) / this.core.spacetime.lapse(camera.position.length()));
    document.getElementById('frequency-readings')!.textContent = sky.orders ? '光路分层：直接金 / 二次青 / 三次紫' : `内缘轨速 ${this.core.spacetime.circularBeta(this.config.disk.innerRadius).toFixed(3)} c · 静态频比 ${gravity.toFixed(3)}`;
    const radius = camera.position.length() / this.config.observation.schwarzschildRadius;
    const alignment = Math.acos(Math.max(-1, Math.min(1, -sky.referenceDirection.dot(camera.position.clone().normalize()))));
    document.getElementById('lens-state')!.textContent = !sky.enabled ? 'S-01 / 单像对照' : alignment < 0.012 ? 'S-01 / 近轴环像 · 非光子环' : 'S-01 / A、B 两支像 · 可被盘面遮挡';
    document.getElementById('lens-readings')!.textContent = `r / Rs ${radius.toFixed(2)} · 捕获半角 ${(captureAngle(radius) * 180 / Math.PI).toFixed(2)}°`;
    const progress = document.querySelector<HTMLProgressElement>('#journey-progress')!;
    progress.max = this.config.journey.duration; progress.value = rig.journeyTime;
    const phase = rig.journeyTime / this.config.journey.duration;
    document.getElementById('journey-stage')!.textContent = !this.config.journey.enabled ? '历史环绕航迹' : rig.arrived ? '外部停驻' : phase < 0.22 ? '远距定位' : phase < 0.45 ? '参考星成像' : phase < 0.75 ? '持续接近' : '近距观测';
    document.getElementById('journey-time')!.textContent = `${Math.min(rig.journeyTime, progress.max).toFixed(0)} / ${progress.max} s`;
  }
  dispose(): void { this.abort.abort(); }
}
