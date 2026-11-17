// Dependency-free simulation checks: node game/verify.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const noop = () => {};
const ctx = new Proxy({}, { get: (o, key) => key in o ? o[key] : noop });
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { style: {}, innerHTML: '', textContent: '', getContext: () => ctx });
  return elements.get(id);
}
let frame;
const sandbox = { console, Math, performance: { now: () => 0 }, document: { getElementById: element },
  requestAnimationFrame: fn => { frame = fn; }, window: { innerWidth: 1000, innerHeight: 750, devicePixelRatio: 1, addEventListener: noop } };
vm.createContext(sandbox);
for (const name of ['input', 'audio', 'particles', 'entities', 'waves', 'upgrade', 'hud', 'states', 'game']) {
  const file = path.join(__dirname, name + '.js');
  assert.ok(fs.statSync(file).size < 30000, name + ' exceeds 30KB');
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}
const VD = sandbox.window.VD, g = VD.g, I = VD.Input;
const lists = ['bullets', 'ebullets', 'asteroids', 'hunters', 'mines', 'crystalList'];
function empty() { for (const name of lists) g.clearList(name); g.boss = null; g.hitStop = 0; }
function setup() { g.reset(1234); empty(); VD.States.set('PLAYING', g); g.player.invuln = 999; }
function press(key) { I.pressed[key] = true; }
function tick(n) { for (let i = 0; i < n; i++) { VD.States.update(1 / 60, g); I.clear(); } }

assert.equal(VD.Waves.count, 20);
assert.deepEqual(Array.from(VD.Waves.defs, (d, i) => d.boss ? i + 1 : 0).filter(Boolean), [7, 14, 20]);
setup();
const bulwark = g.spawn('hunters', 200, 200, 2, false);
bulwark.hit(g, { damage: 100 });
assert.equal(g.hunters.filter(e => !e.dead && e.type === 2 && e.small).length, 2, 'Bulwark must split twice');
const children = g.hunters.filter(e => e.small);
for (const e of children) e.hit(g, { damage: 100 });
assert.equal(g.hunters.length, 3, 'Small Bulwarks must not split');

setup();
const weaver = g.spawn('hunters', 200, 200, 1);
weaver.timer = 0;
for (let i = 0; i < 30; i++) weaver.update(1 / 60, g);
assert.equal(g.ebullets.length, 3, 'Weaver burst must contain three rounds');
assert.equal(weaver.state, 2);

setup(); g.player.x = 600; g.player.y = 200; g.player.invuln = 0;
const sniper = g.spawn('hunters', 200, 200, 3); sniper.timer = 0;
sniper.update(1 / 60, g); assert.equal(sniper.state, 1);
for (let i = 0; i < 71; i++) sniper.update(1 / 60, g);
assert.equal(g.player.hull, 100, 'No laser damage before charge completes');
sniper.update(1 / 60, g); assert.equal(g.player.hull, 76, 'Hitscan must damage along locked ray');
g.player.invuln = 0; g.player.y = 350; sniper.state = 1; sniper.timer = 0; sniper.lock = 0;
sniper.update(1 / 60, g); assert.equal(g.player.hull, 76, 'Moving off telegraph must dodge laser');

setup();
const boss = g.bossObject; boss.init(g, 1); boss.entering = false; boss.x = 400; boss.y = 200; boss.angle = 0;
boss.hit(g, { px: 300, py: 200, x: 340, y: 200, damage: 10 });
assert.equal(boss.hp, boss.maxHp, 'Sentinel shield must block closed sector');
boss.hit(g, { px: 500, py: 200, x: 460, y: 200, damage: 10 });
assert.equal(boss.hp, boss.maxHp - 10, 'Sentinel gap must admit damage');
boss.init(g, 2); boss.entering = false; boss.spawnSwarm(g);
boss.hit(g, { x: 0, y: 0, damage: 10 }); assert.equal(boss.hp, boss.maxHp);
for (const e of g.hunters) e.hit(g, { damage: 100 });
boss.update(1 / 60, g); assert.equal(boss.exposed, true); assert.equal(g.hitStop, 0.03);
boss.hit(g, { x: 0, y: 0, damage: 10 }); assert.equal(boss.hp, boss.maxHp - 10);
boss.update(7.1, g); assert.equal(boss.exposed, false, 'Hive must spawn another shield swarm');
boss.init(g, 3); boss.entering = false; boss.hp = boss.maxHp * 0.6; boss.update(1 / 60, g);
assert.equal(boss.phase, 2);
boss.hp = boss.maxHp * 0.32; boss.update(1 / 60, g); assert.equal(boss.phase, 3); assert.equal(boss.enraged, false);
boss.hp = boss.maxHp * 0.29; boss.update(1 / 60, g); assert.equal(boss.enraged, true);

setup(); g.player.tiers.fill(3);
for (let w = 0; w < 5; w++) {
  g.clearList('bullets'); g.player.weapon = w; g.player.charge = 1.2; g.player.shoot();
  assert.ok(g.bullets.length > 0, 'Weapon ' + w + ' must fire');
  assert.ok(g.bullets.every(b => b.damage > 0));
  if (w === 2 || w === 4) assert.ok(g.bullets[0].pierce > 0);
  if (w === 3) assert.ok(g.bullets.every(b => b.kind === 3));
}
setup();
g.player.x = 800; g.player.y = 600;
const a = g.spawn('hunters', 216, 200, 0), b = g.spawn('hunters', 240, 200, 0);
g.fire(190, 200, 0, 1900, true, 3, 10, '#fff', 4);
g.step(1 / 60); g.step(1 / 60);
assert.equal(a.dead, true); assert.equal(b.dead, true, 'Swept piercing shot must reach both targets');

setup(); g.player.tiers[4] = 1; g.player.weapon = 4; I.keys[' '] = true;
for (let i = 0; i < 30; i++) g.player.update(1 / 60);
assert.equal(g.bullets.length, 0, 'Railgun must charge before release');
I.keys[' '] = false; g.player.update(1 / 60);
assert.equal(g.bullets.length, 1); assert.ok(g.bullets[0].damage > 2);
setup(); g.player.invuln = 0; g.player.shieldOn = true; g.player.damage(25);
assert.equal(g.player.hull, 100, 'Active shield must preserve hull');
for (let i = 0; i < 1600; i++) g.fire(10, 10, 0, 200, false, 1, 0, '#fff');
assert.equal(g.ebullets.length, 1400, 'Bullet pool must remain bounded');
g.clearList('ebullets');
for (let i = 0; i < 1600; i++) g.fire(10, 10, 0, 200, false, 1, 0, '#fff');
assert.equal(g.ebullets.length, 1400, 'Clearing must return all bullet records');
assert.equal(new Set(g.ebullets).size, 1400, 'Live pool records must be unique');

setup(); VD.States.set('SHOP', g);
const cost = VD.Upgrade.price(g, 1); g.credits = cost - 1; VD.Upgrade.buy(g, 1);
assert.equal(g.player.tiers[1], 0); assert.equal(g.credits, cost - 1);
g.credits = 10000;
for (let i = 0; i < 5; i++) for (let tier = 0; tier < 3; tier++) VD.Upgrade.buy(g, i);
assert.ok(g.player.tiers.every(t => t === 3));
const before = g.credits; VD.Upgrade.buy(g, 4); assert.equal(g.credits, before);
VD.Upgrade.buy(g, 5);
for (let i = 0; i < 4; i++) VD.Upgrade.buy(g, i);
assert.equal(g.player.maxHull, 125); assert.equal(g.player.engine, 1); assert.equal(g.player.magnet, 1); assert.equal(g.player.recharger, 1);
g.player.hull = 50; g.player.shield = 0; VD.Upgrade.buy(g, 4);
assert.equal(g.player.hull, 90); assert.equal(g.player.shield, 100);
press('Enter'); VD.States.update(1 / 60, g); assert.equal(VD.States.cur, 'PLAYING'); assert.equal(g.wave, 2);

setup(); g.combo = 4; g.reward({ x: 0, y: 0 }, 100, 10); assert.equal(g.score, 200); assert.equal(g.credits, 10);
g.player.invuln = 0; g.player.damage(1); assert.equal(g.combo, 0);
for (let kind = 0; kind < 3; kind++) {
  g.player.hull = 50; g.player.shield = 0;
  const drop = g.spawn('crystalList', 100, 100, kind); drop.collect(g);
  if (kind === 1) assert.equal(g.player.hull, 72);
  if (kind === 2) assert.equal(g.player.shield, 40);
}

// Every wave must wait for its events, clear safely, visit the shop, and reach the next wave.
setup();
for (let wave = 1; wave <= 20; wave++) {
  empty(); VD.Waves.start(wave, g); VD.States.set('PLAYING', g);
  const d = VD.Waves.defs[wave - 1];
  if (d.boss) assert.equal(g.boss.type, d.boss);
  empty();
  if (d.events.length) assert.equal(VD.Waves.complete(g), false, 'Must wait for mid-wave events');
  VD.Waves.update(100, g);
  assert.equal(g.eventIndex, d.events.length);
  if (d.events.some(e => e[1] === 1)) assert.ok(g.mines.length);
  if (d.events.some(e => e[1] === 0)) assert.ok(g.asteroids.length);
  empty(); tick(1);
  if (wave < 20) {
    assert.equal(VD.States.cur, 'WAVE_CLEAR', 'Wave ' + wave + ' clear');
    tick(133); assert.equal(VD.States.cur, 'SHOP');
    press('Enter'); tick(1); assert.equal(g.wave, wave + 1); assert.equal(VD.States.cur, 'PLAYING');
  } else assert.equal(VD.States.cur, 'VICTORY');
}

// Run real combat updates/render calls, including all boss types, and compare seeded replays.
function replay() {
  g.reset(98765); VD.States.set('PLAYING', g); I.keys[' '] = true; I.keys.w = true; I.keys.d = true;
  for (let i = 0; i < 600; i++) { g.player.invuln = 999; g.step(1 / 60); }
  I.keys[' '] = false; I.keys.w = false; I.keys.d = false;
  return JSON.stringify([g.score, g.credits, g.seed, g.player.x, g.player.y, g.asteroids.map(a => [a.x, a.y, a.level])]);
}
assert.equal(replay(), replay(), 'Same seed and controls must reproduce simulation');
for (const wave of [7, 14, 20]) {
  setup(); VD.Waves.start(wave, g);
  for (let i = 0; i < 2400; i++) { g.player.invuln = 999; g.step(1 / 60); }
  frame(16); assert.ok(Number.isFinite(g.player.x));
}
setup(); press('p'); tick(1); assert.equal(VD.States.cur, 'PAUSED');
const time = g.time; tick(60); assert.equal(g.time, time, 'Pause must freeze simulation');
press('Enter'); tick(1); assert.equal(VD.States.cur, 'PLAYING');
g.player.hull = 0; tick(1); assert.equal(VD.States.cur, 'GAMEOVER');
press('Enter'); tick(1); assert.equal(g.wave, 1); assert.equal(g.player.hull, 100);
console.log('PASS: 20-wave progression, three bosses, archetypes, weapons, shop, pickups, combo, deterministic replay, pause/retry, and render smoke checks.');
