(function () {
  const VD = (window.VD = window.VD || {});
  // Explicit encounters: rocks, Hunters, Weavers, Bulwarks, Snipers, boss,
  // then timed events [seconds, kind (drift/mine/reinforcement), count].
  const defs = [
    { name: 'FIRST LIGHT', mix: [2, 0, 0, 0, 0], events: [] },
    { name: 'HUNTING GROUND', mix: [2, 2, 0, 0, 0], events: [[10, 0, 2]] },
    { name: 'GREEN STREAKS', mix: [2, 1, 2, 0, 0], events: [[12, 2, 2]] },
    { name: 'IRON ORBIT', mix: [2, 2, 1, 1, 0], events: [[10, 1, 4]] },
    { name: 'DEAD SIGHT', mix: [2, 1, 2, 1, 1], events: [[9, 0, 3]] },
    { name: 'THE GAUNTLET', mix: [3, 2, 3, 1, 1], events: [[8, 1, 5], [19, 2, 2]] },
    { name: 'SENTINEL CORE', mix: [1, 1, 0, 0, 0], boss: 1, events: [[14, 0, 2]] },
    { name: 'SHATTERED GATE', mix: [3, 2, 3, 2, 0], events: [[9, 0, 4], [20, 1, 4]] },
    { name: 'CROSSHAIRS', mix: [2, 2, 2, 1, 3], events: [[10, 1, 6]] },
    { name: 'SWARM CURRENT', mix: [2, 2, 6, 1, 1], events: [[8, 2, 3], [18, 0, 3]] },
    { name: 'ARMOR BELT', mix: [3, 2, 2, 4, 1], events: [[12, 1, 6]] },
    { name: 'LASER MAZE', mix: [2, 1, 4, 2, 4], events: [[8, 1, 5], [20, 0, 4]] },
    { name: 'BROOD APPROACH', mix: [3, 2, 7, 2, 2], events: [[9, 2, 4], [21, 1, 6]] },
    { name: 'HIVE QUEEN', mix: [1, 1, 0, 1, 0], boss: 2, events: [[18, 1, 4], [35, 0, 3]] },
    { name: 'AFTER THE HIVE', mix: [3, 3, 5, 3, 3], events: [[10, 0, 5], [22, 2, 4]] },
    { name: 'ORANGE CRUSH', mix: [3, 2, 4, 6, 2], events: [[9, 1, 8], [24, 0, 4]] },
    { name: 'SILENT EXECUTION', mix: [2, 3, 5, 3, 6], events: [[10, 1, 8], [23, 2, 4]] },
    { name: 'NEON TEMPEST', mix: [4, 4, 8, 4, 3], events: [[8, 0, 5], [18, 1, 8], [30, 2, 5]] },
    { name: 'EVENT HORIZON', mix: [4, 4, 7, 5, 5], events: [[8, 1, 8], [19, 0, 6], [31, 2, 5]] },
    { name: 'VOID SOVEREIGN', mix: [1, 0, 2, 0, 1], boss: 3, events: [[16, 0, 3], [32, 1, 6], [48, 2, 3]] }
  ];
  for (let i = 0; i < defs.length; i++) defs[i].banner = 'WAVE ' + (i + 1) + ' — ' + defs[i].name;
  function edge(g, kind, type) {
    const side = (g.random() * 4) | 0;
    const x = side === 1 ? g.W + 12 : side === 3 ? -12 : g.random() * g.W;
    const y = side === 0 ? -12 : side === 2 ? g.H + 12 : g.random() * g.H;
    return g.spawn(kind, x, y, type, kind === 'asteroids' ? 0.6 + g.wave * 0.04 : false);
  }
  VD.Waves = {
    count: defs.length, defs: defs,
    start: function (n, g) {
      const d = defs[n - 1];
      g.wave = n; g.waveTime = 0; g.eventIndex = 0; g.bossDown = false;
      g.introTime = 3.2; g.noticeTime = 0; g.warningTime = d.boss ? 3.2 : 0;
      g.banner = d.banner; g.combo = 0; g.comboTime = 0;
      g.player.invuln = 2; g.player.charge = 0;
      for (let type = 0; type < 5; type++) {
        for (let i = 0; i < d.mix[type]; i++) edge(g, type === 0 ? 'asteroids' : 'hunters', type === 0 ? 3 : type - 1);
      }
      for (let i = 0; i < 4; i++) g.spawn('crystalList', g.random() * g.W, g.random() * g.H, 0);
      if (d.boss) { g.boss = g.bossObject; g.boss.init(g, d.boss); VD.SFX.boss(); }
    },
    update: function (dt, g) {
      g.waveTime += dt;
      const events = defs[g.wave - 1].events;
      // Events remain part of the wave even if the initial enemies die early.
      while (g.eventIndex < events.length && g.waveTime >= events[g.eventIndex][0]) {
        const event = events[g.eventIndex++];
        g.notice = event[1] === 0 ? 'ASTEROID DRIFT INBOUND' : event[1] === 1 ? 'MINE FIELD — SHOOT TO DISARM' : 'WEAVER REINFORCEMENTS';
        g.noticeTime = 2.5;
        for (let i = 0; i < event[2]; i++) {
          if (event[1] === 0) {
            const rock = edge(g, 'asteroids', 2);
            if (rock) { rock.vx = (g.W / 2 - rock.x) * 0.17; rock.vy = (g.H / 2 - rock.y) * 0.17; }
          } else if (event[1] === 1) {
            let x = g.W * (0.12 + 0.76 * i / Math.max(1, event[2] - 1)), y = g.H * (g.eventIndex % 2 ? 0.36 : 0.66);
            if (Math.hypot(x - g.player.x, y - g.player.y) < 130) y = g.player.y < g.H / 2 ? g.H * 0.8 : g.H * 0.2;
            g.spawn('mines', x, y);
          } else edge(g, 'hunters', 1);
        }
      }
    },
    complete: function (g) {
      return g.eventIndex >= defs[g.wave - 1].events.length && !g.asteroids.length && !g.hunters.length && !g.mines.length && !g.boss;
    }
  };
})();
