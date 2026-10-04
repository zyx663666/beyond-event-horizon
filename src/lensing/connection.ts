/** Finite-endpoint primary null geodesic. Static exterior; dimensionless Rs=1. */
export interface Connection { time: number; impact: number; pericenter: number | null; angle: number; turning: boolean }
// Generate Gauss-Legendre nodes once; no endpoint singularity is evaluated directly.
const N=40;
const nodes: number[]=[], weights: number[]=[];
for(let i=0;i<N;i++) {
  let x=Math.cos(Math.PI*(i+0.75)/(N+0.5)),derivative=0;
  for(let j=0;j<12;j++) {
    let p0=1,p1=x;
    for(let k=2;k<=N;k++){const p=((2*k-1)*x*p1-(k-1)*p0)/k;p0=p1;p1=p;}
    derivative=N*(x*p1-p0)/(x*x-1);
    const next=x-p1/derivative;if(Math.abs(next-x)<1e-15){x=next;break;}x=next;
  }
  nodes.push(x);weights.push(2/((1-x*x)*derivative*derivative));
}
function leg(low:number,high:number,b:number,base=low): [number,number] {
  if(high<=low)return[0,0];
  // r=base+x² regularizes an outer radial turning point.
  const start=Math.sqrt(Math.max(0,low-base)),end=Math.sqrt(high-base),scale=(end-start)/2,mid=(end+start)/2;
  let angle=0,time=0;
  for(let i=0;i<N;i++){
    const x=mid+scale*nodes[i],r=base+x*x,f=1-1/r;
    const denominator=Math.sqrt(Math.max(1e-15,1-b*b*f/(r*r)));
    const w=weights[i]*scale*2*x/denominator;
    angle+=w*b/(r*r);time+=w/f;
  }
  return[angle,time];
}
export function connectRadii(rA:number,rB:number,angle:number): Connection {
  if(!(rA>1.5&&rB>1.5&&angle>=0&&angle<=Math.PI&&Number.isFinite(rA+rB+angle)))throw new Error('Connection outside static primary-path domain');
  const low=Math.min(rA,rB),high=Math.max(rA,rB);
  if(angle<1e-10){return{time:high-low+Math.log((high-1)/(low-1)),impact:0,pericenter:null,angle:0,turning:false};}
  const maximum=low/Math.sqrt(1-1/low),mono=leg(low,high,maximum);
  if(angle<=mono[0]){
    let a=0,b=maximum;
    for(let i=0;i<32;i++){const mid=(a+b)/2;if(leg(low,high,mid)[0]<angle)a=mid;else b=mid;}
    const impact=(a+b)/2,integral=leg(low,high,impact);
    return{time:integral[1],impact,pericenter:null,angle:integral[0],turning:false};
  }
  let a=1.50001,b=low;
  const integrals=(peri:number)=>{const impact=peri/Math.sqrt(1-1/peri),one=leg(peri,high,impact),two=leg(peri,low,impact);return{impact,angle:one[0]+two[0],time:one[1]+two[1]};};
  for(let i=0;i<34;i++){const mid=(a+b)/2;if(integrals(mid).angle>angle)a=mid;else b=mid;}
  const pericenter=(a+b)/2,result=integrals(pericenter);
  return{...result,pericenter,turning:true};
}
