import { BufferGeometry, Float32BufferAttribute, Group, LineLoop, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, RingGeometry, SRGBColorSpace, TextureLoader, Vector3, Color, type ShaderMaterial, type Texture } from 'three';
import { ParticleVolume, seeded, type Particle } from './ParticleVolume';
import { Planet, atmosphere, luminousStar } from './Planet';
import { journeyPose, ease } from './route';
import { NebulaVolume } from './NebulaVolume';
const fade = (a: number, b: number, t: number) => ease((t - a) / (b - a));
/** Shared spatial stage for the entire prelude. No scene texture is swapped on chapter boundaries. */
export class CosmicJourney {
  readonly object = new Group();
  private readonly earth = new Planet(1);
  private readonly clouds = new Planet(1.008, 1);
  private readonly airRim=atmosphere(1.019);
  private readonly airHaze=atmosphere(1.039,true);
  private opening=false;
  private readonly moon = new Planet(.18, 2);
  private readonly sun = luminousStar(2.8, new Vector3(1.5, .83, .32));
  private readonly solar = new Group();
  private readonly binary = new Group();
  private readonly binaryStars = [luminousStar(2.5, new Vector3(.45, .74, 1.4)), luminousStar(3.4, new Vector3(1.35, .55, .17))];
  private readonly pulsar = new Group();
  private readonly beacon = new Group();
  private readonly volumes: ParticleVolume[] = [];
  private readonly galaxy: ParticleVolume;
  private readonly dustLane: ParticleVolume;
  private readonly nursery: ParticleVolume;
  private readonly darkPillars: ParticleVolume;
  private readonly nurseryLights: ParticleVolume;
  private readonly filamentDetail: ParticleVolume;
  private readonly youngStars: ParticleVolume;
  private readonly remnant: ParticleVolume;
  private readonly jets: ParticleVolume;
  private readonly navigationStars: ParticleVolume;
  private readonly streaks: LineSegments;
  private readonly planets: { mesh: Mesh; radius: number; phase: number; index: number }[] = [];
  private earthTexture: Texture | null = null;
  private disposed = false;
  private readonly nurseryVolume:NebulaVolume;
  private readonly shellVolume:NebulaVolume;
  private readonly cluster:ParticleVolume;
  private readonly interstellarDust:ParticleVolume;
  private readonly transient:ParticleVolume;
  constructor(volumeSteps=40) {
    const rng = seeded(7170);
    this.nurseryVolume=new NebulaVolume([0,0,-400],[128,65,105],false,volumeSteps);
    this.shellVolume=new NebulaVolume([80,140,-1820],[94,72,94],true,volumeSteps);
    this.object.add(this.nurseryVolume.object,this.shellVolume.object);
    const cluster:Particle[]=[],grains:Particle[]=[];
    for(let i=0;i<1000;i++){const a=rng()*6.28,z=rng()*2-1,r=Math.pow(rng(),2)*58;cluster.push({p:[115+Math.cos(a)*Math.sqrt(1-z*z)*r,-45+z*r,-665+Math.sin(a)*Math.sqrt(1-z*z)*r],size:.12+rng()*.42,color:i%4?'#e2d7c1':'#9bbddd',gain:.25+rng()*.8});}
    for(let i=0;i<430;i++)grains.push({p:[(rng()-.5)*900,(rng()-.5)*540,-100-rng()*2200],size:4+rng()*14,color:'#182735'});
    this.cluster=new ParticleVolume(cluster);this.interstellarDust=new ParticleVolume(grains,true);
    this.transient=new ParticleVolume([{p:[-150,65,-820],size:4.5,color:'#aecce0',gain:.7}]);
    this.volumes.push(this.cluster,this.interstellarDust,this.transient);this.object.add(this.cluster.object,this.interstellarDust.object,this.transient.object);
    this.object.add(this.earth.object, this.clouds.object, this.airRim, this.airHaze, this.moon.object, this.solar, this.binary, this.pulsar);
    this.sun.position.set(-18, 0, 12); this.solar.add(this.sun);
    const sunHalo = new ParticleVolume([{ p: [-18, 0, 12], size: 18, color: '#ffce84' }]); this.volumes.push(sunHalo); this.solar.add(sunHalo.object);
    const orbitRadii = [6, 10, Math.hypot(18, 12), 29, 42, 53, 65, 76];
    for (let i = 0; i < 8; i++) {
      const radius = orbitRadii[i], vertices: number[] = [];
      for (let j = 0; j < 160; j++) { const a = j / 160 * Math.PI * 2; vertices.push(-18 + Math.cos(a) * radius, 0, 12 + Math.sin(a) * radius); }
      const orbit = new LineLoop(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(vertices, 3)), new LineBasicMaterial({ color: '#294c5a', transparent: true, opacity: .36 })); this.solar.add(orbit);
      if (i === 2) continue;
      const colors = ['#a7a39b', '#c9b89b', '', '#b76a44', '#c9ad88', '#d4b983', '#81b4c3', '#526ca8'];
      const planet = new Planet(i === 4 ? 1.55 : i === 5 ? 1.2 : .33, i>=4?3:2); planet.material.uniforms.uLight.value = new Vector3();
      const mesh = planet.object; this.solar.add(mesh); this.planets.push({ mesh, radius, phase: i * 1.87, index: i });
      // Low-cost tinted rock/gas proxies; size and orbital time are deliberately compressed.
      const tint=new Color(colors[i]);planet.uniforms.uTint.value.set(tint.r,tint.g,tint.b).multiplyScalar(1.8);planet.material.transparent=true;
      if (i === 5) { const ring = new Mesh(new RingGeometry(1.6, 2.7, 80), new MeshBasicMaterial({ color: '#9c896b', transparent: true, opacity: .47, side: 2, depthWrite: false })); ring.rotation.x = Math.PI / 2 + .15; mesh.add(ring); }
    }
    const field: Particle[] = [], linePositions: number[] = [];
    for (let i = 0; i < 4500; i++) { const p = [(rng() - .5) * 850, (rng() - .35) * 540, 190 - rng() * 2900]; const lum=rng();field.push({ p, size: .09 + Math.pow(lum,4)*.7, color: i%7===0?'#d4a26e':i%4===0?'#d6d5c3':'#9ab6ce',gain:.14+Math.pow(lum,3)*1.4 }); if (i < 620) linePositions.push(...p, p[0], p[1], p[2] + 16 + rng() * 27); }
    this.navigationStars = new ParticleVolume(field); this.volumes.push(this.navigationStars); this.object.add(this.navigationStars.object);
    this.streaks = new LineSegments(new BufferGeometry().setAttribute('position', new Float32BufferAttribute(linePositions, 3)), new LineBasicMaterial({ color: '#9fb3c6', transparent: true, opacity: 0, depthWrite: false })); this.object.add(this.streaks);
    const galactic: Particle[] = [], dust: Particle[] = [];
    for (let i = 0; i < 20000; i++) {
      const r = Math.pow(rng(), .72) * 1100, arm = i % 4, a = r * .0057 + arm * Math.PI / 2 + (rng() - .5) * .44;
      const p = [-360 + Math.cos(a) * r, -28 + (rng() - .5) * (35 + r * .04), -1450 + Math.sin(a) * r];
      galactic.push({ p, size: .42 + rng() * 1.2, color: r < 180 ? '#d9b985' : rng() > .84 ? '#d9c9b0' : '#7196bd' });
      if (i < 420) dust.push({ p, size: 35 + rng() * 65, color: '#282c32' });
    }
    this.galaxy = new ParticleVolume(galactic); this.dustLane = new ParticleVolume(dust, true); this.volumes.push(this.galaxy, this.dustLane); this.object.add(this.galaxy.object, this.dustLane.object);
    const cloud: Particle[] = [], young: Particle[] = [];
    for (let i = 0; i < 1100; i++) {
      const x = (rng() - .5) * 210, y = Math.sin(x * .023) * 20 + (rng() - .5) * 72, z = -400 + (rng() - .5) * 160;
      cloud.push({ p: [x, y, z], size: 10 + rng() * 27, color: Math.sin(x*.025+z*.019)>.2?'#976044':'#2c5c78' });
      if (i < 140) young.push({ p: [x * .47, y * .65, z], size: .6 + rng() * 1.5, color: '#b9d8f2' });
    }
    this.nursery = new ParticleVolume(cloud, true); this.youngStars = new ParticleVolume(young); this.volumes.push(this.nursery, this.youngStars); this.object.add(this.nursery.object, this.youngStars.object);
    const dark:Particle[]=[];
    for(let i=0;i<280;i++){const column=i%3,y=rng()*82-42;dark.push({p:[(column-1)*30+Math.sin(y*.07+column)*7,y,-352+column*12+rng()*9],size:8+rng()*10,color:'#090f15'});}
    this.darkPillars=new ParticleVolume(dark,true);this.volumes.push(this.darkPillars);this.object.add(this.darkPillars.object);
    this.nurseryLights = new ParticleVolume([{ p: [-28, -4, -426], size: 24, color: '#a6d2ef' }, { p: [26, 9, -410], size: 18, color: '#deb887' }]); this.volumes.push(this.nurseryLights); this.object.add(this.nurseryLights.object);
    this.binary.position.set(50, 0, -1080); this.binary.add(...this.binaryStars);
    this.binaryStars.forEach((star,i)=>{const halo=new ParticleVolume([{p:[0,0,0],size:i?19:16,color:i?'#e8aa64':'#8dbfe0'}]);this.volumes.push(halo);star.add(halo.object);});
    this.pulsar.position.set(80, 140, -1820); this.pulsar.add(luminousStar(.9, new Vector3(.55, .85, 1.6)), this.beacon);
    const shell: Particle[] = [], jet: Particle[] = [];
    for (let i = 0; i < 2300; i++) {
      const a = rng() * Math.PI * 2, latitude = (rng() - .5) * Math.PI, r = 69 + 9 * Math.sin(a * 11) + rng() * 14;
      const p = [Math.cos(a) * Math.cos(latitude) * r, Math.sin(latitude) * r * .65, Math.sin(a) * Math.cos(latitude) * r];
      shell.push({ p, size: 2.4 + rng() * 5.7, color: i % 3 ? '#558fbd' : '#ca7453' });
      if (i < 700) { const distance = rng() * 105, phi = rng() * 6.28, spread = distance * .046 + .4; jet.push({ p: [Math.cos(phi) * spread, (i % 2 ? 1 : -1) * distance, Math.sin(phi) * spread], size: .24 + rng() * .72, color: '#71c3e5' }); }
    }
    this.remnant = new ParticleVolume(shell,true); this.jets = new ParticleVolume(jet); this.volumes.push(this.remnant, this.jets); this.pulsar.add(this.remnant.object); this.beacon.add(this.jets.object);
    const filaments:Particle[]=[];
    for(let i=0;i<75;i++){
      const start=rng()*6.28,span=.22+rng()*1.05,lat=(rng()-.5)*2.3,c=i%3?'#5487a1':'#bc653f';
      for(let j=0;j<85;j++){const a=start+j/84*span,latitude=lat+Math.sin(a*4+i)*.08,r=73+Math.sin(a*11+i)*3.5;
       for(let k=0;k<2;k++)filaments.push({p:[Math.cos(a)*Math.cos(latitude)*r+(rng()-.5)*1.1,Math.sin(latitude)*r*.65+(rng()-.5)*1.1,Math.sin(a)*Math.cos(latitude)*r+(rng()-.5)*1.1],size:.4+rng()*.7,color:c,gain:.08+rng()*.11});
      }
    }
    this.filamentDetail=new ParticleVolume(filaments);this.volumes.push(this.filamentDetail);this.pulsar.add(this.filamentDetail.object);
    this.update(0);
  }
  async prepare() { if (this.earthTexture) return; const tex = await new TextureLoader().loadAsync(`${import.meta.env.BASE_URL}cosmos/earth-blue-marble.png`); if (this.disposed) { tex.dispose(); return; } tex.colorSpace = SRGBColorSpace; tex.anisotropy = 4; this.earthTexture = tex; this.earth.uniforms.uMap.value = tex; }
  update(t: number) {
    if(this.opening){this.object.children.forEach(o=>o.visible=true);this.opening=false;}
    this.earth.uniforms.uReveal.value=1;this.clouds.uniforms.uOpacity.value=1;this.airRim.material.uniforms.uReveal.value=1;this.airHaze.material.uniforms.uReveal.value=1;
    this.object.visible = t < 144; if (!this.object.visible) return;
    this.earth.object.rotation.y = .34 + t * .018; this.clouds.object.rotation.y = .48 + t * .024; this.earth.uniforms.uTime.value = t; this.clouds.uniforms.uTime.value = t;
    this.earth.object.rotation.z=.12;this.clouds.object.rotation.z=.12;
    this.moon.object.position.set(Math.cos(.6 + t * .012) * 3.1, .12, Math.sin(.6 + t * .012) * 3.1); this.moon.object.rotation.y = t * .01;
    (this.sun.material as ShaderMaterial).uniforms.uTime.value = t;
    for (const p of this.planets) { const a = p.phase + t * .013 / Math.pow(p.index + 1, .6); p.mesh.position.set(-18 + Math.cos(a) * p.radius, 0, 12 + Math.sin(a) * p.radius);p.mesh.rotation.y=t*.035/Math.pow(p.index+1,.25);const material=p.mesh.material as ShaderMaterial;material.uniforms.uLight.value.copy(this.sun.position).sub(p.mesh.position).normalize();material.uniforms.uTime.value=t;material.uniforms.uOpacity.value=fade(27,42,t);p.mesh.visible=t>27; }
    this.solar.children.forEach(o=>{if(o instanceof LineLoop)(o.material as LineBasicMaterial).opacity=.22*fade(28,44,t);});
    const a = (t - 94) * .29;
    this.binaryStars[0].position.set(Math.cos(a) * 14, Math.sin(a) * 3.4, Math.sin(a) * 14); this.binaryStars[1].position.copy(this.binaryStars[0].position).multiplyScalar(-.72);
    this.binaryStars.forEach(s => { (s.material as ShaderMaterial).uniforms.uTime.value = t; s.rotation.y = t * .2; });
    this.beacon.rotation.set(.45, (t - 110) * 1.75, .65); this.remnant.object.rotation.y = (t - 110) * .0015;
    for (const v of this.volumes) v.update(t);
    this.galaxy.update(t, fade(47, 65, t) * (1 - fade(108, 127, t)) * .85); this.dustLane.update(t, fade(50, 67, t) * (1 - fade(108, 127, t)) * .7);
    const front = 1 - fade(129, 143, t); this.navigationStars.update(t, front * fade(40, 65, t) * .74);
    (this.streaks.material as LineBasicMaterial).opacity = journeyPose(t).transit * .22 * front;
    // Dust and stars inhabit one continuous stage; distant nodes become visible through approach, not image swaps.
    const nebulaVisibility=fade(62,78,t);this.nursery.update(t,.29*nebulaVisibility);this.nurseryVolume.update(t,.9*nebulaVisibility);this.youngStars.update(t,.9*nebulaVisibility);this.darkPillars.update(t,nebulaVisibility);
    this.nurseryLights.update(t,nebulaVisibility);
    const pulsarVisibility=fade(101,113,t);this.remnant.update(t,pulsarVisibility*.3);this.shellVolume.update(t,pulsarVisibility*.72);this.filamentDetail.update(t,pulsarVisibility*.46);
    this.cluster.update(t,fade(48,65,t)*(1-fade(121,135,t))*.6);this.interstellarDust.update(t,fade(45,63,t)*(1-fade(123,136,t))*.12);this.transient.update(t,fade(65,68,t)*(1-fade(70,75,t))*.38);
    this.jets.update(t, pulsarVisibility*(.45 + .15 * Math.pow(.5 + .5 * Math.cos(t * 3.5), 8)));
  }
  revealOrigin(s:{rim:number;haze:number;clouds:number;surface:number},age:number){
    this.opening=true;const layers=[this.earth.object,this.clouds.object,this.airRim,this.airHaze];
    this.object.children.forEach(o=>o.visible=layers.includes(o as Mesh));
    this.earth.uniforms.uReveal.value=s.surface;this.clouds.uniforms.uOpacity.value=s.clouds;
    this.airRim.material.uniforms.uReveal.value=s.rim;this.airHaze.material.uniforms.uReveal.value=s.haze;
    // A slow, independent cloud drift joins the established departure without a cut.
    this.earth.object.rotation.y=.34+(age-36)*.004;this.clouds.object.rotation.y=.48+(age-36)*.0055;
  }
  resize(height: number, pixelRatio: number) { this.volumes.forEach(v => v.resize(height, pixelRatio)); }
  dispose() {
    this.disposed = true; this.nurseryVolume.dispose();this.shellVolume.dispose();this.earthTexture?.dispose(); this.volumes.forEach(v => v.dispose());
    this.object.traverse(o => { if (o instanceof Mesh || o instanceof LineLoop || o instanceof LineSegments) { o.geometry.dispose(); const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(x => x.dispose()); } });
  }
  get loadedSurface() { return this.earthTexture !== null; }
}




