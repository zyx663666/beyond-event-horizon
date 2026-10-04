import { AdditiveBlending, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, Uniform, Vector3 } from 'three';
import noise from '../../shaders/common/noise.glsl?raw';
import { ParticleVolume,seeded,type Particle } from './ParticleVolume';
/** Very distant 2.5D procedural galaxies, baked into the same HDR sky used by the geodesic tracer. */
export class DistantCosmos {
 readonly object=new Group();private readonly dust:ParticleVolume;
 constructor(){
  const rng=seeded(47003);const directions=[[-8,-6,-45],[16,10,-58],[-26,17,-62],[22,-20,-56],[-42,-10,-28],[43,19,-10],[-14,30,24],[22,-24,30]];
  for(const [i,d]of directions.entries()){
   const m=new Mesh(new PlaneGeometry(2,2),new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending,uniforms:{uSeed:new Uniform(i*.73),uWarm:new Uniform(i%3?0:1)},defines:{NOISE_OCTAVES:3},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`${noise}
varying vec2 vUv;uniform float uSeed;uniform float uWarm;
void main(){vec2 p=(vUv-.5)*2.;p.y*=2.2;float r=length(p);if(r>1.3)discard;float a=atan(p.y,p.x);float arms=pow(.5+.5*cos(a*2.-log(r+.07)*4.8-uSeed),4.);float n=fbm(vec3(p*8.,uSeed));float disk=exp(-r*4.5)*(arms*.4+.18)*(.3+n);float core=exp(-r*r*110.)*.62;vec3 col=mix(vec3(.26,.38,.51),vec3(.53,.38,.24),uWarm);gl_FragColor=vec4(col*(core+disk)*.72,(1.-smoothstep(.7,1.3,r))*.7);}` }));
   m.position.fromArray(d);m.scale.setScalar(i<2?.8:.38+rng()*.55);m.lookAt(new Vector3());m.rotateZ(i*1.21);this.object.add(m);
  }
  const grains:Particle[]=[];for(let i=0;i<110;i++){const a=rng()*6.28,r=45+rng()*23;grains.push({p:[Math.cos(a)*r,(rng()-.5)*12,Math.sin(a)*r],size:1.7+rng()*3,color:'#131b24'});}this.dust=new ParticleVolume(grains,true);this.dust.resize(2048,1);this.dust.update(0,.14);this.object.add(this.dust.object);
 }
 dispose(){this.dust.dispose();this.object.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();(o.material as ShaderMaterial).dispose();}});}
}
