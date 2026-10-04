import { Vector3 } from 'three';
import type { VisualConfig } from '../app/config';
import type { BlackHoleScene } from '../scene/BlackHoleScene';
import { captureAngle } from '../lensing/geodesic';
import { diskEmission } from '../scene/diskProfile';

/** Read-only model instruments. Values describe the rendered geometry, not measured astronomy. */
export class ObservationPanel {
  private lastUpdate = -Infinity;
  private readonly normal: Vector3;
  private readonly direction = new Vector3();
  private readonly upperRay = new Vector3();
  private readonly lowerRay = new Vector3();
  private readonly fields = new Map<string, HTMLElement>();
  constructor(private readonly config: VisualConfig) {
    this.normal = new Vector3(-Math.sin(config.disk.tilt), Math.cos(config.disk.tilt), 0);
    document.querySelectorAll<HTMLElement>('[data-observation]').forEach(el => this.fields.set(el.dataset.observation!, el));
    const points = Array.from({ length: 121 }, (_, i) => {
      const radius = config.disk.innerRadius + (config.disk.outerRadius - config.disk.innerRadius) * i / 120;
      return `${(i * 2).toFixed(1)},${(42 - diskEmission(radius, config.disk.innerRadius) * 36).toFixed(2)}`;
    });
    document.querySelector('#emission-profile')!.setAttribute('points', points.join(' '));
    this.set('inner', config.disk.innerRadius.toFixed(2) + ' u');
    this.set('outer', config.disk.outerRadius.toFixed(2) + ' u');
    this.set('rim', 'NULL CAPTURE / CURVED DISK');
  }
  private set(name: string, value: string): void { const field = this.fields.get(name); if (field) field.textContent = value; }
  update(now: number, scene: BlackHoleScene): void {
    if (now - this.lastUpdate < 250) return;
    this.lastUpdate = now;
    const distance = scene.camera.position.length();
    this.direction.copy(scene.camera.position).normalize();
    const inclination = Math.acos(Math.min(1, Math.abs(this.direction.dot(this.normal)))) * 180 / Math.PI;
    this.set('range', distance.toFixed(2) + ' u');
    this.set('inclination', inclination.toFixed(1) + '°');
    this.set('diameter', (2 * captureAngle(distance / this.config.observation.schwarzschildRadius) * 180 / Math.PI).toFixed(2) + '°');
    this.upperRay.set(0, 1, -1).unproject(scene.camera).sub(scene.camera.position).normalize();
    this.lowerRay.set(0, -1, -1).unproject(scene.camera).sub(scene.camera.position).normalize();
    this.set('lens', (this.upperRay.angleTo(this.lowerRay) * 180 / Math.PI).toFixed(1) + '°');
  }
}
