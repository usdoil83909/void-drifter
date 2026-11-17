(function () {
  const VD = (window.VD = window.VD || {});
  const el = {};

  const HUD = {
    init: function () {
      el.hud = document.getElementById('hud');
      el.hull = document.getElementById('hull-fill');
      el.shield = document.getElementById('shield-fill');
      el.score = document.getElementById('score');
      el.crystals = document.getElementById('crystals');
      el.wave = document.getElementById('wave');
      el.bossWrap = document.getElementById('boss-wrap');
      el.bossFill = document.getElementById('boss-fill');
      el.bossName = document.getElementById('boss-name');
      el.warning = document.getElementById('warning');
    },

    show: function (v) {
      if (el.hud) el.hud.style.display = v ? 'flex' : 'none';
    },

    update: function (g) {
      const p = g.player;
      if (!p || !el.hull) return;

      const hf = Math.max(0, p.hull / p.maxHull);
      el.hull.style.width = (hf * 100).toFixed(1) + '%';
      el.hull.style.background = hf < 0.3 ? '#f43f5e' : hf < 0.6 ? '#fbbf24' : '#22d3ee';
      el.shield.style.width = Math.max(0, (p.shield / p.maxShield) * 100).toFixed(1) + '%';
      el.score.textContent = g.score + ' · ×' + Math.min(5, 1 + Math.floor(g.combo / 5));
      el.crystals.textContent = g.crystalCount + ' · ' + g.credits + ' CR';
      el.wave.textContent = g.wave;
      el.wave.textContent += '/20 · ' + VD.Upgrade.names[p.weapon] + ' T' + p.tiers[p.weapon];

      if (g.boss && !g.boss.entering) {
        el.bossWrap.style.display = 'block';
        el.bossFill.style.width = Math.max(0, (g.boss.hp / g.boss.maxHp) * 100).toFixed(1) + '%';
        el.bossName.textContent = g.boss.name + (g.boss.type === 1 ? ' · AIM THROUGH THE GAP' :
          g.boss.type === 2 ? (g.boss.exposed ? ' · EXPOSED' : ' · DESTROY THE WEAVERS') :
          ' · PHASE ' + g.boss.phase + (g.boss.enraged ? ' · ENRAGED' : ''));
      } else {
        el.bossWrap.style.display = 'none';
      }

      if (hf < 0.3) {
        el.warning.style.opacity = (0.25 + 0.35 * Math.abs(Math.sin(g.time * 6))).toFixed(2);
      } else {
        el.warning.style.opacity = 0;
      }
    }
  };

  VD.HUD = HUD;
})();
