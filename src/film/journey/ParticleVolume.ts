import { AdditiveBlending, BufferAttribute, BufferGeometry, NormalBlending, Points, ShaderMaterial, Uniform, type ColorRepresentation, Color } from 'three';
import noise from '../../shaders/common/noise.glsl?raw';
export interface Particle { p: readonly number[]; size: number; color: ColorRepresentation; seed?: number; gain?: number }
export function seeded(seed: number) { let state = seed >>> 0; return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; }
/** True world positions; soft billboards provide dust, light and gas, not a fluid simulation. */
export class ParticleVolume {
  readonly geometry = new BufferGeometry();
  readonly uniforms = { uTime: new Uniform(0), uOpacity: new Uniform(1), uPixels: new Uniform(700), uDust: new Uniform(0) };
  readonly material: ShaderMaterial;
  readonly object: Points;
  constructor(particles: Particle[], dust = false) {
    const pos: number[] = [], colors: number[] = [], sizes: number[] = [], seeds: number[] = [], gains: number[] = [];
    const c = new Color();
    for (const [i, p] of particles.entries()) { pos.push(...p.p); c.set(p.color); colors.push(c.r, c.g, c.b); sizes.push(p.size); seeds.push(p.seed ?? i * .173); gains.push(p.gain ?? 1); }
    this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    this.geometry.setAttribute('aTint', new BufferAttribute(new Float32Array(colors), 3));
    this.geometry.setAttribute('aSize', new BufferAttribute(new Float32Array(sizes), 1));
    this.geometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(seeds), 1));
    this.geometry.setAttribute('aGain', new BufferAttribute(new Float32Array(gains),1));
    this.uniforms.uDust.value = dust ? 1 : 0;
    this.material = new ShaderMaterial({
      uniforms: this.uniforms, defines: { NOISE_OCTAVES: 3 }, depthWrite: false, transparent: true,
      blending: dust ? NormalBlending : AdditiveBlending,
      vertexShader: `attribute float aGain;attribute vec3 aTint;attribute float aSize;attribute float aSeed;uniform float uPixels;uniform float uTime;uniform float uDust;varying vec3 vTint;varying float vSeed;varying float vFade;
      void main(){vec3 p=position;if(uDust>.5)p+=vec3(sin(uTime*.03+aSeed),cos(uTime*.02+aSeed*2.),sin(uTime*.025+aSeed*3.))*aSize*.028;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uPixels/max(1.,-mv.z),1.,360.);vTint=aTint*aGain;vSeed=aSeed;vFade=smoothstep(.4,4.,-mv.z);}`,
      fragmentShader: `${noise}\nuniform float uTime;uniform float uOpacity;uniform float uDust;varying vec3 vTint;varying float vSeed;varying float vFade;
      void main(){vec2 q=gl_PointCoord*2.-1.;float r=dot(q,q);if(r>1.)discard;float alpha;vec3 col=vTint;if(uDust>.5){float n=fbm(vec3(q*2.5+vSeed,uTime*.012));alpha=pow(1.-r,2.)*smoothstep(.19,.65,n)*.34;col*=.35+n*.9;}else{alpha=exp(-r*12.)+.025*exp(-r*2.);col*=1.2;}gl_FragColor=vec4(col,alpha*uOpacity*vFade);}`,
    });
    this.object = new Points(this.geometry, this.material); this.object.frustumCulled = false;
  }
  update(t: number, opacity = 1) { this.uniforms.uTime.value = t; this.uniforms.uOpacity.value = opacity; this.object.visible = opacity > .001; }
  resize(height: number, pixelRatio: number) { this.uniforms.uPixels.value = height * pixelRatio; }
  dispose() { this.geometry.dispose(); this.material.dispose(); }
}
