import { Vector3 } from 'three';
import type { VisualConfig } from '../app/config';
import type { BlackHoleScene } from '../scene/BlackHoleScene';
import type { ObserverSession } from '../observer/ObserverSession';
import type { ObservationEventType } from '../observer/models';

const PHASES = { outbound: '脉冲飞向信标', relay: '信标正在应答', inbound: '等待回波抵达', received: '回波已接收' };
const EVENTS: Record<ObservationEventType, string> = { transmitted: 'TX · 发射', 'relay-received': 'B-01 · 收到', 'relay-replied': 'B-01 · 回传', received: 'RX · 抵达' };

export class ObserverConsole {
  private readonly abort = new AbortController();
  private readonly fields = new Map<string, HTMLElement>();
  private readonly projection = new Vector3();
  private readonly marker = document.querySelector<HTMLElement>('#beacon-marker')!;
  private readonly pulseButton = document.querySelector<HTMLButtonElement>('#transmit')!;
  private readonly holdButton = document.querySelector<HTMLButtonElement>('#hold-position')!;
  private readonly progress = document.querySelector<HTMLProgressElement>('#signal-progress')!;
  private linkUpdate = -Infinity;
  private readonly linkSight = new Vector3();
  private lastUpdate = -Infinity;
  constructor(private readonly config: VisualConfig, private readonly core: BlackHoleScene, private readonly session: ObserverSession) {
    document.querySelectorAll<HTMLElement>('[data-console]').forEach(el => this.fields.set(el.dataset.console!, el));
    const options = { signal: this.abort.signal };
    this.holdButton.addEventListener('click', () => { core.rig.held = !core.rig.held; this.lastUpdate = -Infinity; }, options);
    document.querySelector('#recenter')!.addEventListener('click', () => core.rig.recenter(), options);
    document.querySelector<HTMLInputElement>('#optical-zoom')!.max = String(config.observation.maxZoom);
    document.querySelector('#optical-zoom')!.addEventListener('input', event => core.rig.setZoom(Number((event.target as HTMLInputElement).value)), options);
    this.pulseButton.addEventListener('click', () => {
      if (config.frozenTime === null && session.transmit()) { this.pulseButton.disabled = true; this.lastUpdate = -Infinity; }
    }, options);
    this.set('scales', `Rs = ${config.observation.schwarzschildRadius.toFixed(3)} u · c = ${config.observation.signalSpeed.toFixed(1)} u/s`);
    if (config.frozenTime !== null) this.set('clock-mode', '冻结取景 · 时钟与信号暂停');
  }
  private set(key: string, value: string): void {
    const el = this.fields.get(key);
    if (el && el.textContent !== value) el.textContent = value;
  }
  update(now: number): void {
    // Marker follows the world-space relay. It is a navigation annotation, not a luminous object.
    const transport = this.session.signal.propagation;
    if(now-this.linkUpdate>500){
      this.linkUpdate=now;
      if(transport.incomingSight){
        this.linkSight.copy(this.core.spacetime.aberrate(transport.incomingSight(this.session.signal.beacon,this.core.observer.position),this.core.spacetime.localBeta(this.core.observer),true));
      }
      const p=this.session.signal.packet;
      const ratio=p?.phase==='received'?p.receivedFrequency:transport.frequencyRatio?.(this.session.signal.beacon,this.core.observer);
      this.set('signal-frequency', ratio!==undefined && ratio!==null ? ratio.toFixed(5)+' ×'+(p?.phase==='received'?' / RX':' / 预测') : '—');
      this.set('gravity-delay', p?.outboundDelay!==null && p?.outboundDelay!==undefined ? p.outboundDelay.toFixed(4)+' s' : '发射后记录');
    }
    if(transport.incomingSight)this.projection.copy(this.core.camera.position).addScaledVector(this.linkSight,this.core.camera.far*0.5).project(this.core.camera);
    else this.projection.copy(this.session.signal.beacon).project(this.core.camera);
    const onScreen = this.projection.z > -1 && this.projection.z < 1 && Math.abs(this.projection.x) < 0.84 && Math.abs(this.projection.y) < 0.65;
    this.marker.hidden = !onScreen;
    if (onScreen) {
      this.marker.style.left = `${(this.projection.x + 1) * 50}%`;
      this.marker.style.top = `${(1 - this.projection.y) * 50}%`;
    }
    if (now - this.lastUpdate < 100) return;
    this.lastUpdate = now;
    const { rig } = this.core, s = this.session, p = s.signal.packet;
    this.holdButton.setAttribute('aria-pressed', String(rig.held));
    this.holdButton.disabled = rig.arrived;
    const holdLabel = rig.arrived ? '外部停驻' : rig.held ? '继续航行' : '定点观测';
    if (this.holdButton.textContent !== holdLabel) this.holdButton.textContent = holdLabel;
    this.set('mode', `${rig.arrived || rig.held ? 'STATION KEEPING' : 'GUIDED FLIGHT'} / ${rig.looking ? 'FREE LOOK' : 'CORE TRACK'}`);
    this.set('bearing', `${(rig.yaw * 180 / Math.PI).toFixed(1)}° / ${(rig.pitch * 180 / Math.PI).toFixed(1)}°`);
    this.set('zoom', rig.zoom.toFixed(2) + '×');
    this.set('reference', s.referenceTime.toFixed(2).padStart(6, '0'));
    this.set('proper', s.properTime.toFixed(2).padStart(6, '0'));
    this.set('clock-difference', (s.referenceTime - s.properTime).toFixed(3) + ' s');
    this.set('clock-rate', s.rate.toFixed(5));
    this.set('beacon-range', s.state.position.distanceTo(s.signal.beacon).toFixed(2) + ' u');
    this.set('beacon-visibility', onScreen ? 'B-01 / 视野内' : 'B-01 / 视野外');
    this.pulseButton.disabled = s.signal.busy || this.config.frozenTime !== null;
    this.set('signal-state', this.config.frozenTime !== null ? '冻结取景 · 无信号发射' : p ? PHASES[p.phase] : '链路待命 · 发射一次探测脉冲');
    this.progress.value = s.signal.progress(s.referenceTime, s.state.position);
    this.set('sequence', p ? `PULSE ${String(p.sequence).padStart(3, '0')}` : 'PULSE —');
    this.set('rtt', p?.received !== null && p?.received !== undefined ? `${(p.received - p.sent).toFixed(3)} s / ${(p.receivedProper! - p.sentProper).toFixed(3)} s` : '— / —');
    // Remote relay events are withheld until the acknowledgement reaches the observer.
    // Before RX the phase display is a model prediction, not instant remote telemetry.
    const visibleEvents = s.events.filter(event => event.type === 'transmitted' || event.type === 'received' || (p?.phase === 'received' && event.sequence === p.sequence));
    this.set('event-log', visibleEvents.slice(-4).map(e => `${e.referenceTime.toFixed(2).padStart(6, '0')}  ${EVENTS[e.type]}`).join('\n') || '尚无接收记录');
  }
  dispose(): void { this.abort.abort(); }
}
