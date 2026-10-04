import { BackSide, BoxGeometry, Mesh, ShaderMaterial, Uniform, Vector3 } from 'three';
import noise from '../../shaders/common/noise.glsl?raw';
/** Bounded 3D density field. Absorption/emission integration is an artistic transport approximation. */
export class NebulaVolume {
 readonly uniforms={uCenter:new Uniform(new Vector3()),uHalfSize:new Uniform(new Vector3()),uTime:new Uniform(0),uOpacity:new Uniform(0),uShell:new Uniform(0)};
 readonly object:Mesh;
 constructor(center:readonly number[],halfSize:readonly number[],shell=false,steps=40){
  this.uniforms.uCenter.value.fromArray(center);this.uniforms.uHalfSize.value.fromArray(halfSize);this.uniforms.uShell.value=shell?1:0;
  this.object=new Mesh(new BoxGeometry(2,2,2),new ShaderMaterial({uniforms:this.uniforms,defines:{NOISE_OCTAVES:3,VOLUME_STEPS:steps},side:BackSide,transparent:true,depthWrite:false,
   vertexShader:'varying vec3 vLocal;void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`${noise}
varying vec3 vLocal;uniform vec3 uCenter;uniform vec3 uHalfSize;uniform float uTime;uniform float uOpacity;uniform float uShell;
float density(vec3 p){
 float n=fbm(p*4.5+vec3(uTime*.001,0.,uTime*.0006));
 float edge=1.-smoothstep(.82,1.,max(max(abs(p.x),abs(p.y)),abs(p.z)));
 if(uShell>.5){float r=length(p*vec3(1.,1.05,1.));float wave=.035*sin(p.x*27.+p.z*13.)+.035*(n-.4);float shell=exp(-pow((r-.79+wave)/.072,2.));return shell*smoothstep(.25,.66,n)*edge*2.2;}
 float ridge=p.y-.17*sin(p.x*4.)+.06*sin(p.z*5.);float body=exp(-ridge*ridge*3.3)*exp(-p.x*p.x*.55-p.z*p.z*.8);
 return body*smoothstep(.22,.62,n)*edge*1.5;
}
void main(){
 vec3 ro=(cameraPosition-uCenter)/uHalfSize,rd=normalize(vLocal-ro);vec3 inv=1./(rd+vec3(.000001));
 vec3 a=(-vec3(1.)-ro)*inv,b=(vec3(1.)-ro)*inv;vec3 lo=min(a,b),hi=max(a,b);
 float entry=max(0.,max(lo.x,max(lo.y,lo.z))),exit=min(hi.x,min(hi.y,hi.z));if(exit<=entry)discard;
 float stepSize=(exit-entry)/float(VOLUME_STEPS),start=entry+stepSize*.5;vec3 sum=vec3(0.);float transmission=1.;
 for(int i=0;i<VOLUME_STEPS;i++){
  vec3 p=ro+rd*(start+float(i)*stepSize);float den=density(p);if(den>.002){
   float occlusion=density(p+vec3(-.08,.11,.02));float light=exp(-occlusion*.75);
   float mixColor=fbm(p*2.2+vec3(7.));vec3 tint=mix(vec3(.075,.18,.29),vec3(.55,.24,.11),smoothstep(.27,.58,mixColor));
   float embedded=exp(-length(p-vec3(-.23,-.08,-.27))*3.5)+.65*exp(-length(p-vec3(.22,.16,-.09))*4.);
   if(uShell>.5){tint=mix(vec3(.075,.2,.31),vec3(.52,.22,.095),smoothstep(.27,.62,mixColor));embedded=.2;}
   float alpha=1.-exp(-den*stepSize*2.1);vec3 emission=tint*(.23+light*.56+embedded*.62);
   sum+=transmission*alpha*emission;transmission*=1.-alpha;if(transmission<.025)break;
  }
 }
 float alpha=1.-transmission;if(alpha<.001)discard;gl_FragColor=vec4(sum/max(alpha,.001),alpha*uOpacity);
}` }));
  this.object.position.copy(this.uniforms.uCenter.value);this.object.scale.copy(this.uniforms.uHalfSize.value);this.object.renderOrder=-1;this.object.frustumCulled=false;
 }
 update(t:number,opacity:number){this.uniforms.uTime.value=t;this.uniforms.uOpacity.value=opacity;this.object.visible=opacity>.001;}
 dispose(){this.object.geometry.dispose();(this.object.material as ShaderMaterial).dispose();}
}
