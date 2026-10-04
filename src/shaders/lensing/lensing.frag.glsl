in vec2 vUv;
out vec4 fragColor;
uniform samplerCube uEnvironment;
uniform sampler2D uTransfer;
uniform highp sampler2DArray uOrbits;
uniform mat4 uInverseProjection;
uniform mat4 uCameraToWorld;
uniform float uRs;
uniform float uC;
uniform float uTime;
uniform bool uEnabled;
uniform bool uGrid;
uniform bool uFrequency;
uniform bool uOrders;
uniform vec3 uObserverBeta;
uniform vec3 uReferenceDirection;
uniform vec4 uTableDomain;
uniform vec4 uOrbitDomain;
uniform vec3 uDiskNormal;
uniform vec3 uDiskAxis;
uniform vec4 uDisk; // inner, outer, intensity, temperature
uniform float uTurbulence;
const float PI = 3.14159265359;
// @common-noise
// @disk-profile
float azimuth(float alpha, float edge, float inverseRadius) {
  ivec2 size = textureSize(uTransfer,0);
  float q=sqrt(clamp((alpha-edge-uTableDomain.z)/(PI-edge-uTableDomain.z),0.0,1.0));
  vec2 p=vec2(q,clamp((inverseRadius-uTableDomain.x)/(uTableDomain.y-uTableDomain.x),0.0,1.0))*vec2(size-1);
  ivec2 a=ivec2(floor(p)),b=min(a+1,size-1);vec2 t=fract(p);
  return mix(mix(texelFetch(uTransfer,a,0).r,texelFetch(uTransfer,ivec2(b.x,a.y),0).r,t.x),mix(texelFetch(uTransfer,ivec2(a.x,b.y),0).r,texelFetch(uTransfer,b,0).r,t.x),t.y);
}
vec2 orbitRow(ivec3 a, ivec3 b, float x, float z, int row) {
  vec2 low=mix(texelFetch(uOrbits,ivec3(a.x,row,a.z),0).rg,texelFetch(uOrbits,ivec3(b.x,row,a.z),0).rg,x);
  vec2 high=mix(texelFetch(uOrbits,ivec3(a.x,row,b.z),0).rg,texelFetch(uOrbits,ivec3(b.x,row,b.z),0).rg,x);
  return mix(low,high,z);
}
vec3 orbit(float alpha,float edge,float inverseRadius,float phi) {
  float q=alpha<=edge ? 0.25*(1.0-sqrt(max(0.0,1.0-alpha/edge))) : 0.25+0.75*sqrt(max(0.0,(alpha-edge)/(PI-edge)));
  ivec3 size=textureSize(uOrbits,0);
  vec3 p=vec3(q,clamp(phi/uOrbitDomain.z,0.0,0.999999),clamp((inverseRadius-uOrbitDomain.x)/(uOrbitDomain.y-uOrbitDomain.x),0.0,1.0))*vec3(size-1);
  ivec3 a=ivec3(floor(p)),b=min(a+1,size-1);vec3 t=fract(p);
  vec2 low=orbitRow(a,b,t.x,t.z,a.y),high=orbitRow(a,b,t.x,t.z,b.y);
  return vec3(mix(low,high,t.y),(high.r-low.r)*float(size.y-1)/uOrbitDomain.z);
}
vec3 toStatic(vec3 ray) {
  float beta2=dot(uObserverBeta,uObserverBeta);
  if(beta2<1e-12)return ray;
  float gamma=inversesqrt(1.0-beta2),dotB=dot(uObserverBeta,ray);
  return normalize((ray+((gamma-1.0)*dotB/beta2-gamma)*uObserverBeta)/(gamma*(1.0-dotB)));
}
vec3 thermalColor(float temperature) {
  // Approximate display RGB of a blackbody; exposure is an artistic camera parameter.
  float t=clamp(temperature,1000.0,30000.0)/100.0;
  float red=t<=66.0?1.0:clamp(1.292936*pow(t-60.0,-0.1332048),0.0,1.0);
  float green=t<=66.0?clamp(0.3900816*log(t)-0.6318414,0.0,1.0):clamp(1.129891*pow(t-60.0,-0.0755148),0.0,1.0);
  float blue=t>=66.0?1.0:t<=19.0?0.0:clamp(0.5432068*log(t-10.0)-1.1962541,0.0,1.0);
  vec3 rgb=vec3(red,green,blue);
  return pow(rgb,vec3(2.2));
}
float filteredFbm(vec3 p) {
  float footprint=max(length(dFdx(p)),length(dFdy(p)));
  float sum=0.5,amplitude=0.5;
  for(int i=0;i<NOISE_OCTAVES;i++){
    float fade=1.0-smoothstep(0.4,1.2,footprint);
    sum+=amplitude*(noise3(p)-0.5)*fade;
    p=p*2.03+vec3(12.1,4.7,8.3);footprint*=2.03;amplitude*=0.5;
  }
  return sum;
}
vec3 diskRadiance(vec3 hit,vec3 photon,float delay,float receiverFactor,float observerLapse,int order) {
  float r=length(hit),flux=diskEmission(r,uDisk.x);
  float angle=atan(dot(hit,cross(uDiskNormal,uDiskAxis)),dot(hit,uDiskAxis));
  float beta=sqrt(uRs/(2.0*(r-uRs)));
  vec3 velocity=normalize(cross(uDiskNormal,hit))*beta;
  float g=sqrt((1.0-uRs/r)/observerLapse)*receiverFactor*sqrt(1.0-beta*beta)/(1.0-dot(velocity,photon));
  if(!uFrequency)g=1.0;
  float emittedTime=uTime-delay;
  float omega=uC*sqrt(uRs/(2.0*r*r*r));
  float a=angle-emittedTime*omega;
  float coarse=filteredFbm(vec3(cos(a)*3.8,sin(a)*3.8,r*3.2));
  float warpedR=r+(coarse-0.5)*0.3*uTurbulence;
  float shear=a+log(r/uDisk.x)*4.5;
  float clouds=filteredFbm(vec3(cos(shear)*8.0,sin(shear)*8.0,warpedR*10.0));
  float phase=warpedR*49.0+clouds*22.0;
  float fineAA=1.0-smoothstep(0.7,3.1,fwidth(phase));
  float threads=0.5+0.5*sin(phase)*fineAA;
  float structure=(0.2+smoothstep(0.16,0.79,clouds)*0.85+threads*0.37)*mix(0.38,1.0,smoothstep(0.22,0.65,coarse));
  float radial=(r-uDisk.x)/(uDisk.y-uDisk.x);
  float fade=1.0-smoothstep(0.78,1.0,radial);
  vec3 color=thermalColor(uDisk.w*pow(max(flux,0.0001),0.25)*g)*uDisk.z*flux*structure*pow(g,4.0)*fade;
  if(uOrders) color=(order==0?vec3(1.0,0.6,0.12):order==1?vec3(0.15,0.8,1.0):vec3(0.72,0.2,1.0))*max(dot(color,vec3(0.2126,0.7152,0.0722)),0.08);
  return color;
}
void main() {
  vec4 view=uInverseProjection*vec4(vUv*2.0-1.0,1.0,1.0);
  vec3 ray=toStatic(normalize(mat3(uCameraToWorld)*view.xyz));
  float inverseRadius=uRs/length(cameraPosition),fObs=1.0-inverseRadius;
  vec3 outward=normalize(cameraPosition);
  float radial=dot(ray,outward);
  vec3 tangent=normalize(ray-outward*radial+vec3(1e-12));
  float alpha=atan(length(ray-outward*radial),-radial);
  float edge=asin(2.59807621135*inverseRadius*sqrt(fObs));
  float observerFactor=inversesqrt(1.0-dot(uObserverBeta,uObserverBeta))*(1.0+dot(uObserverBeta,ray));
  if(uEnabled) {
    float first=mod(atan(-dot(uDiskNormal,outward),dot(uDiskNormal,tangent))+PI,PI);
    for(int i=0;i<3;i++) {
      float phi=first+float(i)*PI;
      vec3 path=orbit(alpha,edge,inverseRadius,phi);
      if(path.x<=0.0 || path.x>=0.98)continue;
      float radius=uRs/path.x;
      if(radius<uDisk.x || radius>uDisk.y)continue;
      vec3 eR=outward*cos(phi)+tangent*sin(phi);
      vec3 ePhi=-outward*sin(phi)+tangent*cos(phi);
      float impact=sin(alpha)/(inverseRadius*sqrt(fObs));
      float sine=clamp(impact*path.x*sqrt(1.0-path.x),0.0,1.0);
      vec3 backward=eR*(-sign(path.z)*sqrt(max(0.0,1.0-sine*sine)))+ePhi*sine;
      fragColor=vec4(diskRadiance(eR*radius,-backward,(path.y+1.0/inverseRadius+log(1.0/inverseRadius-1.0))*uRs/uC,observerFactor,fObs,i),1.0);return;
    }
  } else {
    float denom=dot(ray,uDiskNormal);
    float t=-dot(cameraPosition,uDiskNormal)/denom;
    vec3 hit=cameraPosition+ray*t;float r=length(hit);
    float closest=-dot(cameraPosition,ray);
    bool blocked=closest>0.0 && closest<t && length(cameraPosition+ray*closest)<uRs*2.59807621135;
    if(t>0.0 && !blocked && r>=uDisk.x && r<=uDisk.y){fragColor=vec4(diskRadiance(hit,-ray,t/uC,observerFactor,fObs,0),1.0);return;}
  }
  if(alpha<=edge){fragColor=vec4(0.0,0.0,0.0,1.0);return;}
  vec3 direction=ray;
  if(uEnabled){float phi=azimuth(alpha,edge,inverseRadius);direction=normalize(outward*cos(phi)+tangent*sin(phi));}
  vec3 color=texture(uEnvironment,direction).rgb;
  float footprint=max(length(dFdx(direction)),length(dFdy(direction)));
  float width=max(uTableDomain.w,footprint*0.6),d=length(direction-uReferenceDirection);
  float source=exp(-pow(d/width,2.0))*pow(uTableDomain.w/width,2.0);
  color+=vec3(0.55,1.45,2.2)*(source*5.0+exp(-pow(d/max(0.005,width),2.0))*0.07);
  if(uFrequency)color*=pow(observerFactor/sqrt(fObs),4.0);
  if(uGrid){vec2 angles=vec2(atan(direction.z,direction.x),asin(clamp(direction.y,-1.0,1.0)))*12.0;vec2 lines=abs(sin(angles)),aa=max(fwidth(angles),vec2(0.002));float grid=max(1.0-smoothstep(aa.x,aa.x*2.0,lines.x),1.0-smoothstep(aa.y,aa.y*2.0,lines.y));color+=vec3(0.016,0.05,0.065)*grid;}
  fragColor=vec4(color,1.0);
}
