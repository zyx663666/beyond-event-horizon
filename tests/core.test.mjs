import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as THREE from 'three';

// Test pure TS modules with existing tooling; no additional test framework.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function load(relative) {
  const filename = path.join(root, relative);
  const source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'three') return THREE;
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts')));
    throw new Error(`Unexpected runtime dependency: ${name}`);
  }, module, module.exports);
  return module.exports;
}
const { createConfig, validateConfig } = load('src/app/config.ts');
const { createStarCatalog } = load('src/scene/StarCatalog.ts');
const { CameraTrajectory } = load('src/camera/CameraTrajectory.ts');
const { FrameClock } = load('src/core/FrameClock.ts');
const { PerformanceMonitor } = load('src/debug/PerformanceMonitor.ts');
const { diskEmission, projectedRimRadius } = load('src/scene/diskProfile.ts');
const { ObserverRig } = load('src/observer/ObserverRig.ts');
const { SchwarzschildClock, StraightLinePropagation } = load('src/observer/models.ts');
const { SignalExperiment } = load('src/observer/SignalExperiment.ts');
const { ObserverSession } = load('src/observer/ObserverSession.ts');
const observer = () => ({ position: new THREE.Vector3(), orientation: new THREE.Quaternion(), velocity: new THREE.Vector3() });

test('quality configurations are isolated, target remains the default', () => {
  const preview = createConfig('?quality=preview');
  const target = createConfig();
  assert.equal(target.qualityName, 'target');
  assert.ok(target.quality.starCount > preview.quality.starCount);
  assert.deepEqual(target.disk, preview.disk);
  preview.quality.starCount = 1;
  assert.equal(createConfig('?quality=preview').quality.starCount, 4500);
});

test('invalid profiles, unsafe geometry, and non-finite capture times fail early', () => {
  for (const search of ['?quality=unknown', '?quality=__proto__', '?t=NaN', '?t=-1', '?t=Infinity']) assert.throws(() => createConfig(search));
  const config = createConfig();
  config.disk.innerRadius = config.blackHole.radius;
  assert.throws(() => validateConfig(config));
  const unsafe = createConfig();
  unsafe.camera.distance = 2;
  assert.throws(() => validateConfig(unsafe));
});

test('star catalogs are deterministic and retain the same prefix across quality levels', () => {
  const low = createStarCatalog(200, 760, 100);
  const high = createStarCatalog(800, 760, 100);
  assert.deepEqual(low, createStarCatalog(200, 760, 100));
  for (const key of Object.keys(low)) assert.deepEqual(low[key], high[key].slice(0, low[key].length));
  for (let i = 0; i < 200; i++) {
    assert.ok(Math.abs(Math.hypot(...low.positions.slice(i * 3, i * 3 + 3)) - 100) < 0.00002);
    assert.ok(low.sizes[i] > 0 && low.brightness[i] > 0);
  }
});

test('camera is bounded, frame-rate independent, and continuous at the loop seam', () => {
  const config = createConfig();
  const trajectory = new CameraTrajectory(config.camera);
  const state = observer();
  for (let t = 0; t <= 320; t += 0.5) {
    trajectory.sample(t, state);
    assert.ok(state.position.length() > config.disk.outerRadius * 1.4);
    assert.ok(Math.abs(state.orientation.length() - 1) < 1e-10);
    assert.ok(Number.isFinite(state.velocity.length()));
  }
  const first = observer(), last = observer();
  trajectory.sample(0, first);
  trajectory.sample(config.camera.period, last);
  assert.ok(first.position.distanceTo(last.position) < 1e-10);
  assert.ok(first.orientation.angleTo(last.orientation) < 1e-7);
  const direct = observer();
  trajectory.sample(42, direct);
  for (let i = 0; i <= 2520; i++) trajectory.sample(i / 60, state);
  assert.ok(direct.position.distanceTo(state.position) < 1e-10);
});

test('hidden-tab suspension excludes hidden time without advancing capture frames', () => {
  const clock = new FrameClock();
  assert.deepEqual(clock.tick(1000), { elapsed: 0, delta: 0 });
  assert.deepEqual(clock.tick(2000), { elapsed: 1, delta: 1 });
  clock.suspend();
  assert.deepEqual(clock.tick(200000), { elapsed: 1, delta: 0 });
  assert.deepEqual(clock.tick(200500), { elapsed: 1.5, delta: 0.5 });
  const capture = new FrameClock(42);
  assert.deepEqual(capture.tick(100), { elapsed: 42, delta: 0 });
  assert.deepEqual(capture.tick(50000), { elapsed: 42, delta: 0 });
});

test('performance monitor reports frame intervals independently of CPU submission', () => {
  const monitor = new PerformanceMonitor();
  monitor.record(0, 0.1);
  for (let i = 1; i <= 120; i++) monitor.record(i * 20, 0.5);
  assert.deepEqual(monitor.snapshot(), { fps: 50, mean: 20, p95: 20, cpu: 0.5 });
  monitor.reset();
  assert.equal(monitor.snapshot(), null);
});

test('disk emission respects the dark inner boundary, unit peak, and outward decay', () => {
  const inner = 1.48;
  assert.equal(diskEmission(inner, inner), 0);
  assert.equal(diskEmission(inner * 0.5, inner), 0);
  assert.ok(Math.abs(diskEmission(inner * 49 / 36, inner) - 1) < 1e-12);
  let previous = 1;
  for (let r = inner * 1.37; r < inner * 20; r += 0.03) {
    const flux = diskEmission(r, inner);
    assert.ok(flux > 0 && flux <= previous);
    previous = flux;
  }
});

test('optical rim projection matches sphere angular radius and rejects an internal observer', () => {
  const radius = 1.24;
  for (const distance of [3, 12, 50, 10000]) {
    assert.ok(Math.abs(Math.atan(projectedRimRadius(radius, distance) / distance) - Math.asin(radius / distance)) < 1e-12);
  }
  assert.throws(() => projectedRimRadius(radius, radius));
});

test('directed camera preserves position, orientation and lens continuity across all joins', () => {
  const config = createConfig();
  const trajectory = new CameraTrajectory(config.camera);
  for (const phase of [0, 0.24, 0.47, 0.73, 1]) {
    const time = phase * config.camera.period;
    const left = observer(), right = observer();
    trajectory.sample(time - 0.001, left);
    trajectory.sample(time + 0.001, right);
    assert.ok(left.position.distanceTo(right.position) < 1e-6);
    assert.ok(left.orientation.angleTo(right.orientation) < 1e-6);
    assert.ok(left.velocity.distanceTo(right.velocity) < 1e-5);
    assert.ok(Math.abs(trajectory.fieldOfViewAt(time - 0.001) - trajectory.fieldOfViewAt(time + 0.001)) < 1e-6);
  }
  for (let t = 0; t < config.camera.period; t += 0.5) {
    assert.ok(trajectory.fieldOfViewAt(t) >= 42 && trajectory.fieldOfViewAt(t) <= 46);
  }
});

test('optical and disk approximation bounds fail safely; rim can be disabled independently', () => {
  assert.equal(createConfig('?rim=0').optics.enabled, false);
  assert.deepEqual(createConfig('?rim=0').disk, createConfig().disk);
  for (const [section, key, value] of [['disk','beta',0.99], ['disk','thickness',-1], ['disk','turbulence',NaN], ['optics','width',1], ['camera','lensTightening',40]]) {
    const config = createConfig();
    config[section][key] = value;
    assert.throws(() => validateConfig(config));
  }
});

test('observer hold freezes translation but not the session, look and zoom leave position unchanged', () => {
  const rig = new ObserverRig(createConfig("?journey=orbit")), state = observer();
  rig.update({ delta: 10, elapsed: 10 }, state);
  const position = state.position.clone(), orientation = state.orientation.clone();
  rig.held = true;
  rig.look(100, -100); rig.setZoom(100);
  rig.update({ delta: 30, elapsed: 40 }, state);
  assert.ok(state.position.distanceTo(position) < 1e-12);
  assert.equal(state.velocity.length(), 0);
  assert.ok(state.orientation.angleTo(orientation) > 0.1);
  assert.equal(rig.zoom, 1.6);
  assert.ok(Math.abs(rig.pitch) <= 0.3 && Math.abs(rig.yaw) <= 0.48);
  rig.recenter(); rig.update({ delta: 0, elapsed: 40 }, state);
  assert.ok(state.orientation.angleTo(orientation) < 1e-7);
  rig.held = false; rig.update({ delta: 1, elapsed: 41 }, state);
  const expected = observer(); new CameraTrajectory(createConfig().camera).sample(11, expected);
  assert.ok(state.position.distanceTo(expected.position) < 1e-12);
});

test('untouched observer reproduces the 0.2 trajectory and capture configuration', () => {
  const config = createConfig("?journey=orbit"), base = new CameraTrajectory(config.camera), rig = new ObserverRig(config);
  const actual = observer(), expected = observer();
  for (let t = 1; t <= 180; t++) {
    rig.update({ elapsed: t, delta: 1 }, actual); base.sample(t, expected);
    assert.ok(actual.position.distanceTo(expected.position) < 1e-12);
    assert.ok(actual.orientation.angleTo(expected.orientation) < 1e-7);
    assert.ok(Math.abs(rig.fieldOfView - base.fieldOfViewAt(t)) < 1e-12);
  }
  const frozen = new ObserverRig(createConfig('?journey=orbit&t=84'));
  frozen.update({ elapsed: 84, delta: 0 }, actual); base.sample(84, expected);
  assert.ok(actual.position.distanceTo(expected.position) < 1e-12);
  assert.ok(actual.velocity.distanceTo(expected.velocity)<1e-12);
});

test('clock recovers static Schwarzschild and moving radial/transverse limits', () => {
  const clock = new SchwarzschildClock(1, 4), state = observer();
  state.position.set(10, 0, 0);
  assert.ok(Math.abs(clock.rate(state) - Math.sqrt(0.9)) < 1e-12);
  state.velocity.set(0, 1, 0);
  assert.ok(Math.abs(clock.rate(state) - Math.sqrt(0.9 - 1 / 16)) < 1e-12);
  state.velocity.set(1, 0, 0);
  assert.ok(Math.abs(clock.rate(state) - Math.sqrt(0.9 - 1 / (16 * 0.9))) < 1e-12);
  state.position.set(1, 0, 0); assert.throws(() => clock.rate(state));
  state.position.set(10, 0, 0); state.velocity.set(10, 0, 0); assert.throws(() => clock.rate(state));
});

test('proper-time integration converges across frame rates and cannot advance on suspended frames', () => {
  const run = fps => {
    const c = createConfig(), rig = new ObserverRig(c), state = observer();
    const signal = new SignalExperiment(new THREE.Vector3(...c.observation.beacon), new StraightLinePropagation(4), 0.4);
    const session = new ObserverSession(new SchwarzschildClock(1, 4), signal);
    rig.update({ elapsed: 0, delta: 0 }, state); session.update(0, state);
    for (let i = 1; i <= 180 * fps; i++) {
      rig.update({ elapsed: i / fps, delta: 1 / fps }, state); session.update(1 / fps, state);
    }
    const time = session.properTime; session.update(0, state);
    assert.equal(session.properTime, time);
    assert.ok(session.properTime < session.referenceTime && session.properTime > 170);
    return session.properTime;
  };
  assert.ok(Math.abs(run(30) - run(120)) < 1e-5);
});

test('signal causal order, duplicate protection and stationary round trip survive a long frame', () => {
  const events = [], origin = new THREE.Vector3(), beacon = new THREE.Vector3(12, 0, 0);
  const signal = new SignalExperiment(beacon, new StraightLinePropagation(4), 0.4, e => events.push(e));
  assert.equal(signal.transmit(0, 0, origin), true);
  assert.equal(signal.transmit(1, 1, origin), false);
  signal.update(0, 2, origin, origin, 0, 1.8);
  assert.deepEqual(events.map(e => e.type), ['transmitted']);
  signal.update(2, 20, origin, origin, 1.8, 18);
  assert.deepEqual(events.map(e => e.type), ['transmitted', 'relay-received', 'relay-replied', 'received']);
  assert.ok(Math.abs(signal.packet.received - 6.4) < 1e-8);
  assert.ok(Math.abs(signal.packet.receivedProper - 5.76) < 1e-8);
  assert.equal(signal.progress(20, origin), 1);
  assert.equal(signal.transmit(21, 19, origin), true);
});

test('return wave intercepts a moving receiver instead of reusing launch distance', () => {
  const run = dt => {
    const signal = new SignalExperiment(new THREE.Vector3(12, 0, 0), new StraightLinePropagation(4), 0.4);
    signal.transmit(0, 0, new THREE.Vector3());
    for (let t = dt; t < 10 + dt; t += dt) signal.update(t - dt, t, new THREE.Vector3((t - dt) * 0.5, 0, 0), new THREE.Vector3(t * 0.5, 0, 0), (t - dt) * 0.95, t * 0.95);
    return signal.packet.received;
  };
  // c(t - 3.4) = 12 - 0.5t -> t = 25.6 / 4.5.
  assert.ok(Math.abs(run(1 / 30) - 25.6 / 4.5) < 1e-8);
  assert.ok(Math.abs(run(1 / 120) - run(1 / 30)) < 1e-8);
});

const { captureAngle, escapeAzimuth, sampleTransfer, LUT } = load('src/lensing/geodesic.ts');
const { ApproachTrajectory } = load('src/camera/ApproachTrajectory.ts');
const transferBytes = fs.readFileSync(path.join(root, 'public/lensing/schwarzschild.bin'));
const transfer = new Float32Array(transferBytes.buffer.slice(transferBytes.byteOffset, transferBytes.byteOffset + transferBytes.byteLength));
test('null rays reproduce analytic capture cone and weak-field flat limit', () => {
  for (const r of [8, 16, 40, 96]) {
    const edge = captureAngle(r);
    assert.equal(escapeAzimuth(r, edge * 0.99), null);
    assert.ok(escapeAzimuth(r, edge + 0.001) > Math.PI);
    assert.equal(escapeAzimuth(r, Math.PI), 0);
  }
  assert.ok(Math.abs(escapeAzimuth(1e7, 1) - (Math.PI - 1)) < 1e-6);
});
test('RK4 refinement and deployed lookup agree for independently sampled escaping rays', () => {
  assert.equal(transfer.length, LUT.width * LUT.height);
  assert.ok(transfer.every(Number.isFinite));
  let worst = 0;
  for (const r of [8, 9.3, 16.7, 33.2, 54.6, 80, 96]) {
    for (const offset of [0.001, 0.01, 0.04, 0.2, 0.8, 1.7, 2.7]) {
      const alpha = captureAngle(r) + offset;
      const fine = escapeAzimuth(r, alpha, 0.003);
      assert.ok(Math.abs(escapeAzimuth(r, alpha) - fine) < 0.00002);
      worst = Math.max(worst, Math.abs(sampleTransfer(transfer, r, alpha) - fine));
    }
  }
  console.log('Sampled LUT max azimuth error (rad):', worst);
  assert.ok(worst < 0.003);
  assert.throws(() => sampleTransfer(transfer, 120, 1));
});
test('five-minute approach remains timelike, monotonic, continuous and ends in an external hold', () => {
  const c = createConfig(), track = new ApproachTrajectory(c.journey), state = observer();
  const clock = new SchwarzschildClock(c.observation.schwarzschildRadius, c.observation.signalSpeed);
  let previous = Infinity;
  for (let t = 0; t <= 310; t += 0.25) {
    track.sample(t, state);
    const radius = state.position.length();
    assert.ok(radius <= previous + 1e-10 && radius >= c.journey.nearRadius - 1e-10);
    assert.ok(clock.rate(state) > 0 && clock.rate(state) <= 1);
    previous = radius;
  }
  for (const time of [66, 135, 225, 282, 300]) {
    const a = observer(), b = observer();track.sample(time-0.001,a);track.sample(time+0.001,b);
    assert.ok(a.position.distanceTo(b.position) < 1e-6);
    assert.ok(a.velocity.distanceTo(b.velocity) < 1e-5);
  }
  assert.equal(state.velocity.length(),0);
  const rig = new ObserverRig(c);rig.update({delta:400,elapsed:400},state);
  assert.equal(rig.arrived,true);assert.equal(rig.journeyTime,300);
});

test('deployed lensing asset matches its reproducible metadata checksum', async () => {
  const { createHash } = await import('node:crypto');
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'public/lensing/metadata.json'), 'utf8'));
  assert.equal(createHash('sha256').update(transferBytes).digest('hex'), metadata.sha256);
  assert.equal(metadata.width, LUT.width); assert.equal(metadata.height, LUT.height);
});

const { ORBIT, orbitAlpha, orbitQ, orbitSamples, sampleOrbit } = load('src/lensing/orbit.ts');
const { connectRadii } = load('src/lensing/connection.ts');
const { SchwarzschildSpacetime } = load('src/observer/SchwarzschildSpacetime.ts');
const { SchwarzschildPropagation } = load('src/observer/SchwarzschildPropagation.ts');
test('shared tetrad clock and aberration recover SR and static gravitational limits', () => {
  const model = new SchwarzschildSpacetime(1,4), state=observer();state.position.set(10,0,0);state.velocity.set(-0.2,0.1,0);
  assert.ok(Math.abs(model.properRate(state)-new SchwarzschildClock(1,4).rate(state))<1e-12);
  const sight=new THREE.Vector3(-1,0.2,0.3).normalize(),beta=model.localBeta(state);
  assert.ok(model.aberrate(model.aberrate(sight,beta),beta,true).distanceTo(sight)<1e-12);
  assert.ok(model.receiverFactor(sight,beta)>1);
  assert.equal(model.circularBeta(3),0.5);
  state.position.set(1,0,0);assert.throws(()=>model.properRate(state));
});
test('finite endpoint solver reproduces radial delay and independent orbit endpoint/time', () => {
  const radial=connectRadii(32,8,0);
  assert.ok(Math.abs(radial.time-(24+Math.log(31/7)))<1e-12);
  for(const [a,b,angle] of [[67,12.4,1.7],[15,12.4,1.1],[18,18,2.8],[8,32,0.8],[40,10,0.2],[20,8,Math.PI]]) {
    const path=connectRadii(a,b,angle);
    assert.ok(Math.abs(path.angle-angle)<1e-6);
    assert.ok(path.time>Math.sqrt(a*a+b*b-2*a*b*Math.cos(angle)));
    assert.ok(Math.abs(connectRadii(b,a,angle).time-path.time)<1e-9);
    const localSin=path.impact*Math.sqrt(1-1/a)/a;
    const alpha=path.turning||a>b?Math.asin(Math.min(1,localSin)):Math.PI-Math.asin(Math.min(1,localSin));
    const integrated=orbitSamples(a,alpha,angle,2);
    assert.ok(Math.abs(1/integrated[2]-b)<0.002,`endpoint: ${a},${b},${angle} got ${1/integrated[2]}`);
    assert.ok(Math.abs(integrated[3]-path.time)<0.002,`time: ${integrated[3]} vs ${path.time}`);
  }
});
test('orbit angle mapping resolves both sides of capture boundary', () => {
  for(const radius of [8,33,96]) for(const q of [0,0.1,0.249,0.25,0.251,0.4,0.8,1]) {
    assert.ok(Math.abs(orbitQ(radius,orbitAlpha(radius,q))-q)<1e-7);
  }
});
test('curved communication retains causal event ordering and moving interception', () => {
  const model=new SchwarzschildSpacetime(0.477,4),transport=new SchwarzschildPropagation(model),beacon=new THREE.Vector3(5.5,2.2,0);
  const events=[],signal=new SignalExperiment(beacon,transport,0.4/Math.sqrt(model.lapse(beacon.length())),e=>events.push(e));
  const launch=new THREE.Vector3(-10,7,30),destination=new THREE.Vector3(-9,7,29);
  signal.transmit(0,0,launch);
  signal.update(0,25,launch,destination,0,24.7);
  assert.equal(signal.packet.phase,'received');
  assert.deepEqual(events.map(e=>e.type),['transmitted','relay-received','relay-replied','received']);
  assert.ok(signal.packet.relayArrival>launch.distanceTo(beacon)/4);
  assert.ok(signal.packet.received>signal.packet.returnStart);
});

test('deployed half-float orbit table matches independent integration in emissive region', async () => {
  const { gunzipSync } = await import('node:zlib');const { createHash } = await import('node:crypto');
  const bytes=gunzipSync(fs.readFileSync(path.join(root,'public/lensing/orbits.dat')));
  const metadata=JSON.parse(fs.readFileSync(path.join(root,'public/lensing/orbits.json'),'utf8'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),metadata.sha256);
  const data=new Uint16Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  let radiusError=0,timeError=0,hits=0;
  for(const radius of [8,15.1,22.6,33.3,54.6,67.05,96]) {
    for(let i=0;i<35;i++) {
      const alpha=captureAngle(radius)*(0.7+i*0.12);
      for(const phi of [0.21,0.4,0.8,1.4,2,2.8,3.5,4.2,5.2]){
        const direct=orbitSamples(radius,alpha,phi,2),r=1/direct[2];
        if(r<3.1||r>10)continue;
        const sampled=sampleOrbit(data,radius,alpha,phi);hits++;
        radiusError=Math.max(radiusError,Math.abs(1/sampled.u-r)/r);
        timeError=Math.max(timeError,Math.abs(sampled.time-direct[3]));
      }
    }
  }
  console.log('Orbit emissive-region samples / max relative radius / max ct/Rs error:',hits,radiusError,timeError);
  assert.ok(hits>200);assert.ok(radiusError<0.006);assert.ok(timeError<0.28);
});
