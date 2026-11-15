(function () {
  const VD = (window.VD = window.VD || {});

  const defs = [
    { large: 2, hunters: 0, crystals: 5, speed: 0.6 },
    { large: 3, hunters: 0, crystals: 4, speed: 0.7 },
    { large: 3, hunters: 1, crystals: 4, speed: 0.8 },
    { large: 4, hunters: 1, crystals: 5, speed: 0.9 },
    { large: 4, hunters: 2, crystals: 5, speed: 1.0 },
    { large: 5, hunters: 2, crystals: 5, speed: 1.1 },
    { large: 5, hunters: 3, crystals: 6, speed: 1.2 },
    { large: 6, hunters: 3, crystals: 6, speed: 1.3 },
    { large: 6, hunters: 4, crystals: 6, speed: 1.45 },
    { large: 2, hunters: 2, crystals: 4, speed: 1.2, boss: true }
  ];

  VD.Waves = {
    count: defs.length,
    start: function (n, g) {
      const d = defs[Math.min(n, defs.length) - 1];
      g.wave = n;

      const edge = function () {
        const s = (Math.random() * 4) | 0;
        if (s === 0) return [Math.random() * g.W, -40];
        if (s === 1) return [g.W + 40, Math.random() * g.H];
        if (s === 2) return [Math.random() * g.W, g.H + 40];
        return [-40, Math.random() * g.H];
      };

      for (let i = 0; i < d.large; i++) {
        const p = edge();
        g.asteroids.push(new VD.Asteroid(p[0], p[1], 3, d.speed));
      }
      for (let i = 0; i < d.hunters; i++) {
        const p = edge();
        g.hunters.push(new VD.Hunter(p[0], p[1], Math.min(1.6, 0.8 + n * 0.08)));
      }
      for (let i = 0; i < d.crystals; i++) {
        const p = edge();
        g.crystalList.push(new VD.Crystal(p[0], p[1]));
      }
      if (d.boss) {
        g.boss = new VD.Boss(g);
        g.bossDown = false;
      }
    }
  };
})();
