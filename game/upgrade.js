(function () {
  const VD = (window.VD = window.VD || {});
  const names = ['Pulse', 'Scatter', 'Lance', 'Homing Swarm', 'Railgun'];
  const descriptions = ['Rapid bolts / damage + fire rate', 'Wide pellet fan / more pellets', 'Piercing beam / damage + penetration', 'Seeking missiles / larger swarm', 'Hold SPACE, release to fire / charge damage'];
  const systems = ['Hull plating', 'Engine tuning', 'Magnet', 'Shield recharger'];
  const fields = ['plating', 'engine', 'magnet', 'recharger'];
  const benefits = ['+25 max hull and repair 25', '+45 top speed and +150 thrust', '+85 pickup attraction radius', '+9 shield recharge per second'];
  const U = VD.Upgrade = {
    names: names, keys: ['1', '2', '3', '4', '5', '6'], page: 0, message: '',
    open: function (g) {
      U.page = 0; U.message = 'Salvage secured. Select upgrades, then launch.';
      // Bank remaining drops so clearing a wave never forfeits earned salvage.
      for (let i = 0; i < g.crystalList.length; i++) g.crystalList[i].collect(g);
      g.clearList('crystalList'); g.clearList('bullets'); g.clearList('ebullets');
      g.player.charge = 0; g.player.vx = 0; g.player.vy = 0; U.refresh(g);
    },
    price: function (g, index) {
      if (U.page === 0) return 60 + index * 12 + g.player.tiers[index] * 65;
      return 65 + g.player[fields[index]] * 70;
    },
    buy: function (g, index) {
      const p = g.player;
      if (index === 5) { U.page = 1 - U.page; U.message = ''; U.refresh(g); return; }
      if (U.page === 1 && index === 4) {
        if (p.hull >= p.maxHull && p.shield >= p.maxShield) U.message = 'Hull and shield already full.';
        else if (g.credits < 35) U.message = 'Need 35 credits for service.';
        else { g.credits -= 35; p.hull = Math.min(p.maxHull, p.hull + 40); p.shield = p.maxShield; U.message = 'Hull repaired +40. Shield restored.'; VD.SFX.pickup(); }
        U.refresh(g); return;
      }
      const tier = U.page === 0 ? p.tiers[index] : p[fields[index]], cost = U.price(g, index);
      if (tier >= 3) {
        if (U.page === 0) { p.weapon = index; U.message = names[index] + ' equipped (MAX).'; }
        else U.message = 'System already at maximum tier.';
      } else if (g.credits < cost) U.message = 'Insufficient credits — need ' + cost + '.';
      else {
        g.credits -= cost;
        if (U.page === 0) { p.tiers[index]++; p.weapon = index; U.message = names[index] + ' upgraded and equipped.'; }
        else {
          p[fields[index]]++;
          if (index === 0) { p.maxHull += 25; p.hull = Math.min(p.maxHull, p.hull + 25); }
          U.message = systems[index] + ' upgraded.';
        }
        VD.SFX.pickup();
      }
      U.refresh(g);
    },
    update: function (g) {
      for (let i = 0; i < 6; i++) if (VD.Input.hit(U.keys[i])) U.buy(g, i);
      if (VD.Input.hit('Enter')) { VD.Waves.start(g.wave + 1, g); VD.States.set('PLAYING', g); }
    },
    refresh: function (g) {
      let html = '<div class="panel shop"><h1 class="glow-title">SALVAGE DOCK</h1><p class="stat">WAVE ' + g.wave +
        ' COMPLETE · <b>' + g.credits + ' CREDITS</b></p><p>' + (U.page ? 'SHIP SYSTEMS' : 'WEAPONS — THREE TIERS EACH') + '</p><div class="shop-items">';
      for (let i = 0; i < 5; i++) {
        if (U.page && i === 4) { html += '<p><b>5 · Field service — 35 credits</b><br>Repair 40 hull and refill shield</p>'; continue; }
        const tier = U.page ? g.player[fields[i]] : g.player.tiers[i];
        html += '<p><b>' + (i + 1) + ' · ' + (U.page ? systems[i] : names[i]) + ' [' + tier + '/3] — ' +
          (tier === 3 ? 'MAX' : U.price(g, i) + ' credits') + '</b><br>' + (U.page ? benefits[i] : descriptions[i]) + '</p>';
      }
      html += '</div><p><b>6</b> · ' + (U.page ? 'Weapons' : 'Ship systems') + ' &nbsp; | &nbsp; <b>ENTER</b> · Launch wave ' + (g.wave + 1) +
        '</p><p class="shop-message">' + U.message + '</p><p>In flight: 1–5 equip owned weapons · SPACE fire · SHIFT shield</p></div>';
      document.getElementById('overlay').innerHTML = html;
    }
  };
})();
