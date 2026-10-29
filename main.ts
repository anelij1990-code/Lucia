import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import { material, colors, shape, makeDog, makeSquirrel, makeTruck, makeBone } from './models';
const $ = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;
// Diagnostics are exported for browser integration tests; no network or globals.
export const diagnostic: {
  step?: (dt: number) => void;
  state?: () => { mode: string; score: number; caught: number; bones: number; time: number; boost: number; slow: number };
  dog?: ReturnType<typeof makeDog>;
  squirrels?: { mesh: T.Group; mode: string }[];
  trucks?: ReturnType<typeof makeTruck>[];
  pickups?: { mesh: T.Group; boost: boolean; timer: number }[];
  obstacles?: { x: number; z: number; r: number; puddle?: boolean }[];
} = {};

function boot() {
  const canvas = $<HTMLCanvasElement>('world');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const scene = new T.Scene(); scene.background = new T.Color(0xc5d5b6); scene.fog = new T.FogExp2(0xc5d5b6, .019);
  scene.add(new T.HemisphereLight(0xffedc6, 0x3d5434, 2));
  const sun = new T.DirectionalLight(0xffdfad, 3); sun.position.set(-15, 25, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 80 });
  sun.shadow.normalBias = .04; scene.add(sun, sun.target);
  const camera = new T.PerspectiveCamera(48, innerWidth / innerHeight, .1, 140);
  const staticGroup = new T.Group(); scene.add(staticGroup);
  const obstacles: { x: number; z: number; r: number; puddle?: boolean }[] = [];
  const trees: T.Vector3[] = [];
  const path = (z: number) => Math.sin(z * .075) * 6;
  let seed = 1234;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  shape(staticGroup, material(0x788c49), [0, -.12, 0], [110, .2, 110], true);
  const pathMat = material(0xc8b081);
  for (let i = 0; i < 100; i++) {
    const z = -50 + i, x = path(z), next = path(z + 1);
    const tile = shape(staticGroup, pathMat, [(x + next) / 2, .005, z + .5], [5.8, .035, 1.16], true);
    tile.rotation.y = Math.atan2(next - x, 1);
  }
  for (let i = 0; i < 80; i++) {
    const a = i / 80 * Math.PI * 2;
    const tile = shape(staticGroup, pathMat, [Math.sin(a) * 25, .003, Math.cos(a) * 25], [5, .03, 2.1], true); tile.rotation.y = a;
  }
  for (let i = 0; i < 185; i++) {
    const x = (random() - .5) * 105, z = (random() - .5) * 105;
    if (Math.abs(x - path(z)) < 4.5 || Math.abs(Math.hypot(x, z) - 25) < 3.5 || Math.hypot(x, z - 6) < 7) continue;
    const h = 8 + random() * 7;
    shape(staticGroup, colors.trunk, [x, h / 2, z], [.4, h / 2, .4]);
    for (let j = 0; j < 4; j++) {
      const mesh = new T.Mesh(new T.ConeGeometry(2.5 - j * .47, h * .4, 7), i % 2 ? colors.leaf : colors.lightLeaf);
      mesh.position.set(x, h * (.48 + j * .14), z); mesh.castShadow = true; staticGroup.add(mesh);
    }
    trees.push(new T.Vector3(x, 0, z)); obstacles.push({ x, z, r: .63 });
  }
  for (let i = 0; i < 55; i++) {
    const x = (random() - .5) * 96, z = (random() - .5) * 96;
    if (Math.abs(x - path(z)) < 4 || Math.hypot(x, z - 6) < 7 || Math.abs(Math.hypot(x, z) - 25) < 3.5) continue;
    for (let j = 0; j < 3; j++) shape(staticGroup, colors.lightLeaf, [x + (random() - .5), .45, z + (random() - .5)], [.7, .6, .7]);
    obstacles.push({ x, z, r: 1 });
  }
  for (let i = 0; i < 18; i++) {
    const x = (random() - .5) * 90, z = (random() - .5) * 90;
    if (Math.abs(x - path(z)) < 3.5 || Math.hypot(x, z - 6) < 7) continue;
    shape(staticGroup, colors.rock, [x, .3, z], [.8, .5, .6]); obstacles.push({ x, z, r: .8 });
  }
  for (let i = 0; i < 9; i++) {
    const z = -38 + i * 9, x = path(z) + 5;
    for (let j = 0; j < 3; j++) {
      shape(staticGroup, colors.wood, [x, .7, z + j * .18], [2.2, .12, .14], true);
      shape(staticGroup, colors.wood, [x, 1 + j * .17, z - .24], [2.2, .12, .1], true);
    }
    for (const bx of [-.8, .8]) shape(staticGroup, colors.black, [x + bx, .35, z + .1], [.12, .7, .65], true);
    obstacles.push({ x, z, r: 1.35 });
    shape(staticGroup, colors.black, [x + 1.8, 1.6, z], [.1, 3.2, .1], true);
    shape(staticGroup, material(0xffdfa2), [x + 1.8, 3.1, z], [.34, .45, .34], true);
    shape(staticGroup, colors.black, [x + 1.8, 3.4, z], [.55, .1, .55], true);
    obstacles.push({ x: x + 1.8, z, r: .25 });
  }
  for (let i = 0; i < 5; i++) {
    const z = -30 + i * 17, x = path(z) - 1;
    shape(staticGroup, new T.MeshStandardMaterial({ color: 0x76a69e, roughness: .18, metalness: .4 }), [x, .04, z], [1.2, .015, 1.8]);
    obstacles.push({ x, z, r: 1.4, puddle: true });
  }
  const bladeGeometry = new T.ConeGeometry(.12, .45, 3);
  const grass = new T.InstancedMesh(bladeGeometry, colors.lightLeaf, 1600), dummy = new T.Object3D();
  for (let i = 0; i < 1600; i++) {
    const x = (random() - .5) * 105, z = (random() - .5) * 105;
    dummy.position.set(x, .15, z); dummy.scale.setScalar(Math.abs(x - path(z)) < 3 ? .01 : .5 + random()); dummy.rotation.y = random() * 6; dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
  }
  scene.add(grass);
  for (let i = 0; i < 100; i++) {
    const z = (random() - .5) * 100, x = path(z) + (random() - .5) * 8;
    shape(staticGroup, colors.wood, [x, .05, z], [.13, .055, .18]);
  }
  // Park sign and small fallen trunks.
  shape(staticGroup, colors.wood, [-3.5, 1.1, 9], [.14, 2.2, .14], true);
  shape(staticGroup, colors.wood, [-3.5, 2.1, 9], [2.1, .65, .14], true);
  obstacles.push({ x: -3.5, z: 9, r: 1 });
  const signCanvas = document.createElement('canvas'); signCanvas.width = 512; signCanvas.height = 160;
  const sc = signCanvas.getContext('2d')!; sc.fillStyle = '#9a7045'; sc.fillRect(0, 0, 512, 160);
  sc.fillStyle = '#fff1cd'; sc.textAlign = 'center'; sc.font = 'bold 43px sans-serif'; sc.fillText('Сосновая тропа →', 256, 96);
  const signFace = new T.Mesh(new T.PlaneGeometry(2.05, .61), new T.MeshStandardMaterial({ map: new T.CanvasTexture(signCanvas) }));
  signFace.position.set(-3.5, 2.1, 9.075); staticGroup.add(signFace);
  for (let i = 0; i < 5; i++) {
    const x = -14 - i * 3, z = -20 + i * 8;
    const log = shape(staticGroup, colors.trunk, [x, .3, z], [1.6, .32, .32]); log.rotation.y = .5;
    obstacles.push({ x, z, r: 1.5 });
  }
  // Static batching: render the entire park in a handful of material groups.
  staticGroup.updateMatrixWorld(true);
  const batches = new Map<T.Material, T.BufferGeometry[]>();
  staticGroup.traverse(o => {
    if (!(o instanceof T.Mesh) || Array.isArray(o.material)) return;
    if (!batches.has(o.material)) batches.set(o.material, []);
    batches.get(o.material)!.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
  });
  const merged = new T.Group();
  for (const [m, parts] of batches) {
    const geometry = mergeGeometries(parts);
    if (geometry) { const mesh = new T.Mesh(geometry, m); mesh.castShadow = true; mesh.receiveShadow = true; merged.add(mesh); }
    parts.forEach(p => p.dispose());
  }
  scene.remove(staticGroup); scene.add(merged);
  const lucia = makeDog(); scene.add(lucia.root);
  const squirrels = Array.from({ length: 7 }, (_, i) => {
    const mesh = makeSquirrel(); scene.add(mesh);
    return { mesh, mode: 'ground', dir: i, timer: 0, tree: trees[0].clone(), spawn: new T.Vector3(Math.sin(i) * 15, 0, Math.cos(i) * 15) };
  });
  const trucks = [makeTruck(), makeTruck()]; trucks.forEach(t => scene.add(t.root));
  const pickups = Array.from({ length: 28 }, (_, i) => {
    const z = -40 + i * 3, boost = i % 7 === 0, mesh = makeBone(boost);
    mesh.position.set(path(z) + (i % 2 ? 1.4 : -1.4), .6, z); scene.add(mesh);
    return { mesh, boost, timer: 0 };
  });
  let mode = 'menu', score = 0, caught = 0, bones = 0, time = 180, elapsed = 0;
  let yaw = 0, pitch = .4, jump = 0, vy = 0, slow = 0, boost = 0, cooldown = 0, joy = 0, gait = 0, toastTimer = 0;
  const keys = new Set<string>(), clock = new T.Clock(), desired = new T.Vector3(), look = new T.Vector3();
  let audio: AudioContext | undefined, engineGain: GainNode | undefined, sound = false;
  function notice(message: string) { $('toast').textContent = message; $('toast').classList.add('visible'); toastTimer = 2.5; }
  function ping() {
    if (!audio || !sound) return;
    const o = audio.createOscillator(), g = audio.createGain(); o.frequency.setValueAtTime(600, audio.currentTime); o.frequency.exponentialRampToValueAtTime(1000, audio.currentTime + .15);
    g.gain.setValueAtTime(.08, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .3); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + .3);
  }
  function reset() {
    score = caught = bones = elapsed = jump = vy = slow = boost = cooldown = joy = 0; time = 180; yaw = 0; keys.clear();
    lucia.root.position.set(0, 0, 6); lucia.root.rotation.set(0, 0, 0);
    squirrels.forEach((s, i) => { s.mode = 'ground'; s.timer = 0; s.mesh.visible = true; s.mesh.position.copy(s.spawn); s.mesh.rotation.z = 0; if (i === 0) s.mesh.position.set(0, 0, 12); });
    pickups.forEach(p => { p.timer = 0; p.mesh.visible = true; });
  }
  function panel(title: string, description: string, button: string) {
    $('title').innerHTML = title; $('description').textContent = description; $('play').textContent = button; $('overlay').classList.remove('hidden');
  }
  function play() { if (mode !== 'paused') reset(); mode = 'playing'; $('overlay').classList.add('hidden'); $('pause').textContent = 'Ⅱ Пауза'; }
  function pause() {
    if (mode === 'playing') { mode = 'paused'; keys.clear(); panel('Небольшой<br><em>привал.</em>', 'Лес подождёт. Продолжим, когда будешь готов!', 'Продолжить'); $('pause').textContent = '▷ Продолжить'; }
    else if (mode === 'paused') play();
  }
  $('play').onclick = play; $('pause').onclick = pause; $('restart').onclick = () => { mode = 'menu'; play(); };
  $('sound').onclick = () => {
    if (!audio) {
      audio = new AudioContext(); const osc = audio.createOscillator(); engineGain = audio.createGain(); osc.type = 'sawtooth'; osc.frequency.value = 45; engineGain.gain.value = 0;
      osc.connect(engineGain).connect(audio.destination); osc.start();
    }
    void audio.resume(); sound = !sound; $('sound').textContent = sound ? '♫ Звук вкл.' : '♫ Звук выкл.';
  };
  addEventListener('keydown', e => { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); if (e.code === 'Escape' && !e.repeat) pause(); keys.add(e.code); });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); if (mode === 'playing') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'playing') pause(); });
  let pointerX: number | undefined, pointerY = 0;
  canvas.addEventListener('pointermove', e => {
    if (mode !== 'playing') return;
    if (pointerX !== undefined && (e.pointerType === 'mouse' || e.buttons)) { yaw -= (e.clientX - pointerX) * .004; pitch = T.MathUtils.clamp(pitch + (e.clientY - pointerY) * .002, .1, .8); }
    pointerX = e.clientX; pointerY = e.clientY;
  });
  canvas.addEventListener('pointerleave', () => pointerX = undefined);
  canvas.addEventListener('pointerdown', e => { pointerX = e.clientX; pointerY = e.clientY; });
  document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b => {
    b.onpointerdown = e => { e.preventDefault(); b.setPointerCapture(e.pointerId); keys.add(b.dataset.key!); };
    b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => keys.delete(b.dataset.key!);
  });
  function blocked(x: number, z: number, r: number) { return obstacles.some(o => !o.puddle && Math.hypot(x - o.x, z - o.z) < o.r + r); }
  function move(p: T.Vector3, dx: number, dz: number, r = .4) {
    const x = T.MathUtils.clamp(p.x + dx, -48, 48), z = T.MathUtils.clamp(p.z + dz, -48, 48);
    if (!blocked(x, p.z, r)) p.x = x; if (!blocked(p.x, z, r)) p.z = z;
  }
  const minimap = $<HTMLCanvasElement>('map').getContext('2d')!;
  function map() {
    const c = minimap, xy = (n: number) => 80 + n * 1.4; c.fillStyle = '#36573b'; c.fillRect(0, 0, 160, 160);
    c.strokeStyle = '#baa77b'; c.lineWidth = 6; c.beginPath(); for (let z = -50; z <= 50; z += 2) c.lineTo(xy(path(z)), xy(z)); c.stroke();
    c.beginPath(); c.arc(80, 80, 35, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#23452d'; trees.forEach(t => { c.beginPath(); c.arc(xy(t.x), xy(t.z), 2, 0, 7); c.fill(); });
    const dot = (p: T.Vector3, color: string, r: number) => { c.fillStyle = color; c.beginPath(); c.arc(xy(p.x), xy(p.z), r, 0, 7); c.fill(); };
    squirrels.forEach(s => { if (s.mode === 'ground') dot(s.mesh.position, '#efb871', 2.5); });
    trucks.forEach(t => dot(t.root.position, '#f18d41', 3)); dot(lucia.root.position, '#fff8e9', 3.5);
  }
  function update(dt: number) {
    time = Math.max(0, time - dt); elapsed += dt; slow = Math.max(0, slow - dt); boost = Math.max(0, boost - dt); cooldown = Math.max(0, cooldown - dt); joy = Math.max(0, joy - dt);
    let f = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
    let s = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    const moving = !!(f || s), run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    if (moving) {
      const len = Math.hypot(f, s); f /= len; s /= len;
      const speed = (run ? 9 : 5.2) * (slow > 0 ? .4 : 1) * (boost > 0 ? 1.5 : 1);
      const dx = (f * Math.sin(yaw) + s * Math.cos(yaw)) * speed * dt, dz = (f * Math.cos(yaw) - s * Math.sin(yaw)) * speed * dt;
      move(lucia.root.position, dx, dz); const angle = Math.atan2(dx, dz);
      lucia.root.rotation.y += Math.atan2(Math.sin(angle - lucia.root.rotation.y), Math.cos(angle - lucia.root.rotation.y)) * Math.min(1, dt * 12); gait += dt * (run ? 17 : 11);
    }
    if (keys.has('Space') && jump === 0) { vy = 5.7; jump = .001; }
    if (jump > 0) { vy -= 15 * dt; jump = Math.max(0, jump + vy * dt); }
    lucia.root.position.y = jump;
    lucia.legs.forEach((leg, i) => leg.rotation.x = moving ? Math.sin(gait + (i === 0 || i === 3 ? 0 : Math.PI)) * .65 : 0);
    lucia.body.position.y = moving ? Math.sin(gait * 2) * .035 : 0;
    if (joy > 0) lucia.body.position.y += Math.abs(Math.sin(joy * 10)) * .2;
    lucia.tail.rotation.z = Math.sin(elapsed * (joy > 0 ? 18 : 8)) * (joy > 0 ? .65 : .22);
    obstacles.forEach(o => { if (o.puddle && jump < .2 && Math.hypot(lucia.root.position.x - o.x, lucia.root.position.z - o.z) < o.r) slow = Math.max(slow, .3); });
    squirrels.forEach(sq => {
      sq.timer += dt; const p = sq.mesh.position;
      if (sq.mode === 'wait') {
        if (sq.timer > 6) { sq.mode = 'ground'; sq.timer = 0; sq.mesh.visible = true; p.copy(sq.spawn); p.y = 0; sq.mesh.rotation.z = 0; }
        return;
      }
      if (sq.mode === 'climb') {
        p.x += (sq.tree.x - p.x) * Math.min(1, dt * 5); p.z += (sq.tree.z - p.z) * Math.min(1, dt * 5); p.y += dt * 4;
        sq.mesh.rotation.z = .3; if (p.y > 7) { sq.mode = 'wait'; sq.timer = 0; sq.mesh.visible = false; } return;
      }
      const d = Math.hypot(p.x - lucia.root.position.x, p.z - lucia.root.position.z);
      if (d < 1.2 && jump < 1.6) {
        caught++; score += 100; joy = 1.5; sq.mode = 'climb'; sq.timer = 0;
        sq.tree = trees.reduce((a, b) => a.distanceToSquared(p) < b.distanceToSquared(p) ? a : b).clone(); notice('Белка на дереве! +100 очков'); ping(); return;
      }
      if (d < 10) sq.dir = Math.atan2(p.x - lucia.root.position.x, p.z - lucia.root.position.z) + Math.sin(sq.timer * 2) * .35;
      else sq.dir += Math.sin(sq.timer) * dt * .5;
      const speed = d < 10 ? Math.min(6.8, 3.3 + caught * .15) : 1.2, oldX = p.x, oldZ = p.z;
      move(p, Math.sin(sq.dir) * speed * dt, Math.cos(sq.dir) * speed * dt, .2);
      if (Math.hypot(p.x - oldX, p.z - oldZ) < speed * dt * .2) { sq.dir += Math.PI * .6; move(p, Math.sin(sq.dir) * speed * dt, Math.cos(sq.dir) * speed * dt, .2); }
      p.y = Math.abs(Math.sin(sq.timer * 16)) * .08; sq.mesh.rotation.y = sq.dir;
    });
    trucks.forEach((truck, i) => {
      const a = elapsed * .045 + i * Math.PI; truck.root.position.set(Math.sin(a) * 25, 0, Math.cos(a) * 25); truck.root.rotation.y = a + Math.PI / 2;
      truck.brushes.forEach(b => b.rotation.y += dt * 12); truck.lampMat.emissiveIntensity = 1.5 + Math.sin(elapsed * 9);
      if (truck.root.position.distanceTo(lucia.root.position) < 2 && jump < 1.5 && cooldown === 0) { slow = 2.5; cooldown = 3; notice('Ой, щётки! Скорость временно снижена.'); }
    });
    pickups.forEach(p => {
      if (p.timer > 0) { p.timer -= dt; if (p.timer <= 0) p.mesh.visible = true; return; }
      p.mesh.rotation.y += dt; p.mesh.position.y = .55 + Math.sin(elapsed * 3 + p.mesh.position.z) * .1;
      if (Math.hypot(p.mesh.position.x - lucia.root.position.x, p.mesh.position.z - lucia.root.position.z) < .9 && jump < 1) {
        p.timer = 22; p.mesh.visible = false; bones++; score += 10;
        if (p.boost) { boost = 7; notice('Золотое лакомство! Ускорение на 7 секунд · +10'); } else notice('Косточка! +10 очков'); ping();
      }
    });
    if (time <= 0) { mode = 'ended'; keys.clear(); panel('Вот это<br><em>прогулка!</em>', `Твой результат: ${score} очков. Белок: ${caught}, косточек: ${bones}. Все белки в безопасности!`, 'Играть ещё'); }
  }
  Object.assign(diagnostic, { step: update, state: () => ({ mode, score, caught, bones, time, boost, slow }), dog: lucia, squirrels, trucks, pickups, obstacles });
  reset();
  camera.position.set(5, 3.1, 14);
  function frame() {
    requestAnimationFrame(frame); const dt = Math.min(clock.getDelta(), .05);
    if (mode === 'playing') update(dt);
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('visible'); }
    const p = lucia.root.position;
    if (mode === 'menu') { desired.set(p.x + 5.5, 3.2, p.z + 8); look.set(p.x - 2, 1.1, p.z); lucia.tail.rotation.z = Math.sin(clock.elapsedTime * 6) * .2; }
    else { desired.set(p.x - Math.sin(yaw) * 8, 3 + Math.sin(pitch) * 6, p.z - Math.cos(yaw) * 8); look.set(p.x, 1.1, p.z); }
    camera.position.lerp(desired, 1 - Math.exp(-dt * 5)); camera.lookAt(look);
    sun.position.set(p.x - 15, 25, p.z + 12); sun.target.position.set(p.x, 0, p.z);
    $('score').textContent = String(score); $('caught').textContent = String(caught); $('bones').textContent = String(bones);
    const seconds = Math.ceil(time); $('time').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    $('effect').textContent = boost > 0 ? `Ускорение · ${Math.ceil(boost)} с` : slow > 0 ? 'Потише на поворотах…' : 'Все белки в безопасности ♡';
    if (audio && engineGain) { const d = Math.min(...trucks.map(t => t.root.position.distanceTo(p))); engineGain.gain.setTargetAtTime(sound && mode === 'playing' ? Math.max(0, 1 - d / 18) * .025 : 0, audio.currentTime, .1); }
    map(); renderer.render(scene, camera);
  }
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  frame();
}
try { boot(); } catch (error) {
  $('description').textContent = 'Не удалось запустить 3D. Откройте файл в свежем Chrome или Edge и включите аппаратное ускорение. ' + (error instanceof Error ? error.message : '');
  $('play').classList.add('hidden'); console.error(error);
}
