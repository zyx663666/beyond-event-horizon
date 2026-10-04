import { CubeCamera, GLSL3, HalfFloatType, LinearMipmapLinearFilter, Matrix4, Mesh, PerspectiveCamera, PlaneGeometry, Quaternion, Scene, ShaderMaterial, Uniform, Vector3, WebGLCubeRenderTarget, type WebGLRenderer } from 'three';
import type { VisualConfig } from '../app/config';
import type { FrameState, ObserverState, VisualCore } from '../core/contracts';
import { ShaderManager } from '../shaders/ShaderManager';
import { Starfield } from '../scene/Starfield';
import { properAt, properAtRadius, radiusAt } from './model';
import frag from './film.frag.glsl?raw';
import noise from '../shaders/common/noise.glsl?raw';
import { CosmicEnvironment } from './CosmicEnvironment';
import { coreTime, ARRIVAL, INTERPRETATION, smooth } from './timeline';
import { CosmicJourney } from './journey/CosmicJourney';
import { DistantCosmos } from './journey/DistantCosmos';
import type { BlackHoleEventId } from './events';
import { acquisitionRadius, BH_CENTER, journeyPose } from './journey/route';
import { preludeTime, INTRO_DURATION } from '../experience/presentation';
import { openingState } from '../experience/OpeningSequence';
export class FilmScene implements VisualCore {
 readonly scene = new Scene();
 readonly camera = new PerspectiveCamera(52, 16 / 9, .008, 8000);
 readonly observer: ObserverState = { position: new Vector3(), orientation: new Quaternion(), velocity: new Vector3() };
 readonly shaders = new ShaderManager();
 private readonly geometry = new PlaneGeometry(2, 2);
 private readonly cosmos = new CosmicEnvironment();
 private readonly journey:CosmicJourney;
 private readonly distant=new DistantCosmos();
 private readonly blackHole: Mesh;
 private disruptionEnabled=new URLSearchParams(location.search).get('event')!=='0';
 private readonly eventFlags:Record<BlackHoleEventId,boolean>={'tidal-disruption':this.disruptionEnabled,'gas-capture':new URLSearchParams(location.search).get('gas')!=='0','debris-infall':new URLSearchParams(location.search).get('debris')!=='0'};
 private readonly bake = new Scene();
 private readonly stars: Starfield;
 private cube: WebGLCubeRenderTarget | null = null;
 private readonly radial = new Vector3(.18, .34, .923).normalize();
 private readonly uniforms = { uEnvironment: new Uniform<WebGLCubeRenderTarget['texture'] | null>(null), uInverseProjection: new Uniform(new Matrix4()), uCameraToWorld: new Uniform(new Matrix4()), uPosition: new Uniform(new Vector3()), uTau: new Uniform(0), uFilm: new Uniform(0), uArt: new Uniform(0), uEnd: new Uniform(0), uPresence: new Uniform(0), uReveal: new Uniform(0), uDisruption: new Uniform(0), uEventMask:new Uniform(new Vector3(1,1,1)) };
 readonly material = new ShaderMaterial({ glslVersion: GLSL3, vertexShader: 'out vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: frag.replace('// @noise', noise), defines: { NOISE_OCTAVES: 4 }, uniforms: this.uniforms, depthTest: false, depthWrite: false, toneMapped: false });
 constructor(private readonly config: VisualConfig) {
  this.journey=new CosmicJourney(config.qualityName==='ultra'?64:config.qualityName==='preview'?24:40);
  this.bake.add(this.distant.object);this.stars = new Starfield(config, this.shaders); this.bake.add(this.stars.object);
  this.blackHole = new Mesh(this.geometry, this.material); this.blackHole.frustumCulled = false; this.blackHole.renderOrder = -100;
  this.scene.add(this.blackHole, this.journey.object, this.cosmos.object); this.update({ elapsed: 0, delta: 0 });
 }
 async prepare(renderer: WebGLRenderer, hdr: boolean) {
  this.cube?.dispose(); this.cube = new WebGLCubeRenderTarget(this.config.lensing.cubeSize, { ...(hdr ? { type: HalfFloatType } : {}), depthBuffer: false, generateMipmaps: true, minFilter: LinearMipmapLinearFilter });
  new CubeCamera(.1, 240, this.cube).update(renderer, this.bake); this.uniforms.uEnvironment.value = this.cube.texture;
  const loaded = await Promise.allSettled([this.cosmos.prepare(this.cube.texture), this.journey.prepare()]);
  for (const r of loaded) if (r.status === 'rejected') throw r.reason;
  this.blackHole.visible = true; this.cosmos.object.visible = true; this.journey.object.visible = true;
  await renderer.compileAsync(this.scene, this.camera);
 }
 update(frame: FrameState) {
  const journeyTime=Math.max(0,frame.elapsed-INTRO_DURATION);
  const epoch = journeyTime < 126 ? preludeTime(journeyTime) : journeyTime, t = coreTime(epoch), r = epoch < ARRIVAL ? acquisitionRadius(epoch) : radiusAt(t);
  if (epoch < 126) {
   const pose = journeyPose(epoch); this.camera.position.fromArray(pose.position); this.camera.lookAt(new Vector3().fromArray(pose.target)); this.camera.fov = pose.fov;
  } else if (epoch < ARRIVAL) {
   this.camera.position.copy(this.radial).multiplyScalar(r * 8).add(new Vector3().fromArray(BH_CENTER)); this.camera.lookAt(new Vector3().fromArray(BH_CENTER)); this.camera.fov = 52;
  } else {
   const turn = smooth(120, 192, t) * 1.72, tangent = new Vector3().crossVectors(new Vector3(0, 1, 0), this.radial).normalize();
   const sight = this.radial.clone().multiplyScalar(-Math.cos(turn)).addScaledVector(tangent, Math.sin(turn));
   this.camera.position.copy(this.radial).multiplyScalar(r * 8).add(new Vector3().fromArray(BH_CENTER)); this.camera.lookAt(this.camera.position.clone().add(sight)); this.camera.fov = 52 + smooth(75, 185, t) * 24;
  }
  this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
  this.observer.position.copy(this.radial).multiplyScalar(r); this.observer.velocity.copy(this.radial).multiplyScalar(-1 / Math.sqrt(r)); this.observer.orientation.copy(this.camera.quaternion);
  this.uniforms.uPosition.value.copy(this.observer.position); this.uniforms.uCameraToWorld.value.copy(this.camera.matrixWorld); this.uniforms.uInverseProjection.value.copy(this.camera.projectionMatrixInverse);
  this.uniforms.uTau.value = epoch < ARRIVAL ? properAtRadius(r) : properAt(t); this.uniforms.uFilm.value = t;
  this.uniforms.uPresence.value = smooth(118, 127, epoch); this.uniforms.uReveal.value = smooth(0, 3, epoch); this.uniforms.uDisruption.value = (this.disruptionEnabled?1:0)*smooth(126, 140, epoch) * (1 - smooth(188, 196, epoch));
  this.uniforms.uEventMask.value.set(this.eventFlags['tidal-disruption']?1:0,this.eventFlags['gas-capture']?1:0,this.eventFlags['debris-infall']?1:0);
  this.blackHole.visible = epoch < INTERPRETATION; this.cosmos.object.visible = !this.blackHole.visible; this.cosmos.update(epoch); this.journey.update(epoch);
  if(frame.elapsed<INTRO_DURATION){const opening=openingState(frame.elapsed);this.journey.revealOrigin(opening,frame.elapsed);this.uniforms.uReveal.value=opening.stars;}
  else if(journeyTime<3)this.uniforms.uReveal.value=1;
 }
 setEventEnabled(id:string,enabled:boolean){if(Object.hasOwn(this.eventFlags,id)){this.eventFlags[id as BlackHoleEventId]=enabled;if(id==='tidal-disruption')this.disruptionEnabled=enabled;}}
 get enabledEvents(){return Object.entries(this.eventFlags).filter(([,on])=>on).map(([id])=>id).join(',');}
 get tidalEventEnabled(){return this.disruptionEnabled;}
 /** Euclidean prelude objects are projected from the actual scene camera.
  * GR detector fields / causal diagrams are explicitly instrument references;
  * they are not falsely presented as reconstructed source-space positions.
  */
 annotationAnchor(id:string){
  const points:Record<string,number[]>={earth:[0,0,0],sun:[-18,0,12],pulsar:[80,140,-1820]};
  const point=points[id];
  if(point){const v=new Vector3(...point).project(this.camera);if(v.z<1&&v.z>-1&&Math.abs(v.x)<.93&&Math.abs(v.y)<.8)return{x:(v.x+1)/2,y:(1-v.y)/2,reference:false};}
  if(id==='disk'){
   const v=new Vector3().fromArray(BH_CENTER).project(this.camera);
   if(v.z<1&&Math.abs(v.x)<.65&&Math.abs(v.y)<.65)return{x:(v.x+1)/2-.04,y:(1-v.y)/2-.075,reference:true};
  }
  return{x:id==='relay'?.55:.49,y:id==='horizon'?.47:.43,reference:true};
 }
 resize(w: number, h: number, p: number) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.shaders.resize(p); this.journey.resize(h, p); }
 dispose() { this.journey.dispose(); this.distant.dispose();this.cosmos.dispose(); this.material.dispose(); this.geometry.dispose(); this.stars.dispose(); this.shaders.dispose(); this.cube?.dispose(); }
}


