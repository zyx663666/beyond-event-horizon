import { AdditiveBlending, BackSide, Mesh, ShaderMaterial, SphereGeometry, Uniform, Vector3, type Texture } from 'three';
import noise from '../../shaders/common/noise.glsl?raw';
const vertex = `varying vec3 vN;varying vec3 vLocal;varying vec3 vWorld;varying vec2 vUV;void main(){vUV=uv;vLocal=normal;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
export class Planet {
  readonly uniforms = { uMap: new Uniform<Texture | null>(null), uTime: new Uniform(0), uMode: new Uniform(0), uOpacity: new Uniform(1), uReveal:new Uniform(1), uTint: new Uniform(new Vector3(1,1,1)), uLight: new Uniform(new Vector3(-18, 0, 12).normalize()) };
  readonly material: ShaderMaterial;
  readonly object: Mesh;
  constructor(radius: number, mode = 0) {
    this.uniforms.uMode.value = mode;
    this.material = new ShaderMaterial({ uniforms: this.uniforms, vertexShader: vertex, defines: { NOISE_OCTAVES: 4 }, fragmentShader: `${noise}
varying vec3 vN;varying vec3 vLocal;varying vec3 vWorld;varying vec2 vUV;uniform sampler2D uMap;uniform float uTime;uniform float uMode;uniform vec3 uLight;uniform vec3 uTint;uniform float uOpacity;uniform float uReveal;
void main(){vec3 n=normalize(vN),eye=normalize(cameraPosition-vWorld);float mu=dot(n,uLight),lit=max(0.,mu);vec3 col;
 if(uMode<.5){
  vec3 surface=texture2D(uMap,vUV).rgb;
  float water=smoothstep(.015,.11,surface.b-surface.r)* (1.-smoothstep(.22,.6,surface.r));
  float oceanDetail=noise3(normalize(vLocal)*230.);
  float spec=pow(max(0.,dot(n,normalize(uLight+eye))),80.)*water*lit;
  float day=smoothstep(-.055,.07,mu);
  col=surface*(.011+lit*1.28*day);
  col+=vec3(.22,.37,.43)*spec*(.36+oceanDetail*.32);
  float rim=pow(1.-max(0.,dot(n,eye)),4.);
  col+=vec3(.035,.11,.19)*rim*smoothstep(-.18,.12,mu)*.22;
 }else if(uMode<1.5){
  vec3 coord=normalize(vLocal)*13.+vec3(uTime*.0015,0.,0.);
  float density=smoothstep(.51,.7,fbm(coord));
  float shadow=fbm(coord+uLight*.14);
  col=mix(vec3(.24,.3,.35),vec3(.9,.93,.93),smoothstep(.28,.55,shadow))*(.035+lit*1.22);
  gl_FragColor=vec4(col,density*.76*uOpacity);return;
 }else{
  float craters=fbm(normalize(vLocal)*24.+vec3(4.));float bands=.6+.4*sin(vLocal.y*25.+craters*5.+uTime*.008);
  col=mix(vec3(.16,.15,.14),vec3(.49,.48,.43),craters)*uTint*(.024+lit*1.45);
  if(uMode>2.5)col=uTint*(.5+.5*bands)*(.025+lit*1.35);
 }gl_FragColor=vec4(col*uReveal,uOpacity);
}` });
    if (mode === 1) { this.material.transparent = true; this.material.depthWrite = false; }
    this.object = new Mesh(new SphereGeometry(radius, 112, 80), this.material);
  }
  dispose() { this.object.geometry.dispose(); this.material.dispose(); }
}
export function atmosphere(radius: number, outer = false) {
  return new Mesh(new SphereGeometry(radius, 96, 64), new ShaderMaterial({ vertexShader: vertex, side: BackSide, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms:{uOuter:new Uniform(outer?1:0),uReveal:new Uniform(1)},fragmentShader: `varying vec3 vN;varying vec3 vWorld;uniform float uOuter;uniform float uReveal;void main(){vec3 n=normalize(vN),eye=normalize(cameraPosition-vWorld);float rim=pow(1.-abs(dot(n,eye)),mix(4.8,7.,uOuter));float mu=dot(n,normalize(vec3(-18.,0.,12.)));float lit=smoothstep(-.23,.4,mu);float sunset=exp(-pow(mu/.12,2.));vec3 tint=mix(vec3(.025,.15,.47),vec3(.48,.19,.075),sunset*.7);gl_FragColor=vec4(tint*rim*(.16+lit*.94),rim*mix(.7,.3,uOuter)*uReveal);}` }));
}
export function luminousStar(radius: number, color: Vector3) {
  const material = new ShaderMaterial({ vertexShader: vertex, uniforms: { uTime: new Uniform(0), uTint: new Uniform(color) }, defines: { NOISE_OCTAVES: 3 },
    fragmentShader: `${noise}
varying vec3 vN;varying vec3 vWorld;uniform float uTime;uniform vec3 uTint;void main(){vec3 n=normalize(vN);float limb=pow(max(0.,dot(n,normalize(cameraPosition-vWorld))),.25);float grain=fbm(n*20.+uTime*.015);gl_FragColor=vec4(uTint*(1.8+grain*.8)*(.5+limb*.5),1.);}` });
  return new Mesh(new SphereGeometry(radius, 64, 48), material);
}
