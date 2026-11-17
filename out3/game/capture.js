const VD = window.VD = window.VD || {};

// Fixtures use the same wave spawning, input, collisions and fixed updates as play.
function prepare(name, seed, g) {
  g.capture = true;
  document.documentElement.classList.add('capture');
  window.__shotReady = false;
  g.reset(seed);
  if (name === 'title') {
    VD.States.set('TITLE', g);
    for (let i = 0; i < 120; i++) VD.States.update(1 / 60, g);
    return;
  }
  for (const list of ['bullets', 'ebullets', 'asteroids', 'hunters', 'mines', 'crystalList']) g.clearList(list);
  VD.Waves.start(name === 'boss' ? 7 : 3, g);
  VD.States.set('PLAYING', g);
  const player = g.player;
  player.tiers[1] = 2;
  player.weapon = 1;
  const frames = name === 'boss' ? 600 : 360;
  for (let i = 0; i < frames; i++) {
    player.invuln = 2;
    const target = g.hunters.find(enemy => !enemy.dead) || g.asteroids.find(enemy => !enemy.dead) || g.boss;
    if (target) player.angle = Math.atan2(target.y - player.y, target.x - player.x);
    VD.Input.keys[' '] = true;
    VD.Input.keys.w = i % 180 < 35;
    VD.States.update(1 / 60, g);
    VD.Input.clear();
  }
  VD.Input.keys[' '] = false;
  VD.Input.keys.w = false;
  if (name === 'gameover') {
    player.hull = 0;
    VD.States.set('GAMEOVER', g);
  }
}

VD.Capture = { prepare };
