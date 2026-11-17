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
  const types = ['Asteroids', 'Hunters', 'Weavers', 'Bulwarks', 'Snipers'];
  const bosses = ['', 'Sentinel Core', 'Hive Queen', 'Void Sovereign'];
  for (let i = 0; i < defs.length; i++) defs[i].banner = 'WAVE ' + (i + 1) + ' — ' + defs[i].name;

  function definition(n) {
    if (n <= defs.length) return defs[n - 1];
    const depth = n - defs.length;
    const growth = Math.min(8, Math.floor(depth / 3));
    const name = 'ENDLESS VOID ' + depth;
    // Bounded populations leave room for asteroid and Bulwark splits and Hive swarms.
    // Health continues growing after the population limit is reached.
    return { name: name, banner: 'WAVE ' + n + ' — ' + name,
      mix: [4, 4 + growth, 7 + growth, 4 + Math.floor(growth / 2), 4 + growth],
      boss: depth % 5 === 0 ? 1 + (Math.floor(depth / 5) - 1) % 3 : 0,
      events: [[8, 0, 5], [18, 1, 8 + growth], [28, 2, 5 + growth]] };
  }
  function scale(g) { return g.endless ? 1 + Math.max(0, g.wave - 20) * 0.12 : 1; }
  function edge(g, kind, type) {
    const side = (g.random() * 4) | 0;
    const x = side === 1 ? g.W + 12 : side === 3 ? -12 : g.random() * g.W;
    const y = side === 0 ? -12 : side === 2 ? g.H + 12 : g.random() * g.H;
    return g.spawn(kind, x, y, type, kind === 'asteroids' ? 0.6 + g.wave * 0.04 : false);
  }
  function preview(n, g) {
    const d = definition(n), counts = d.mix.slice();
    let mines = 0;
    for (const event of d.events) {
      if (event[1] === 0) counts[0] += event[2];
      else if (event[1] === 1) mines += event[2];
      else counts[2] += event[2];
    }
    const rows = counts.map((count, i) => count ? types[i] + ' × ' + count : '').filter(Boolean);
    if (mines) rows.push('Mines × ' + mines);
    if (d.boss) rows.push(bosses[d.boss] + ' × 1');
    const weight = counts.reduce((sum, count, i) => sum + count * [1, 2, 3, 5, 4][i], mines * 2);
    const threat = d.boss ? 'BOSS CONTACT' : n > 20 ? 'EXTREME' : weight >= 80 ? 'SEVERE' : weight >= 35 ? 'HIGH' : 'MODERATE';
    return '<section class="field-manual" aria-label="Wave preview"><h2 class="eyebrow">WAVE PREVIEW · ' + n + ' — ' + d.name + '</h2>' +
      '<p>' + rows.join(' · ') + '</p><p class="tactic">THREAT: ' + threat +
      ' · ' + d.events.length + ' timed arrivals' + (g.endless && n > 20 ? ' · Enemy hull ×' + (1 + (n - 20) * 0.12).toFixed(2) : '') + '</p>' +
      '<p class="muted">Includes scheduled arrivals. Asteroid / Bulwark fragments and boss summons are additional.</p></section>';
  }
  // Apply scaling at initialization so reinforcements, split children and summons agree.
  const hunterInit = VD.Hunter.prototype.init;
  VD.Hunter.prototype.init = function (...args) { hunterInit.apply(this, args); this.hp *= scale(args[0]); };
  const bossInit = VD.Boss.prototype.init;
  VD.Boss.prototype.init = function (...args) {
    bossInit.apply(this, args); this.maxHp *= scale(args[0]); this.hp = this.maxHp;
  };
  VD.Waves = {
    count: defs.length, defs: defs, definition: definition, preview: preview,
    start: function (n, g) {
      const d = definition(n);
      g.wave = n; g.waveTime = 0; g.eventIndex = 0; g.bossDown = false;
      g.introTime = 3.2; g.noticeTime = 0; g.warningTime = d.boss ? 3.2 : 0;
      g.banner = d.banner; g.combo = 0; g.comboTime = 0;
      g.player.invuln = 2; g.player.charge = 0;
      for (let type = 0; type < 5; type++) {
        for (let i = 0; i < d.mix[type]; i++) edge(g, type === 0 ? 'asteroids' : 'hunters', type === 0 ? 3 : type - 1);
      }
      for (let i = 0; i < 4; i++) g.spawn('crystalList', g.random() * g.W, g.random() * g.H, 0);
      if (d.boss) { g.boss = g.bossObject; g.boss.init(g, d.boss); VD.SFX.boss(); }
      if (d.boss) VD.Background.bossPulse(g);
    },
    update: function (dt, g) {
      g.waveTime += dt;
      const events = definition(g.wave).events;
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
      return g.eventIndex >= definition(g.wave).events.length && !g.asteroids.length && !g.hunters.length && !g.mines.length && !g.boss;
    }
  };
})();
