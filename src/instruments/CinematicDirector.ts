import type { BlackHoleScene } from '../scene/BlackHoleScene';
import type { ObserverSession } from '../observer/ObserverSession';
import type { VisualConfig } from '../app/config';

// Editorial cues describe the external approach; physical events come from the session.
const CUES = [
  { start: 3, end: 13, en: 'BEYOND EVENT HORIZON', zh: '事件视界之外', title: true },
  { start: 22, end: 30, en: 'We followed light to find the unknown.', zh: '我们沿着光，寻找未知。' },
  { start: 68, end: 78, en: 'One star. More than one path to reach us.', zh: '同一颗星，经由不同的光路抵达。' },
  { start: 139, end: 149, en: 'Two clocks. One journey.', zh: '两只钟，同一段旅程。' },
  { start: 220, end: 230, en: 'The sky has not vanished. Its geometry has changed.', zh: '天空并未消失。改变的是它的几何。' },
  { start: 286, end: 297, en: 'There is still a path outward.', zh: '此刻，仍有一条通向外界的光路。' },
];

export class CinematicDirector {
  readonly enabled: boolean;
  private readonly root = document.createElement('section');
  private readonly link = document.createElement('a');
  private readonly english = document.createElement('div');
  private readonly chinese = document.createElement('div');
  private readonly caption = document.createElement('div');
  private readonly chapter = document.createElement('div');
  private readonly telemetry = document.createElement('div');
  private readonly signal = document.createElement('div');
  private readonly progress = document.createElement('div');
  private nextPulse = 35;
  private last = -Infinity;

  constructor(private readonly config: VisualConfig, private readonly core: BlackHoleScene, private readonly session: ObserverSession) {
    const params = new URLSearchParams(location.search);
    this.enabled = params.get('mode') === 'film' && config.journey.enabled;
    document.body.classList.toggle('film-mode', this.enabled);
    this.link.id = 'film-switch';
    params.set('mode', this.enabled ? 'observatory' : 'film');
    params.delete('t'); params.delete('journey');
    if (!this.enabled) { params.delete('lensing'); params.delete('frequency'); params.delete('orders'); params.set('debug', '0'); }
    this.link.href = `?${params}`;
    this.link.textContent = this.enabled ? 'OBSERVATORY / 观测模式' : 'WATCH FILM / 电影模式';
    document.querySelector('#app')!.append(this.link);
    if (!this.enabled) return;
    this.root.id = 'cinematic';
    this.root.setAttribute('aria-label', '电影化观测记录');
    this.caption.className = 'film-caption';
    this.english.className = 'film-en'; this.chinese.className = 'film-zh';
    this.english.lang = 'en'; this.chinese.lang = 'zh-CN';
    this.caption.append(this.english, this.chinese);
    this.chapter.className = 'film-chapter';
    this.telemetry.className = 'film-telemetry';
    this.signal.className = 'film-signal';
    this.progress.className = 'film-progress';
    this.root.append(this.chapter, this.telemetry, this.signal, this.caption, this.progress);
    document.querySelector('#app')!.append(this.root);
  }

  update(now: number): void {
    if (!this.enabled) return;
    document.body.classList.add('film-ready');
    const t = this.core.rig.journeyTime;
    const cue = CUES.find(c => t >= c.start && t < c.end);
    this.caption.style.opacity = cue ? String(Math.min(1, (t - cue.start) / 1.6, (cue.end - t) / 1.6)) : '0';
    this.caption.classList.toggle('film-title', Boolean(cue && 'title' in cue));
    this.english.textContent = cue?.en ?? '';
    this.chinese.textContent = cue?.zh ?? '';
    this.progress.style.transform = `scaleX(${Math.min(1, t / this.config.journey.duration)})`;
    if (this.config.frozenTime === null && t >= this.nextPulse && t < 280 && !this.session.signal.busy) {
      this.session.transmit(); this.nextPulse = t + 48;
    }
    if (now - this.last < 100) return;
    this.last = now;
    this.chapter.textContent = t >= 300 ? 'OBSERVATION CONTINUES / 外部停驻 · 观测继续'
      : t < 60 ? 'I / ACQUISITION · 寻光' : t < 130 ? 'II / MULTIPLE PATHS · 曲光'
      : t < 210 ? 'III / TWO CLOCKS · 双钟' : 'IV / THE EXTERIOR · 临近';
    const radius = this.core.observer.position.length() / this.config.observation.schwarzschildRadius;
    this.telemetry.textContent = this.config.frozenTime !== null
      ? `STILL / 定格  ${t.toFixed(0)} s   ·   r / Rs ${radius.toFixed(2)}`
      : `r / Rs ${radius.toFixed(2)}   ·   τ ${this.session.properTime.toFixed(2)}   /   t ${this.session.referenceTime.toFixed(2)}`;
    const p = this.session.signal.packet;
    const received = p?.received !== null && p?.received !== undefined;
    // Do not expose remote relay events before their acknowledgement arrives.
    this.signal.textContent = this.config.frozenTime !== null ? 'SIGNAL PAUSED / 信号暂停'
      : !p ? 'LINK READY / 链路待命'
      : received ? `RX ${String(p.sequence).padStart(3, '0')} / 回波已接收  ·  ${(p.received! - p.sent).toFixed(3)} s`
      : `TX ${String(p.sequence).padStart(3, '0')} / 已发送 · 等待回波`;
    this.signal.dataset.active = String(Boolean(p && !received));
  }

  dispose(): void { this.root.remove(); this.link.remove(); document.body.classList.remove('film-mode', 'film-ready'); }
}

