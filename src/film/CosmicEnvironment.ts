import { GLSL3, Mesh, PlaneGeometry, ShaderMaterial, TextureLoader, Uniform, SRGBColorSpace, type Texture } from 'three';
import fragment from './cosmos.frag.glsl?raw';
import noise from '../shaders/common/noise.glsl?raw';
import { shotAt } from './timeline';
export class CosmicEnvironment {
 private readonly geometry=new PlaneGeometry(2,2);
 private readonly uniforms={uEnvironment:new Uniform<Texture|null>(null),uEarth:new Uniform<Texture|null>(null),uNursery:new Uniform<Texture|null>(null),uRemnant:new Uniform<Texture|null>(null),uEpoch:new Uniform(0),uScene:new Uniform(0)};
 readonly material=new ShaderMaterial({glslVersion:GLSL3,vertexShader:'out vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:fragment.replace('// @noise',noise),defines:{NOISE_OCTAVES:4},uniforms:this.uniforms,depthTest:false,depthWrite:false,toneMapped:false});
 readonly object=new Mesh(this.geometry,this.material);
 private textures:Texture[]=[];
 private disposed=false;
 constructor(){this.object.frustumCulled=false;}
 async prepare(environment:Texture){
  this.uniforms.uEnvironment.value=environment;
  if(this.textures.length)return;
  const names=['earth-blue-marble.png'];
  const loaded=await Promise.allSettled(names.map(n=>new TextureLoader().loadAsync(`${import.meta.env.BASE_URL}cosmos/${n}`)));
  const textures=loaded.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);
  if(this.disposed||loaded.some(r=>r.status==='rejected')){textures.forEach(t=>t.dispose());if(!this.disposed)throw new Error('Mission archive texture failed to load');return;}
  textures.forEach(t=>{t.colorSpace=SRGBColorSpace;t.anisotropy=4;});this.textures=textures;
  this.uniforms.uEarth.value=textures[0];
 }
 update(t:number){const id=shotAt(t).id;this.uniforms.uEpoch.value=t;this.uniforms.uScene.value=t>=390?8:Math.max(0,['earth','solar','galaxy','nursery','remnant','deepfield','network','universe'].indexOf(id));}
 dispose(){this.disposed=true;this.textures.forEach(t=>t.dispose());this.material.dispose();this.geometry.dispose();}
}

