in vec2 vUv;
out vec4 fragColor;
uniform samplerCube uEnvironment;
uniform sampler2D uEarth;
uniform sampler2D uNursery;
uniform sampler2D uRemnant;
uniform float uEpoch;
uniform float uScene;
// @noise
const float PI=3.14159265359;
vec2 rotate2(vec2 p,float a){return mat2(cos(a),-sin(a),sin(a),cos(a))*p;}
vec3 sky(vec2 q){return texture(uEnvironment,normalize(vec3(q*.7,-1.))).rgb*.55;}
float star(vec2 q,vec2 p,float size){float d=length(q-p);return exp(-d*d/(size*size))+.035*exp(-d/(size*8.));}
vec3 earth(vec2 q,float scale,float t){
 vec2 c=vec2(.27,.04),p=(q-c)/scale;float d=dot(p,p);vec3 col=sky(q);
 float rim=exp(-abs(sqrt(d)-1.)*70.);col+=vec3(.08,.36,.75)*rim*.8;
 if(d<1.){
  vec3 n=vec3(p,sqrt(1.-d));vec3 nr=vec3(cos(t*.006)*n.x+sin(t*.006)*n.z,n.y,-sin(t*.006)*n.x+cos(t*.006)*n.z);
  vec2 uv=vec2(fract(1.-atan(nr.z,nr.x)/(2.*PI)),asin(nr.y)/PI+.5);
  vec3 land=texture(uEarth,uv).rgb;
  float cloud=smoothstep(.57,.74,fbm(nr*11.+vec3(0.,t*.002,0.)));
  float lit=max(0.,dot(n,normalize(vec3(-.65,.4,.8))));
  col=mix(land,vec3(.83,.87,.86),cloud*.76)*(.025+lit*1.7);
  col+=vec3(.02,.15,.36)*pow(1.-n.z,3.)*(.2+lit);
 }
 return col;
}
vec3 solar(vec2 q){
 float age=uEpoch-34.;q*=mix(.77,1.1,smoothstep(0.,24.,age));q.x+=.15;
 vec2 disk=vec2(q.x,q.y/.40);float r=length(disk);
 vec3 col=sky(q)*.6;
 col+=vec3(1.3,.64,.19)*(exp(-length(q)*65.)*3.+exp(-length(q)*9.)*.06);
 for(int i=0;i<8;i++){
  float k=float(i),orbit=.1+pow(k+1.,.80)*.105;
  float width=max(fwidth(r),.0005);float ring=1.-smoothstep(width,width*2.,abs(r-orbit));col+=vec3(.08,.15,.19)*ring*.3;
  float a=k*2.19+age*.07/(1.+k);vec2 p=vec2(cos(a),sin(a)*.40)*orbit;
  vec3 tint=i==2?vec3(.12,.46,1.):i>4?vec3(.44,.61,.73):vec3(.84,.65,.37);
  float rr=i==4?.014:i==5?.012:.006;
  col+=tint*star(q,p,rr)*1.1;
  if(i==5){vec2 rel=q-p;float sr=length(vec2(rel.x,rel.y/.35));col+=vec3(.56,.47,.31)*exp(-pow((sr-.024)/.003,2.))*.6;}
 }
 return col;
}
vec3 galaxy(vec2 q,float angle,float size){
 vec2 p=rotate2(q,angle)/size;p.y/=.46;float r=length(p)+.001,a=atan(p.y,p.x);
 if(r>1.35)return vec3(0.);
 float winding=a*4.-log(r+.025)*6.;float arm=pow(.5+.5*cos(winding+fbm(vec3(p*3.,1.))*2.),9.);
 float dust=fbm(vec3(p*15.,r*4.));float fine=noise3(vec3(p*105.,3.));
 float disk=exp(-r*3.7)*(arm*.8+.13)*(1.-smoothstep(.8,1.35,r));
 vec3 col=mix(vec3(.14,.29,.49),vec3(.81,.60,.34),exp(-r*6.))*disk*(.6+dust*1.6);
 col+=vec3(1.,.75,.45)*exp(-r*13.)*.65;
 col+=vec3(.48,.68,1.)*pow(fine,18.)*disk*5.;
 col*=mix(.38,1.,smoothstep(.32,.64,dust));return col;
}
// Archival infrared composites: camera crops only, not simulated gas motion.
vec3 nursery(vec2 q){
 float t=clamp((uEpoch-82.)/24.,0.,1.);
 vec2 uv=.5+q/vec2(1.727,1.)/mix(1.05,1.21,t)+vec2(.02*t,.015*t);
 return texture(uNursery,uv).rgb*.85;
}
vec3 remnant(vec2 q){
 float t=clamp((uEpoch-106.)/20.,0.,1.);
 vec2 uv=.5+(q-vec2(.23,.015))/vec2(1.148,1.)/mix(.82,.94,t);
 vec3 col=sky(q)*.45;
 if(all(greaterThan(uv,vec2(0.)))&&all(lessThan(uv,vec2(1.)))){
  float edge=smoothstep(0.,.08,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)));
  col=mix(col,texture(uRemnant,uv).rgb*.82,edge);
 }
 return col;
}
vec3 deepfield(vec2 q){
 vec3 col=sky(q)*.45;
 for(int i=0;i<26;i++){
  float k=float(i);vec2 p=vec2(hash31(vec3(k,1.,2.)),hash31(vec3(k,4.,2.)))-.5;p*=vec2(1.9,1.);
  float size=.018+pow(hash31(vec3(k,8.,2.)),4.)*.18;
  col+=galaxy(q-p,k*.79,size)*(.4+hash31(vec3(k,1.,7.)));
 }
 return col;
}
float segment(vec2 p,vec2 a,vec2 b,out float along){vec2 v=b-a;along=clamp(dot(p-a,v)/dot(v,v),0.,1.);return length(p-a-v*along);}
vec3 network(vec2 q){
 float t=uEpoch-334.;float zoom=mix(1.25,.52,smoothstep(0.,40.,t));q/=zoom;
 vec3 col=sky(q)*.26;float reveal=smoothstep(6.,22.,t);
 // A symbolic future cone opens into worldlines, then recedes into the light network.
 float unfolding=smoothstep(0.,18.,t),traceFade=1.-smoothstep(12.,26.,t);
 if(traceFade>.001)for(int k=0;k<9;k++){
  float branch=float(k)-4.,f=clamp((q.y+.22)/.56,0.,1.);
  float x=.20+branch*f*(.036+.13*unfolding)+sin(f*4.+branch*.6)*f*f*.10*unfolding;
  float slope=(branch*(.036+.13*unfolding)+(.20*f*sin(f*4.+branch*.6)+.40*f*f*cos(f*4.+branch*.6))*unfolding)/.56;
  float d=abs(q.x-x)/sqrt(1.+slope*slope);
  if(q.y<-.22||q.y>.34)d=length(q-vec2(x,-.22+f*.56));
  float pulse=.35+.65*pow(.5+.5*cos(q.y*18.-t*.5+branch*.3),8.);
  col+=mix(vec3(.12,.32,.42),vec3(.55,.35,.17),(branch+4.)/8.)*exp(-d*650.)*traceFade*pulse;
 }
 for(int i=0;i<76;i++){
  float k=float(i);vec2 p=(vec2(hash31(vec3(k,2.,8.)),hash31(vec3(k,7.,3.)))-.5)*vec2(3.7,2.2);
  float angle=k*.59;float glow=star(q,p,.0035);
  col+=vec3(.45,.67,.86)*glow*.65*reveal;
  col+=galaxy((q-p),angle,.032)*.7*reveal;
  for(int j=1;j<5;j++){
   float l=mod(k+float(j)*7.,76.);vec2 other=(vec2(hash31(vec3(l,2.,8.)),hash31(vec3(l,7.,3.)))-.5)*vec2(3.7,2.2);
   if(length(p-other)<.82&&all(greaterThan(q,min(p,other)-.018))&&all(lessThan(q,max(p,other)+.018))){float along;float d=segment(q,p,other,along);float pulse=exp(-pow((along-fract(t*.022+k*.17))/.07,2.));col+=mix(vec3(.035,.12,.19),vec3(.6,.40,.19),pulse)*exp(-d*450.)*reveal*.32;}
  }
 }
 // A growing web: conceptual light links, not detected civilizations or a cosmological simulation.
 
 return col;
}
void main(){
 vec2 q=(vUv-.5)*vec2(1.7777778,1.);vec3 col;
 if(uScene>7.5){fragColor=vec4(sky(q+vec2((uEpoch-390.)*.00018,0.))*.10*(1.-smoothstep(421.,424.,uEpoch)),1.);return;}
 if(uScene<.5)col=earth(q,mix(.68,.34,smoothstep(0.,34.,uEpoch)),uEpoch);
 else if(uScene<1.5)col=solar(q);
 else if(uScene<2.5)col=sky(q)*.5+galaxy(q-vec2(.08,.04),-.23,mix(1.4,1.,smoothstep(58.,82.,uEpoch)));
 else if(uScene<3.5)col=nursery(q);
 else if(uScene<4.5)col=remnant(q);
 else if(uScene<5.5)col=deepfield(q);
 else {col=network(q);float home=smoothstep(373.,383.,uEpoch);col=mix(col,earth(q,.08,28.),home);}
 col*=smoothstep(0.,3.,uEpoch)*(1.-smoothstep(386.,390.,uEpoch));
 col+=sky(q)*.10*smoothstep(386.,390.,uEpoch);
 fragColor=vec4(col,1.);
}



