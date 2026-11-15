(function () {
  const VD = window.VD;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const g = {
    canvas: canvas,
    ctx: ctx,
    W: 0,
    H: 0,
    time: 0,
    shake: 0,
    player: null,
    bullets: [],
    ebullets: [],
    asteroids: [],
    hunters: [],
    crystalList: [],
    boss: null,
    bossDown: false,
    score: 0,
    crystalCount: 0,
    wave: 1
  };
  VD.g = g;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    g.W = window.innerWidth;
    g.H = window.innerHeight;
    canvas.width = Math.floor(g.W * dpr);
    canvas.height = Math.floor(g.H * dpr);
    canvas.style.width = g.W + 'px';
    canvas.style.height = g.H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);

  g.reset = function () {
    g.player = new VD.Player(g);
    g.bullets.length = 0;
    g.ebullets.length = 0;
    g.asteroids.length = 0;
    g.hunters.length = 0;
    g.crystalList.length = 0;
    g.boss = null;
    g.bossDown = false;
    g.score = 0;
    g.crystalCount = 0;
    g.wave = 1;
    g.time = 0;
    g.shake = 0;
    VD.Particles.list.length = 0;
    VD.Particles.flashA = 0;
    VD.Waves.start(1, g);
  };

  function circ(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const rr = a.r + b.r;
    return dx * dx + dy * dy < rr * rr;
  }

  g.step = function (dt) {
    const p = g.player;
    if (!p) return;

    p.update(dt);
    for (let i = 0; i < g.bullets.length; i++) g.bullets[i].update(dt, g);
    for (let i = 0; i < g.ebullets.length; i++) g.ebullets[i].update(dt, g);
    for (let i = 0; i < g.asteroids.length; i++) g.asteroids[i].update(dt, g);
    for (let i = 0; i < g.hunters.length; i++) g.hunters[i].update(dt, g);
    for (let i = 0; i < g.crystalList.length; i++) g.crystalList[i].update(dt, g);
    if (g.boss) g.boss.update(dt, g);

    for (let i = 0; i < g.bullets.length; i++) {
      const b = g.bullets[i];
      if (b.dead) continue;
      for (let j = 0; j < g.asteroids.length; j++) {
        const a = g.asteroids[j];
        if (a.dead) continue;
        if (circ(b, a)) {
          b.dead = true;
          a.hit(g);
          break;
        }
      }
      if (b.dead) continue;
      for (let j = 0; j < g.hunters.length; j++) {
        const h = g.hunters[j];
        if (h.dead) continue;
        if (circ(b, h)) {
          b.dead = true;
          h.hit(g);
          break;
        }
      }
      if (b.dead) continue;
      if (g.boss && !g.boss.dead && circ(b, g.boss)) {
        b.dead = true;
        g.boss.hit(g);
      }
    }

    for (let i = 0; i < g.ebullets.length; i++) {
      const b = g.ebullets[i];
      if (b.dead) continue;
      if (circ(b, p)) {
        b.dead = true;
        p.damage(8);
      }
    }

    for (let i = 0; i < g.asteroids.length; i++) {
      const a = g.asteroids[i];
      if (a.dead) continue;
      if (circ(a, p)) {
        p.damage(14);
        const dx = p.x - a.x;
        const dy = p.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        p.vx += (dx / d) * 120;
        p.vy += (dy / d) * 120;
        a.hit(g);
      }
    }

    for (let i = 0; i < g.hunters.length; i++) {
      const h = g.hunters[i];
      if (h.dead) continue;
      if (circ(h, p)) {
        p.damage(12);
        h.hit(g);
      }
    }

    if (g.boss && !g.boss.dead && !g.boss.entering && circ(g.boss, p)) {
      p.damage(16);
      const dx = p.x - g.boss.x;
      const dy = p.y - g.boss.y;
      const d = Math.hypot(dx, dy) || 1;
      p.vx += (dx / d) * 220;
      p.vy += (dy / d) * 220;
    }

    g.bullets = g.bullets.filter(function (o) {
      return !o.dead;
    });
    g.ebullets = g.ebullets.filter(function (o) {
      return !o.dead;
    });
    g.asteroids = g.asteroids.filter(function (o) {
      return !o.dead;
    });
    g.hunters = g.hunters.filter(function (o) {
      return !o.dead;
    });
    g.crystalList = g.crystalList.filter(function (o) {
      return !o.dead;
    });
    if (g.boss && g.boss.dead) g.boss = null;

    if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 40);

    if (p.hull <= 0) VD.States.set('GAMEOVER', g);
  };

  function drawBackground() {
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, g.W, g.H);
    ctx.save();
    for (let i = 0; i < 70; i++) {
      const x = (i * 137.5) % g.W;
      const y = (i * 97.3 + g.time * (8 + (i % 4) * 4)) % g.H;
      ctx.fillStyle = 'rgba(148,163,184,' + (0.12 + (i % 5) * 0.05).toFixed(2) + ')';
      ctx.fillRect(x, y, 1.6, 1.6);
    }
    ctx.restore();
  }

  function render() {
    ctx.save();
    if (g.shake > 0) {
      const s = g.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    drawBackground();
    VD.States.draw(ctx, g);

    if (g.player && VD.States.cur !== 'TITLE') {
      for (let i = 0; i < g.crystalList.length; i++) g.crystalList[i].draw(ctx);
      for (let i = 0; i < g.asteroids.length; i++) g.asteroids[i].draw(ctx);
      for (let i = 0; i < g.hunters.length; i++) g.hunters[i].draw(ctx);
      if (g.boss) g.boss.draw(ctx);
      for (let i = 0; i < g.ebullets.length; i++) g.ebullets[i].draw(ctx);
      for (let i = 0; i < g.bullets.length; i++) g.bullets[i].draw(ctx);
      g.player.draw(ctx);
    }

    VD.Particles.draw(ctx, g);
    ctx.restore();

    VD.HUD.update(g);
  }

  resize();
  VD.Input.init();
  VD.States.init();
  VD.HUD.init();
  VD.States.set('TITLE', g);

  const STEP = 1 / 60;
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.2) dt = 0.2;
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 5) {
      VD.States.update(STEP, g);
      VD.Input.clear();
      acc -= STEP;
    }
    render();
  }

  requestAnimationFrame(frame);
})();
