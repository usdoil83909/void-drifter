(function () {
  const VD = (window.VD = window.VD || {});
  const MAX = 1100, pool = [];
  for (let i = 0; i < MAX; i++) pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, size: 0, color: '', drag: 0, text: '' });
  let cursor = 0, seed = 12345;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  const labels = [];
  for (let i = 0; i <= 1000; i++) labels.push((i / 10).toFixed(i % 10 ? 1 : 0));
  const P = VD.Particles = {
    flashA: 0, flashCol: '#fff',
    reset: function () { for (let i = 0; i < MAX; i++) pool[i].life = 0; cursor = 0; seed = 12345; P.flashA = 0; },
    add: function (x, y, vx, vy, life, size, color, drag, text) {
      const p = pool[cursor]; cursor = (cursor + 1) % MAX;
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life;
      p.size = size; p.color = color; p.drag = drag == null ? 2.2 : drag; p.text = text || '';
    },
    sparks: function (x, y, color, n, speed, life) {
      for (let i = 0; i < n; i++) {
        const a = random() * Math.PI * 2, s = speed * (0.3 + random());
        P.add(x, y, Math.cos(a) * s, Math.sin(a) * s, (life || 0.5) * (0.5 + random()), 2 + random() * 2, color);
      }
    },
    burst: function (x, y, color, n, scale) {
      scale = scale || 1; P.sparks(x, y, color, n, 180 * scale, 0.6);
      P.sparks(x, y, '#ffffff', n >> 1, 120 * scale, 0.4); P.add(x, y, 0, 0, 0.25, 18 * scale, color, 0);
    },
    explosion: function (x, y, color, tier, g) {
      P.burst(x, y, color, tier === 2 ? 110 : tier === 1 ? 36 : 16, tier === 2 ? 3 : tier === 1 ? 1.3 : 0.65);
      g.shake = Math.max(g.shake, tier === 2 ? 25 : tier === 1 ? 7 : 2.5);
      if (tier === 2) P.flash(color, 0.6);
      if (tier) VD.SFX.explosion(); else VD.SFX.small();
    },
    number: function (x, y, value, color) {
      P.add(x + (random() - 0.5) * 14, y - 12, 0, -40, 0.75, 14, color, 0, labels[Math.min(1000, Math.max(0, Math.round(value * 10)))]);
    },
    trail: function (o, color, scale) {
      const a = Math.atan2(o.vy, o.vx);
      P.add(o.x - Math.cos(a) * o.r, o.y - Math.sin(a) * o.r, -Math.cos(a) * 60, -Math.sin(a) * 60, 0.28, 3 * scale, color, 2);
    },
    sparkle: function (x, y, color) { P.sparks(x, y, color, 6, 80, 0.6); },
    flash: function (color, alpha) { P.flashCol = color; P.flashA = Math.max(P.flashA, alpha); },
    update: function (dt) {
      for (let i = 0; i < MAX; i++) {
        const p = pool[i]; if (p.life <= 0) continue;
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d;
      }
      P.flashA = Math.max(0, P.flashA - dt * 2.4);
    },
    draw: function (ctx, g) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
      for (let i = 0; i < MAX; i++) {
        const p = pool[i]; if (p.life <= 0) continue;
        const alpha = p.life / p.max; ctx.globalAlpha = alpha; ctx.fillStyle = p.color;
        if (p.text) ctx.fillText(p.text, p.x, p.y);
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + alpha * 0.6), 0, Math.PI * 2); ctx.fill(); }
      }
      if (P.flashA > 0) { ctx.globalAlpha = P.flashA; ctx.fillStyle = P.flashCol; ctx.fillRect(0, 0, g.W, g.H); }
      ctx.restore();
    }
  };
})();
