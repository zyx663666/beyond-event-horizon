import type { ObserverRig } from './ObserverRig';

/** Scoped to the observation window; never captures global shortcuts or locks the pointer. */
export class ObserverInput {
  private readonly abort = new AbortController();
  private pointer: number | null = null;
  private x = 0;
  private y = 0;
  constructor(private readonly canvas: HTMLCanvasElement, rig: ObserverRig) {
    const options = { signal: this.abort.signal };
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0 || this.pointer !== null) return;
      this.pointer = event.pointerId; this.x = event.clientX; this.y = event.clientY;
      canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true });
      canvas.dataset.dragging = 'true';
    }, options);
    canvas.addEventListener('pointermove', event => {
      if (event.pointerId !== this.pointer) return;
      rig.look(-(event.clientX - this.x) * 0.002, -(event.clientY - this.y) * 0.002);
      this.x = event.clientX; this.y = event.clientY;
    }, options);
    const release = () => {
      if (this.pointer !== null && canvas.hasPointerCapture(this.pointer)) canvas.releasePointerCapture(this.pointer);
      this.pointer = null; delete canvas.dataset.dragging;
    };
    const releasePointer = (event: PointerEvent) => { if (event.pointerId === this.pointer) release(); };
    canvas.addEventListener('pointerup', releasePointer, options);
    canvas.addEventListener('pointercancel', releasePointer, options);
    canvas.addEventListener('lostpointercapture', releasePointer, options);
    window.addEventListener('blur', release, options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) release(); }, options);
    canvas.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') rig.look(0.025, 0);
      else if (event.key === 'ArrowRight') rig.look(-0.025, 0);
      else if (event.key === 'ArrowUp') rig.look(0, 0.025);
      else if (event.key === 'ArrowDown') rig.look(0, -0.025);
      else if (event.key === 'Home') rig.recenter();
      else return;
      event.preventDefault();
    }, options);
  }
  dispose(): void {
    this.abort.abort();
    if (this.pointer !== null && this.canvas.hasPointerCapture(this.pointer)) this.canvas.releasePointerCapture(this.pointer);
    delete this.canvas.dataset.dragging;
  }
}
