(function () {
  const VD = window.VD, canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const g = VD.g = {
    canvas: canvas, ctx: ctx, W: 0, H: 0, time: 0, shake: 0, player: null,
    bullets: [], ebullets: [], asteroids: [], hunters: [], mines: [], crystalList: [],
    boss: null, bossObject: new VD.Boss(), bossDown: false, score: 0, crystalCount: 0,
    wave: 1, credits: 0, combo: 0, comboTime: 0, waveTime: 0, eventIndex: 0,
    hitStop: 0, introTime: 0, warningTime: 0, noticeTime: 0, banner: '', notice: '', serial: 0, seed: 0
  };
  const names = ['bullets', 'ebullets', 'asteroids', 'hunters', 'mines', 'crystalList'];
  const constructors = [VD.Bullet, VD.Bullet, VD.Asteroid, VD.Hunter, VD.Mine, VD.Crystal];
  const capacities = [512, 1400, 256, 128, 96, 512], pools = {};
  // Allocate once at boot. Dead objects return to their pool after collision handling.
  for (let i = 0; i < names.length; i++) {
    const pool = pools[names[i]] = [];
    for (let j = 0; j < capacities[i]; j++) pool.push(new constructors[i]());
    // Reserve active array capacity before the first combat frame.
    for (let j = 0; j < capacities[i]; j++) g[names[i]].push(null);
    g[names[i]].length = 0;
  }
  g.random = function () { g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0; return g.seed / 4294967296; };
  g.spawn = function (name, x, y, a, b, c) {
    const pool = pools[name]; if (!pool.length) return null;
    const o = pool.pop(); o.init(g, x, y, a, b, c); g[name].push(o); return o;
  };
  g.fire = function (x, y, angle, speed, friendly, damage, pierce, color, kind) {
    const name = friendly ? 'bullets' : 'ebullets', pool = pools[name]; if (!pool.length) return;
    const b = pool.pop(); b.init(g, x, y, angle, speed, friendly, damage, pierce, color, kind); g[name].push(b);
  };
  g.clearList = function (name) {
    const list = g[name], pool = pools[name];
    for (let i = 0; i < list.length; i++) pool.push(list[i]);
    list.length = 0;
  };
  function compact(name) {
    const list = g[name], pool = pools[name]; let write = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i].dead) pool.push(list[i]); else list[write++] = list[i];
    }
    list.length = write;
  }
  g.reward = function (o, score, credits) {
    g.combo++; g.comboTime = 4;
    g.score += score * Math.min(5, 1 + Math.floor(g.combo / 5)); g.credits += credits;
    const roll = g.random();
    if (roll < 0.52) g.spawn('crystalList', o.x, o.y, roll < 0.10 ? 1 : roll < 0.20 ? 2 : 0);
  };
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    g.W = window.innerWidth; g.H = window.innerHeight;
    canvas.width = Math.floor(g.W * dpr); canvas.height = Math.floor(g.H * dpr);
    canvas.style.width = g.W + 'px'; canvas.style.height = g.H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  g.reset = function (seed) {
    for (let i = 0; i < names.length; i++) g.clearList(names[i]);
    g.seed = seed == null ? 0x564f4944 : seed >>> 0; g.serial = 0;
    g.player = new VD.Player(g); g.boss = null; g.bossDown = false;
    g.score = 0; g.crystalCount = 0; g.credits = 0; g.wave = 1; g.time = 0;
    g.shake = 0; g.hitStop = 0; g.combo = 0; g.comboTime = 0;
    VD.Particles.reset(); VD.Waves.start(1, g);
  };
  function circ(a, b) { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < (a.r + b.r) ** 2; }
  // Swept circles keep fast Lance/Railgun shots from tunneling through targets.
  function swept(b, o) {
    const dx = b.x - b.px, dy = b.y - b.py, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((o.x - b.px) * dx + (o.y - b.py) * dy) / len)) : 0;
    return (b.px + dx * t - o.x) ** 2 + (b.py + dy * t - o.y) ** 2 < (b.r + o.r) ** 2;
  }
  function hit(b, o) {
    if (o.dead || !swept(b, o)) return;
    for (let i = 0; i < b.hitCount; i++) if (b.hits[i] === o.id) return;
    b.hits[b.hitCount++] = o.id; o.hit(g, b);
    if (b.pierce-- <= 0 || b.hitCount === b.hits.length) b.dead = true;
  }
  g.step = function (dt) {
    const p = g.player; if (!p) return;
    g.time += dt; VD.Particles.update(dt); VD.Waves.update(dt, g);
    g.introTime = Math.max(0, g.introTime - dt); g.warningTime = Math.max(0, g.warningTime - dt);
    g.noticeTime = Math.max(0, g.noticeTime - dt); g.comboTime = Math.max(0, g.comboTime - dt);
    if (!g.comboTime) g.combo = 0;
    p.update(dt);
    for (let n = 0; n < names.length; n++) {
      const list = g[names[n]], count = list.length;
      for (let i = 0; i < count; i++) if (!list[i].dead) list[i].update(dt, g);
    }
    if (g.boss) g.boss.update(dt, g);
    for (let i = 0; i < g.bullets.length; i++) {
      const b = g.bullets[i]; if (b.dead) continue;
      // Limit to objects alive at the start of each collision pass; splits wait a tick.
      for (let n = 2; n <= 4 && !b.dead; n++) {
        const list = g[names[n]], count = list.length;
        for (let j = 0; j < count && !b.dead; j++) hit(b, list[j]);
      }
      if (!b.dead && g.boss) hit(b, g.boss);
    }
    for (let i = 0; i < g.ebullets.length; i++) {
      const b = g.ebullets[i]; if (!b.dead && swept(b, p)) { b.dead = true; p.damage(8); }
    }
    for (let n = 2; n <= 3; n++) {
      const list = g[names[n]], count = list.length;
      for (let i = 0; i < count; i++) {
        const o = list[i]; if (o.dead || !circ(o, p)) continue;
        p.damage(n === 2 ? 14 : 12);
        const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1;
        p.vx += dx / d * 120; p.vy += dy / d * 120;
        // Contact damages an enemy at most once per second.
        if (n === 2) o.hit(g);
        else if (o.contactTime == null || g.time >= o.contactTime) { o.hit(g); o.contactTime = g.time + 1; }
      }
    }
    if (g.boss && !g.boss.dead && !g.boss.entering && circ(g.boss, p)) p.damage(20);
    for (let i = 0; i < names.length; i++) compact(names[i]);
    if (g.boss && g.boss.dead) g.boss = null;
    g.shake = Math.max(0, g.shake - dt * 35);
    if (p.hull <= 0) VD.States.set('GAMEOVER', g);
  };
  function background() {
    ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, g.W, g.H);
    for (let i = 0; i < 70; i++) {
      ctx.globalAlpha = 0.12 + (i % 5) * 0.05; ctx.fillStyle = '#94a3b8';
      ctx.fillRect((i * 137.5) % g.W, (i * 97.3 + g.time * (8 + (i % 4) * 4)) % g.H, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }
  function render() {
    ctx.save();
    if (g.shake > 0) ctx.translate(Math.sin(g.time * 131) * g.shake * 0.5, Math.cos(g.time * 173) * g.shake * 0.5);
    background(); VD.States.draw(ctx, g);
    if (g.player && VD.States.cur !== 'TITLE') {
      for (let n = names.length - 1; n >= 0; n--) {
        const list = g[names[n]];
        for (let i = 0; i < list.length; i++) list[i].draw(ctx);
      }
      if (g.boss) g.boss.draw(ctx);
      g.player.draw(ctx);
    }
    VD.Particles.draw(ctx, g); ctx.restore();
    if (VD.States.cur === 'PLAYING') {
      ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold 22px monospace';
      if (g.introTime > 0) {
        ctx.globalAlpha = Math.min(1, g.introTime); ctx.fillStyle = '#e2e8f0'; ctx.fillText(g.banner, g.W / 2, g.H * 0.32, g.W - 30);
      }
      ctx.globalAlpha = 1; ctx.font = 'bold 16px monospace';
      if (g.warningTime > 0) { ctx.fillStyle = '#fb7185'; ctx.fillText('WARNING — BOSS SIGNATURE DETECTED', g.W / 2, g.H * 0.32 + 32, g.W - 30); }
      if (g.noticeTime > 0) { ctx.fillStyle = '#fbbf24'; ctx.fillText(g.notice, g.W / 2, g.H * 0.72, g.W - 30); }
      ctx.restore();
    }
    VD.HUD.update(g);
  }
  resize(); VD.Input.init(); VD.States.init(); VD.HUD.init(); VD.States.set('TITLE', g);
  const STEP = 1 / 60; let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.2, Math.max(0, (now - last) / 1000)); last = now;
    // Consume exactly 30ms of wall time without advancing simulation or effects.
    if (VD.States.cur === 'PLAYING' && g.hitStop > 0) {
      const frozen = Math.min(dt, g.hitStop); g.hitStop -= frozen; dt -= frozen;
    }
    acc = Math.min(acc + dt, STEP * 5);
    while (acc >= STEP) {
      VD.States.update(STEP, g); VD.Input.clear(); acc -= STEP;
      if (g.hitStop > 0 && VD.States.cur === 'PLAYING') { acc = 0; break; }
    }
    render();
  }
  requestAnimationFrame(frame);
})();
