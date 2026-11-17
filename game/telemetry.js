const VD = window.VD = window.VD || {};
const archetypes = ['Asteroid', 'Hunter', 'Weaver', 'Bulwark', 'Sniper', 'Mine', 'Sentinel Core', 'Hive Queen', 'Void Sovereign'];

// Run-local counters; no network reporting or persistence of individual events.
function reset(g) {
  g.stats = { kills: 0, bestCombo: 0, shots: 0, hits: 0, creditsEarned: 0,
    wavesCleared: 0, byArchetype: Object.fromEntries(archetypes.map(name => [name, 0])) };
}

function summary(g) {
  const stats = g.stats;
  return '<p class="stat">FLIGHT TIME <b>' + VD.Storage.duration(g.time) +
    '</b> · ELIMINATIONS <b>' + stats.kills + '</b></p>' +
    '<p class="stat">BEST CHAIN <b>' + stats.bestCombo +
    '</b> · SHOTS <b>' + stats.shots + '</b></p>';
}

function page(g) {
  const s = g.stats;
  const accuracy = s.shots ? (100 * s.hits / s.shots).toFixed(1) : '0.0';
  return '<div class="panel menu"><h1 class="menu-title">FLIGHT STATS</h1>' +
    '<p class="eyebrow">' + (g.endless ? 'ENDLESS MODE' : '20-SECTOR CAMPAIGN') + ' · WAVE ' + g.wave + '</p>' +
    '<p class="stat">ACCURACY <b>' + accuracy + '%</b> · SHOTS FIRED <b>' + s.shots + '</b></p>' +
    '<p class="muted">Projectiles that dealt damage / projectiles fired. Each pellet counts; piercing hits count once.</p>' +
    '<p class="stat">CREDITS EARNED <b>' + s.creditsEarned + '</b> · WAVES CLEARED <b>' + s.wavesCleared + '</b></p>' +
    summary(g) + '<table><caption>KILLS BY ARCHETYPE</caption><thead><tr><th scope="col">Archetype</th><th scope="col">Kills</th></tr></thead><tbody>' +
    archetypes.map(name => '<tr><th scope="row">' + name + '</th><td>' + s.byArchetype[name] + '</td></tr>').join('') +
    '</tbody></table><div class="menu-actions"><button data-polish="stats-back">BACK / ESC</button>' +
    '<button data-action="restart">RETRY</button><button data-action="title">TITLE</button></div></div>';
}

// Reset hit accounting whenever a pooled projectile is reused.
const bulletInit = VD.Bullet.prototype.init;
VD.Bullet.prototype.init = function (...args) {
  bulletInit.apply(this, args);
  this.recordedHit = false;
};

// Observe actual damage, including boss shields, without changing combat behavior.
for (const [Type, classify] of [
  [VD.Asteroid, () => 'Asteroid'],
  [VD.Hunter, o => archetypes[1 + o.type]],
  [VD.Mine, () => 'Mine'],
  [VD.Boss, o => archetypes[5 + o.type]]
]) {
  const hit = Type.prototype.hit;
  Type.prototype.hit = function (g, bullet) {
    const wasDead = this.dead, hp = this.hp, credits = g.credits;
    hit.call(this, g, bullet);
    if (wasDead) return;
    if (bullet && bullet.friendly && !bullet.recordedHit && (this.dead || this.hp < hp)) {
      bullet.recordedHit = true;
      g.stats.hits++;
    }
    if (this.dead) g.stats.byArchetype[classify(this)]++;
    g.stats.creditsEarned += Math.max(0, g.credits - credits);
  };
}

const collect = VD.Crystal.prototype.collect;
VD.Crystal.prototype.collect = function (g) {
  const credits = g.credits;
  collect.call(this, g);
  g.stats.creditsEarned += Math.max(0, g.credits - credits);
};

VD.Telemetry = { reset, summary, page };
