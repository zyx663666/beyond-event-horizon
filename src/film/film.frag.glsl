in vec2 vUv;
out vec4 fragColor;
uniform samplerCube uEnvironment;
uniform mat4 uInverseProjection;
uniform mat4 uCameraToWorld;
uniform vec3 uPosition;
uniform float uTau;
uniform float uFilm;
uniform float uArt;
uniform float uEnd;
uniform float uPresence;
uniform float uReveal;
uniform float uDisruption;
uniform vec3 uEventMask;
// @noise
const vec3 diskN=vec3(.0799147,.9968017,0.);
// PG null Hamiltonian H=|p|-sqrt(1/r) e_r.p, Rs=c=1.
void flow(vec3 x,vec3 p,out vec3 dx,out vec3 dp){
 float r=max(length(x),.035);vec3 e=x/r;float a=inversesqrt(r);
 dx=normalize(p)-a*e;dp=a/r*(p-1.5*e*dot(p,e));
}
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
// Authored matter dynamics on a thin emission surface; PG null propagation remains unchanged.
// The single source field is sampled separately at each ray's retarded time. No screen image copies.
float wrapAngle(float a){return atan(sin(a),cos(a));}
vec2 tidalCenter(float q){float r=mix(21.,7.2,clamp(q,0.,1.));float a=mix(-.48,.18,clamp(q,0.,1.));return vec2(cos(a),sin(a))*r;}
// A real ellipsoidal emitting body, intercepted along the curved integration segment.
// Axes evolve as a cinematic tidal deformation; this is not a fluid solution.
vec4 starSegment(vec3 x,vec3 next,float s){
 float f=(s+24.)/78.;if(f<0.||f>.99||uDisruption<.001)return vec4(0.,0.,0.,-1.);
 float stretch=smoothstep(.2,.73,f),core=1.-smoothstep(.6,.99,f);
 vec2 cp=tidalCenter(f);vec3 c=vec3(cp.x,-cp.x*diskN.x/diskN.y,cp.y),er=normalize(c),et=normalize(cross(diskN,er));
 vec3 axes=vec3(.66+stretch*2.5,.64-stretch*.44,.64-stretch*.38);
 vec3 v=x-c,w=next-c;
 vec3 a=vec3(dot(v,er),dot(v,et),dot(v,diskN))/axes;
 vec3 b=vec3(dot(w,er),dot(w,et),dot(w,diskN))/axes;
 vec3 d=b-a;float aa=dot(d,d),bb=dot(a,d),cc=dot(a,a)-1.,disc=bb*bb-aa*cc;
 if(disc<0.||aa<.000001)return vec4(0.,0.,0.,-1.);float t=(-bb-sqrt(disc))/aa;if(t<0.||t>1.)return vec4(0.,0.,0.,-1.);
 vec3 local=a+d*t;float limb=pow(abs(dot(normalize(local),normalize(d))),.24);float grain=noise3(local*15.+s*.014);
 vec3 color=mix(vec3(.8,.98,1.17),vec3(1.15,.79,.35),stretch);
 return vec4(color*(2.3+grain*.7)*(.55+limb*.45)*core*uDisruption,core>.04?t:-1.);
}
vec3 tidalLight(vec3 x,float s){
 float f=(s+24.)/78.;if(f<0.||f>1.55||uDisruption<.001)return vec3(0.);
 float q=clamp(f,0.,1.),stretch=smoothstep(.2,.73,q),fade=1.-smoothstep(1.,1.55,f);
 vec2 center=tidalCenter(q),delta=x.xz-center,radial=normalize(center);float radius=length(center),angle=atan(center.y,center.x);
 float along=dot(delta,radial),across=dot(delta,vec2(-radial.y,radial.x));
 float body=exp(-pow(along/(.66+stretch*2.5),2.)-pow(across/(.64-stretch*.44),2.))*(1.-smoothstep(.58,.98,q));
 float r=length(x.xz),a=atan(x.z,x.x),turn=wrapAngle(a-angle-log(max(r,.01)/radius)*2.9);
 float width=.14+stretch*.13;
 float stream=exp(-pow(turn*r/width,2.))*smoothstep(5.6,6.2,r)*(1.-smoothstep(radius,radius+.4,r))*smoothstep(.26,.7,q);
 float texture=.5+.5*noise3(vec3(x.xz*8.,s*.035));stream*=texture;
 float stripped=exp(-pow(across/(.14+stretch*.12),2.))*smoothstep(.1,.6,along)*(1.-smoothstep(4.,7.,along))*smoothstep(.24,.68,q)*.38;
 vec3 star=mix(vec3(.8,.97,1.15),vec3(1.15,.8,.42),stretch);
 return (star*body*.5+vec3(1.7,.64,.17)*(stream*1.8+stripped))*fade*uDisruption;
}
vec3 gasLight(vec3 x,float s){
 float f=(s-56.)/36.;if(f<0.||f>1.45||uEventMask.y<.5)return vec3(0.);
 float q=clamp(f,0.,1.),r0=mix(16.,6.1,q),a0=3.75+q*.72,shear=smoothstep(.12,.9,q);
 vec2 c=vec2(cos(a0),sin(a0))*r0,d=x.xz-c,er=normalize(c);float along=dot(d,er),across=dot(d,vec2(-er.y,er.x));
 float irregular=smoothstep(.2,.73,fbm(vec3(x.xz*2.8,s*.024)));
 float body=exp(-pow(along/(1.05+shear*2.6),2.)-pow(across/(.88-shear*.65),2.))*irregular*(1.-smoothstep(.7,1.18,f));
 float r=length(x.xz),a=atan(x.z,x.x),turn=wrapAngle(a-a0-log(max(r,.01)/r0)*3.8);
 float stream=exp(-pow(turn*r/(.2+shear*.13),2.))*smoothstep(5.1,5.8,r)*(1.-smoothstep(r0,r0+.7,r))*smoothstep(.23,.8,q)*(.4+irregular);
 vec3 color=mix(vec3(.2,.58,.78),vec3(.92,.55,.24),shear);
 return color*(body*2.3+stream*1.1)*(1.-smoothstep(.94,1.45,f))*uEventMask.y;
}
vec2 debrisPosition(float f){float q=clamp(f,0.,1.1);float spiral=smoothstep(.35,1.1,q);float r=mix(10.8,1.05,spiral);float a=-1.5+q*7.2;return vec2(cos(a),sin(a))*r;}
vec3 debrisLight(vec3 x,float s){
 float f=(s-75.)/39.;if(f<0.||f>1.13||uEventMask.z<.5)return vec3(0.);
 vec2 c=debrisPosition(f);float body=exp(-dot(x.xz-c,x.xz-c)/.046);float trail=0.;
 for(int j=1;j<=7;j++){vec2 previous=debrisPosition(f-float(j)*.009);vec2 d=x.xz-previous;trail+=exp(-dot(d,d)/.012)*exp(-float(j)*.55);}
 return vec3(1.05,.58,.21)*(body*5.2+trail*.85)*smoothstep(0.,.08,f)*(1.-smoothstep(1.,1.13,f))*uEventMask.z;
}
vec4 debrisSegment(vec3 x,vec3 next,float s){
 float f=(s-75.)/39.;if(f<0.||f>1.1||uEventMask.z<.5)return vec4(0.,0.,0.,-1.);
 vec2 cp=debrisPosition(f);vec3 c=vec3(cp.x,-cp.x*diskN.x/diskN.y,cp.y)+diskN*.22;
 vec3 v=x-c,d=next-x;float radius=.19;float aa=dot(d,d),bb=dot(v,d),cc=dot(v,v)-radius*radius,disc=bb*bb-aa*cc;
 if(disc<0.||aa<.000001)return vec4(0.,0.,0.,-1.);float t=(-bb-sqrt(disc))/aa;if(t<0.||t>1.)return vec4(0.,0.,0.,-1.);
 vec3 normal=normalize(v+d*t);float grain=noise3(normal*18.);float facing=.18+.82*abs(dot(normal,normalize(d)));
 vec3 color=mix(vec3(.25,.36,.4),vec3(1.3,.6,.17),smoothstep(.5,1.,f));return vec4(color*(.8+grain*.6)*facing,t);
}
float sourceStep(vec3 x,float s,float h){
 if(uDisruption>.001){float f=(s+24.)/78.;if(f>=0.&&f<.99){vec2 cp=tidalCenter(f);vec3 c=vec3(cp.x,-cp.x*diskN.x/diskN.y,cp.y);float bound=.9+smoothstep(.2,.73,f)*2.5;if(length(x-c)<bound+.7)h=min(h,.06);}}
 if(uEventMask.z>.5){float f=(s-75.)/39.;if(f>=0.&&f<1.1){vec2 cp=debrisPosition(f);vec3 c=vec3(cp.x,-cp.x*diskN.x/diskN.y,cp.y)+diskN*.22;if(length(x-c)<.7)h=min(h,.035);}}
 return h;
}
float eventResponse(vec3 x,float s){
 float r=length(x),a=atan(x.z,x.x);float tidal=exp(-pow((s-56.)/18.,2.))*exp(-pow((r-7.7)/.65,2.))*exp(-pow(wrapAngle(a-.18-(s-54.)*.025)/.48,2.))*uDisruption;
 float gas=exp(-pow((s-87.)/11.,2.))*exp(-pow((r-6.6)/.53,2.))*exp(-pow(wrapAngle(a+1.7-(s-85.)*.045)/.62,2.))*uEventMask.y;
 float debris=exp(-pow((s-111.)/4.,2.))*exp(-pow((r-3.65)/.28,2.))*exp(-pow(wrapAngle(a-1.2-(s-108.)*.09)/.4,2.))*uEventMask.z;
 return tidal*1.4+gas*.95+debris*.7;
}
vec3 diskLight(vec3 x,vec3 p,float conserved,float delay){
 float r=length(x),angle=atan(x.z,x.x);
 float omega=sqrt(.5/(r*r*r));
 float emitted=(conserved-omega*dot(cross(x,p),diskN))/sqrt(1.-1.5/r);
 float g=clamp(1./max(emitted,.025),.03,8.);
 float a=angle-(uTau-delay)*omega;
 float cloud=fbm(vec3(cos(a)*5.,sin(a)*5.,r*2.1)); float shear=a+log(r/3.1)*4.5; float fine=fbm(vec3(cos(shear)*9.,sin(shear)*9.,r*6.)); float phase=r*42.+cloud*18.+fine*9.;
 float aa=1.-smoothstep(.5,3.,fwidth(phase));
 float veins=(.28+.72*smoothstep(.16,.78,fine)+.14*sin(phase)*aa)*mix(.48,1.,cloud);
 float flux=pow(3.1/r,3.)*(1.-sqrt(3.1/r))*7.;
 float edge=smoothstep(3.1,3.4,r)*(1.-smoothstep(8.,10.1,r));
 vec3 color=mix(vec3(1.,.31,.075),vec3(1.,.88,.68),clamp((g-.5)*.6,0.,1.));
 float spot=exp(-pow((r-4.6)/.45,2.))*pow(.5+.5*cos(a-.7),35.); float event=.18+.45*exp(-pow((uTau-delay-95.)/8.,2.));float feeding=eventResponse(x,uTau-delay); return color*flux*(veins+spot*event+feeding*.8)*edge*min(pow(g,4.),40.)*2.;
}
vec3 trace(vec3 sight){
 vec3 x=uPosition,p=-sight;
 float energy=1.-dot(normalize(x),p)/sqrt(length(x));
 float delay=0.;vec3 debris=vec3(0.);
 for(int i=0;i<260;i++){
  float r=length(x);
  if(r>90.){vec3 sky=texture(uEnvironment,-normalize(p)).rgb;return debris+sky*clamp(pow(1./max(energy,.04),3.),.05,18.);}
  if(r<.045)return debris;
  // Small steps near the photon sphere; large steps only in weak-field regions.
  float h=sourceStep(x,uTau-delay,clamp(r*.065,.002,3.));
  vec3 dx,dp;flow(x,p,dx,dp);
  vec3 midX=x-dx*h*.5,midP=p-dp*h*.5;
  vec3 mx,mp;flow(midX,midP,mx,mp);
  vec3 nx,np;flow(x-h*mx*.5,p-h*mp*.5,nx,np);
  vec3 fx,fp;flow(x-h*nx,p-h*np,fx,fp);
  vec3 next=x-h*(dx+2.*mx+2.*nx+fx)/6.,nextP=p-h*(dp+2.*mp+2.*np+fp)/6.;
  float d0=dot(x,diskN),d1=dot(next,diskN);
  float planeFraction=d0*d1<0.?d0/(d0-d1):2.;float planeRadius=length(mix(x,next,clamp(planeFraction,0.,1.)));
  bool opaquePlane=planeFraction<=1.&&planeRadius>=3.1&&planeRadius<=10.1;
  if(uDisruption>.001){vec4 star=starSegment(x,next,uTau-delay-h*.5);if(star.a>=0.&&(!opaquePlane||star.a<planeFraction))return debris+star.rgb;}
  if(uEventMask.z>.5){vec4 rock=debrisSegment(x,next,uTau-delay-h*.5);if(rock.a>=0.&&(!opaquePlane||rock.a<planeFraction))return debris+rock.rgb;}
  if(d0*d1<0.){
   float w=d0/(d0-d1);vec3 hit=mix(x,next,w);float hr=length(hit);
   if(hr>.95&&hr<28.){float sourceTime=uTau-delay-h*w;debris+=tidalLight(hit,sourceTime)+gasLight(hit,sourceTime)+debrisLight(hit,sourceTime);}
   if(hr>=3.1&&hr<=10.1)return debris+diskLight(hit,mix(p,nextP,w),energy,delay+h*w);
  }
  x=next;p=nextP;delay+=h;
  if(length(p)>1.e5)return vec3(0.);
 }
 // Rays unresolved within the step budget are left dark, not assigned invented sources.
 return vec3(0.);
}
vec3 interpretation(vec2 uv){
 vec2 q=(uv-.5)*vec2(1.7777778,1.);float t=uFilm-248.;
 vec3 color=vec3(.001,.004,.009);
 // Abstract records/worldlines, explicitly outside the scientific image.
 for(int i=0;i<18;i++){
  float k=float(i),z=fract(k/18.+t*.009),depth=.15+z*z*3.;
  float bend=.20*sin(q.x*2.+k*.31+t*.025)+.12*sin(q.x*4.-k*.27);
  float line=q.y-bend-(k-8.5)*.033;
  float width=.0008+depth*.00045;
  float glow=exp(-abs(line)/width)*.22+exp(-abs(line)/.018)*.012;
  float pulse=pow(.5+.5*cos(q.x*3.-t*.18+k*.55),12.);
  color+=mix(vec3(.13,.39,.52),vec3(.9,.53,.23),k/18.)*glow*(.25+pulse*1.9);
 }
 float r=length(q*vec2(.72,1.));color+=vec3(.018,.035,.05)*exp(-r*5.);
 return color;
}
void main(){
 vec4 view=uInverseProjection*vec4(vUv*2.-1.,1.,1.);
 vec3 sight=normalize(mat3(uCameraToWorld)*view.xyz);
 vec3 background=texture(uEnvironment,sight).rgb*.55;
 vec3 physical=uPresence<.001?background:mix(background,trace(sight),uPresence);
 vec3 color=mix(physical,interpretation(vUv),uArt);
 color*=(1.-uEnd)*uReveal;
 fragColor=vec4(color,1.);
}





