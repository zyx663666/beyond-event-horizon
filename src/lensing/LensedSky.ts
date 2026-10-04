import { CubeCamera, DataArrayTexture, DataTexture, FloatType, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, Matrix4, Mesh, NearestFilter, PlaneGeometry, RedFormat, RGFormat, Scene, Uniform, UnsignedByteType, Vector3, Vector4, WebGLCubeRenderTarget, type PerspectiveCamera, type WebGLRenderer } from 'three';
import type { VisualConfig } from '../app/config';
import type { ObserverState } from '../core/contracts';
import type { ShaderManager } from '../shaders/ShaderManager';
import { Starfield } from '../scene/Starfield';
import { captureAngle, LUT, sampleTransfer } from './geodesic';
import { ORBIT, sampleOrbit } from './orbit';
import type { SchwarzschildSpacetime } from '../observer/SchwarzschildSpacetime';
export interface ReferenceImage { direction: Vector3; alpha: number; occluded: boolean }
/** One camera pass owns curved disk hits, capture, background transfer and local frequency. */
export class LensedSky {
  readonly object: Mesh;
  readonly referenceDirection = new Vector3(0.194,-0.276,-0.941).normalize();
  enabled: boolean;
  grid=false;
  frequency=true;
  orders=false;
  private readonly geometry=new PlaneGeometry(2,2);
  private readonly bakeScene=new Scene();
  private readonly catalog: Starfield;
  private readonly normal: Vector3;
  private readonly beta=new Vector3();
  private cube: WebGLCubeRenderTarget|null=null;
  private transfer: DataTexture|null=null;
  private orbits: DataArrayTexture|null=null;
  private data: Float32Array|null=null;
  private orbitData: Uint16Array|null=null;
  private disposed=false;
  private readonly abort=new AbortController();
  private readonly uniforms;
  constructor(private readonly config:VisualConfig,private readonly shaders:ShaderManager,private readonly spacetime:SchwarzschildSpacetime) {
    this.enabled=config.lensing.enabled;this.frequency=config.lensing.frequency;this.orders=config.lensing.orders;
    this.catalog=new Starfield(config,shaders);this.bakeScene.add(this.catalog.object);
    this.normal=new Vector3(-Math.sin(config.disk.tilt),Math.cos(config.disk.tilt),0);
    this.uniforms={
      uEnvironment:new Uniform<WebGLCubeRenderTarget['texture']|null>(null),uTransfer:new Uniform<DataTexture|null>(null),uOrbits:new Uniform<DataArrayTexture|null>(null),
      uInverseProjection:new Uniform(new Matrix4()),uCameraToWorld:new Uniform(new Matrix4()),
      uRs:new Uniform(spacetime.rs),uC:new Uniform(spacetime.c),uTime:shaders.frame.uTime,
      uEnabled:new Uniform(this.enabled),uGrid:new Uniform(false),uFrequency:new Uniform(this.frequency),uOrders:new Uniform(this.orders),
      uObserverBeta:new Uniform(this.beta),uReferenceDirection:new Uniform(this.referenceDirection),
      uTableDomain:new Uniform(new Vector4(LUT.minInverseRadius,LUT.maxInverseRadius,LUT.angularEpsilon,0.0015)),
      uOrbitDomain:new Uniform(new Vector4(ORBIT.minInverseRadius,ORBIT.maxInverseRadius,ORBIT.maxPhi,ORBIT.split)),
      uDiskNormal:new Uniform(this.normal),uDiskAxis:new Uniform(new Vector3(Math.cos(config.disk.tilt),Math.sin(config.disk.tilt),0)),
      uDisk:new Uniform(new Vector4(config.disk.innerRadius,config.disk.outerRadius,config.disk.intensity,config.disk.temperature)),uTurbulence:new Uniform(config.disk.turbulence),
    };
    this.object=new Mesh(this.geometry,shaders.create('lensing',{uniforms:this.uniforms,defines:{NOISE_OCTAVES:config.quality.noiseOctaves},depthTest:false,depthWrite:false}));
    this.object.frustumCulled=false;this.object.renderOrder=-100;this.object.name='Unified Schwarzschild observation';
  }
  private async load(path:string):Promise<Response> {
    const response=await fetch(`${import.meta.env.BASE_URL}lensing/${path}`,{signal:this.abort.signal});
    if(!response.ok)throw new Error(`Cannot load lensing asset: ${path}`);return response;
  }
  async prepare(renderer:WebGLRenderer,hdr:boolean):Promise<void> {
    if(!this.data){
      const buffer=await (await this.load('schwarzschild.bin')).arrayBuffer();
      if(this.disposed)return;
      if(buffer.byteLength!==LUT.width*LUT.height*4)throw new Error('Invalid sky table size');
      this.data=new Float32Array(buffer);if(!this.data.every(Number.isFinite))throw new Error('Invalid sky table values');
      this.transfer=new DataTexture(this.data,LUT.width,LUT.height,RedFormat,FloatType);
      this.transfer.minFilter=this.transfer.magFilter=NearestFilter;this.transfer.needsUpdate=true;this.uniforms.uTransfer.value=this.transfer;
    }
    if(!this.orbitData){
      const response=await this.load('orbits.dat');
      if(!response.body)throw new Error('Missing orbit table stream');
      const buffer=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      if(this.disposed)return;
      if(buffer.byteLength!==ORBIT.width*ORBIT.height*ORBIT.layers*4)throw new Error('Invalid orbit table size');
      this.orbitData=new Uint16Array(buffer);
      this.orbits=new DataArrayTexture(this.orbitData,ORBIT.width,ORBIT.height,ORBIT.layers);
      this.orbits.format=RGFormat;this.orbits.type=HalfFloatType;this.orbits.minFilter=this.orbits.magFilter=NearestFilter;
      this.orbits.unpackAlignment=1;this.orbits.needsUpdate=true;this.uniforms.uOrbits.value=this.orbits;
    }
    if(this.disposed)return;
    this.cube?.dispose();this.cube=new WebGLCubeRenderTarget(this.config.lensing.cubeSize,{type:hdr?HalfFloatType:UnsignedByteType,depthBuffer:false,generateMipmaps:true,minFilter:LinearMipmapLinearFilter,magFilter:LinearFilter});
    const cubeCamera=new CubeCamera(0.1,this.config.stars.radius*2,this.cube),pixelRatio=this.shaders.frame.uPixelRatio.value;
    this.shaders.frame.uPixelRatio.value=1;
    try{cubeCamera.update(renderer,this.bakeScene);}finally{this.shaders.frame.uPixelRatio.value=pixelRatio;}
    this.uniforms.uEnvironment.value=this.cube.texture;
  }
  update(camera:PerspectiveCamera,observer:ObserverState):void {
    const radius=camera.position.length()/this.spacetime.rs;
    if(radius<8||radius>96)throw new Error('Observer outside validated lensing domain: 8–96 Rs');
    this.spacetime.localBeta(observer,this.beta);
    this.uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse);this.uniforms.uCameraToWorld.value.copy(camera.matrixWorld);
    this.uniforms.uEnabled.value=this.enabled;this.uniforms.uGrid.value=this.grid;this.uniforms.uFrequency.value=this.frequency;this.uniforms.uOrders.value=this.orders;
  }
  private blocked(camera:PerspectiveCamera,staticRay:Vector3):boolean {
    if(!this.orbitData)return true;
    const outward=camera.position.clone().normalize(),radial=staticRay.dot(outward),tangent=staticRay.clone().addScaledVector(outward,-radial).normalize();
    const radius=camera.position.length()/this.spacetime.rs,alpha=Math.atan2(Math.sqrt(Math.max(0,1-radial*radial)),-radial);
    if(this.enabled){
      const first=(Math.atan2(-this.normal.dot(outward),this.normal.dot(tangent))+Math.PI)%Math.PI;
      for(let i=0;i<3;i++){
        const path=sampleOrbit(this.orbitData,radius,alpha,first+i*Math.PI);
        if(path.u<=0||path.u>=0.98)continue;
        const r=this.spacetime.rs/path.u;
        if(r>=this.config.disk.innerRadius&&r<=this.config.disk.outerRadius)return true;
      }
      return alpha<=captureAngle(radius);
    }
    const t=-camera.position.dot(this.normal)/staticRay.dot(this.normal),r=camera.position.clone().addScaledVector(staticRay,t).length();
    return alpha<=captureAngle(radius)||(t>0&&r>=this.config.disk.innerRadius&&r<=this.config.disk.outerRadius);
  }
  referenceImages(camera:PerspectiveCamera):ReferenceImage[]{
    if(!this.data)return[];
    const outward=camera.position.clone().normalize(),dot=Math.max(-1,Math.min(1,this.referenceDirection.dot(outward))),sourceAngle=Math.acos(dot);
    let tangent=this.referenceDirection.clone().addScaledVector(outward,-dot);
    if(tangent.lengthSq()<1e-12)tangent=new Vector3(1,0,0).addScaledVector(outward,-outward.x);
    tangent.normalize();
    const radius=camera.position.length()/this.spacetime.rs;
    const directions:{direction:Vector3;alpha:number}[]=[];
    if(!this.enabled)directions.push({direction:this.referenceDirection.clone(),alpha:Math.PI-sourceAngle});
    else for(const [phi,sign] of [[sourceAngle,1],[2*Math.PI-sourceAngle,-1]]){
      let low=captureAngle(radius)+LUT.angularEpsilon,high=Math.PI;
      for(let i=0;i<32;i++){const mid=(low+high)/2;if(sampleTransfer(this.data,radius,mid)!>phi)low=mid;else high=mid;}
      const alpha=(low+high)/2;directions.push({direction:outward.clone().multiplyScalar(-Math.cos(alpha)).addScaledVector(tangent,sign*Math.sin(alpha)),alpha});
    }
    return directions.map(image=>({...image,occluded:this.blocked(camera,image.direction),direction:this.spacetime.aberrate(image.direction,this.beta,true)}));
  }
  dispose():void{this.disposed=true;this.abort.abort();this.geometry.dispose();this.catalog.dispose();this.cube?.dispose();this.transfer?.dispose();this.orbits?.dispose();this.bakeScene.clear();}
}
