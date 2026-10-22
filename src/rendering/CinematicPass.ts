import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/** Cinematic finish applied in display space (after ACES + sRGB conversion):
 *  lens vignette, subtle chromatic split, animated film grain and a radial
 *  surge used for the horizon-crossing beat. All of it is lens language, not
 *  physics — the traced radiance and geodesics are untouched. */
export interface CinematicState {
  time: number;
  grain: number;
  vignette: number;
  aberration: number;
  shock: number;
}

export const CinematicShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 }, uGrain: { value: .028 }, uVignette: { value: .24 },
    uAberration: { value: .12 }, uShock: { value: 0 }, uAspect: { value: 16 / 9 },
  },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `
   uniform sampler2D tDiffuse;uniform float uTime,uGrain,uVignette,uAberration,uShock,uAspect;
   varying vec2 vUv;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   void main(){
    vec2 c=vUv-.5;vec3 col;
    vec3 base=texture2D(tDiffuse,vUv).rgb;
    if(uShock>.01){
     // Radial surge: luminous structure is dragged toward the horizon while the
     // dark sky is left untouched, so the crossing never fogs over into a veil.
     vec3 acc=vec3(0.);
     for(int i=0;i<8;i++){
      float k=float(i)/7.;
      vec2 uv2=.5+c*(1.+k*.16*uShock);
      acc+=texture2D(tDiffuse,uv2).rgb;
     }
     acc/=8.;
     float lum=dot(base,vec3(.299,.587,.114));
     col=mix(base,acc,uShock*.78*clamp(lum*3.4,0.,1.));
     col=mix(col,col*vec3(.88,.94,1.1),uShock*.6);
     col*=1.-uShock*.3*smoothstep(.5,.95,length(c));
    } else col=base;
    if(uAberration>.001){
     // Lateral colour split grows toward the frame edge, like a real lens.
     vec2 off=c*(.0018*uAberration*(.3+dot(c,c)*3.2));
     col=vec3(texture2D(tDiffuse,vUv+off).r,col.g,texture2D(tDiffuse,vUv-off).b);
    }
    col*=1.-uVignette*smoothstep(.34,.92,length(c*vec2(uAspect/1.7778,1.))*1.2);
    col+=(hash(vUv*vec2(1920.,1080.)+fract(uTime)*97.3)-.5)*uGrain;
    col+=vec3(.55,.64,.78)*pow(uShock,3.)*.06;
    gl_FragColor=vec4(col,1.);
   }`,
};

export function createCinematicPass(): ShaderPass {
  return new ShaderPass(CinematicShader);
}
