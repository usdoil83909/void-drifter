(function () {
  const VD = (window.VD = window.VD || {});
  const MAX = 900;

  const Particles = (VD.Particles = {
    list: [],
    flashA: 0,
    flashCol: '#ffffff',
    add: function (x, y, vx, vy, life, size, color, drag) {
      if (Particles.list.length >= MAX) Particles.list.shift();
      Particles.list.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        life: life,
        max: life,
        size: size,
        color: color,
        drag: drag == null ? 2.2 : drag
      });
    },
    sparks: function (x, y, color, n, spd, life) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = spd * (0.3 + Math.random());
        Particles.add(
          x,
          y,
          Math.cos(a) * s,
          Math.sin(a) * s,
          (life || 0.5) * (0.5 + Math.random()),
          2 + Math.random() * 2,
          color
        );
      }
    },
    burst: function (x, y, color, n, scale) {
      scale = scale || 1;
      Particles.sparks(x, y, color, n, 180 * scale, 0.6);
      Particles.sparks(x, y, '#ffffff', Math.floor(n / 2), 120 * scale, 0.4);
      Particles.add(x, y, 0, 0, 0.25, 18 * scale, color, 0);
    },
    sparkle: function (x, y, color) {
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 40 + Math.random() * 80;
        Particles.add(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.5 + Math.random() * 0.3, 1.5 + Math.random() * 2, color || '#fbbf24');
      }
    },
    flash: function (color, a) {
      Particles.flashCol = color || '#ffffff';
      Particles.flashA = Math.max(Particles.flashA, a || 0.3);
    },
    update: function (dt) {
      const L = Particles.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.life -= dt;
        if (p.life <= 0) {
          L.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      if (Particles.flashA > 0) Particles.flashA = Math.max(0, Particles.flashA - dt * 2.4);
    },
    draw: function (ctx, g) {
      const L = Particles.list;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < L.length; i++) {
        const p = L[i];
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, 6.2832);
        ctx.fill();
      }
      ctx.restore();
      if (Particles.flashA > 0) {
        ctx.save();
        ctx.globalAlpha = Particles.flashA;
        ctx.fillStyle = Particles.flashCol;
        ctx.fillRect(0, 0, g.W, g.H);
        ctx.restore();
      }
    }
  });
})();
