// Numerical audit: production RK4 step against fine RK4, and Killing invariants.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),len=a=>Math.hypot(...a),add=(a,b,h)=>a.map((v,i)=>v+h*b[i]);
function rhs(y){const x=y.slice(0,3),p=y.slice(3),r=len(x),e=x.map(v=>v/r),a=1/Math.sqrt(r),q=len(p),ep=dot(e,p);return[...p.map((v,i)=>v/q-a*e[i]),...p.map((v,i)=>a/r*(v-1.5*e[i]*ep))];}
function inv(y){const x=y.slice(0,3),p=y.slice(3),r=len(x);return{E:len(p)-dot(x,p)/r**1.5,L:x[0]*p[1]-x[1]*p[0]};}
function run(r,angle,fine){let y=[r,0,0,-Math.cos(angle),-Math.sin(angle),0],maxE=0,maxL=0;const original=inv(y);let escaped=false;for(let i=0;i<(fine?30000:260);i++){const rr=len(y.slice(0,3));if(rr>90){escaped=true;break;}if(rr<.045||len(y.slice(3))>1e5)break;const h=-Math.min(3,Math.max(.002,rr*(fine?.004:.065))),k1=rhs(y);if(true){const k2=rhs(add(y,k1,h/2)),k3=rhs(add(y,k2,h/2)),k4=rhs(add(y,k3,h));y=y.map((v,j)=>v+h*(k1[j]+2*k2[j]+2*k3[j]+k4[j])/6);}else{y=add(y,rhs(add(y,k1,h/2)),h);}const now=inv(y);if(len(y.slice(3))<100){maxE=Math.max(maxE,Math.abs(now.E-original.E));maxL=Math.max(maxL,Math.abs(now.L-original.L));}}
return{escaped,direction:Math.atan2(-y[4],-y[3]),maxE,maxL};}
const results=[];for(const r of [.25,.5,.99,1,1.01,1.5,3,8,16,32])for(const angle of [.15,.5,1,1.5,2,2.5,3]){const a=run(r,angle,false),b=run(r,angle,true);results.push({r,angle,escaped:a.escaped,referenceEscaped:b.escaped,angleError:a.escaped&&b.escaped?Math.abs(Math.atan2(Math.sin(a.direction-b.direction),Math.cos(a.direction-b.direction))):null,energyError:a.maxE,angularMomentumError:a.maxL});}
const out={samples:results.length,classificationMismatches:results.filter(r=>r.escaped!==r.referenceEscaped),maxSkyAngleError:Math.max(...results.map(r=>r.angleError??0)),maxEnergyError:Math.max(...results.filter(r=>r.escaped).map(r=>r.energyError)),results};fs.writeFileSync('artifacts/pg-ray-audit.json',JSON.stringify(out,null,2));console.log(JSON.stringify({...out,results:undefined},null,2));



assert.equal(out.classificationMismatches.length,0);assert.ok(out.maxSkyAngleError<.002);assert.ok(out.maxEnergyError<.0001);

