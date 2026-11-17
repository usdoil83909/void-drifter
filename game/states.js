(function () {
  const VD = (window.VD = window.VD || {});
  let overlay = null;

  const States = {
    cur: 'TITLE',
    timer: 0,

    init: function () {
      overlay = document.getElementById('overlay');
    },

    set: function (s, g) {
      States.cur = s;
      States.timer = 0;
      VD.HUD.show(s === 'PLAYING' || s === 'PAUSED' || s === 'WAVE_CLEAR' || s === 'SHOP');

      if (s === 'TITLE') {
        overlay.innerHTML =
          '<div class="panel">' +
          '<h1 class="glow-title">VOID<span>DRIFTER</span></h1>' +
          '<p class="tagline">SURVIVE THE NEON VOID</p>' +
          '<div class="controls">' +
          '<div><b>W</b> / <b>&uarr;</b> thrust</div>' +
          '<div><b>A</b> <b>D</b> / <b>&larr;</b> <b>&rarr;</b> rotate</div>' +
          '<div><b>SPACE</b> fire</div>' +
          '<div><b>1–5</b> equip weapon</div>' +
          '<div><b>SHIFT</b> shield</div>' +
          '<div><b>P</b> pause</div>' +
          '<div><b>M</b> mute</div>' +
          '</div>' +
          '<p class="start-hint">PRESS <b>ENTER</b> TO LAUNCH</p>' +
          '</div>';
      } else if (s === 'PAUSED') {
        overlay.innerHTML =
          '<div class="panel">' +
          '<h1 class="glow-title">PAUSED</h1>' +
          '<p class="start-hint">PRESS <b>P</b> OR <b>ENTER</b> TO RESUME</p>' +
          '</div>';
      } else if (s === 'WAVE_CLEAR') {
        overlay.innerHTML = '<div class="banner">WAVE ' + g.wave + ' CLEAR</div>';
      } else if (s === 'SHOP') {
        VD.Upgrade.open(g);
      } else if (s === 'GAMEOVER') {
        overlay.innerHTML =
          '<div class="panel">' +
          '<h1 class="glow-title red">GAME OVER</h1>' +
          '<p class="stat">SCORE <b>' + g.score + '</b></p>' +
          '<p class="stat">WAVE REACHED <b>' + g.wave + '</b></p>' +
          '<p class="start-hint">PRESS <b>ENTER</b> TO RETRY</p>' +
          '</div>';
        VD.SFX.gameOver();
      } else if (s === 'VICTORY') {
        overlay.innerHTML =
          '<div class="panel">' +
          '<h1 class="glow-title amber">VICTORY</h1>' +
          '<p class="stat">TOTAL SCORE <b>' + g.score + '</b></p>' +
          '<p class="stat">VOID SOVEREIGN DESTROYED — ALL 20 WAVES CLEARED</p>' +
          '<p class="start-hint">PRESS <b>ENTER</b> TO PLAY AGAIN</p>' +
          '</div>';
      } else {
        overlay.innerHTML = '';
      }

      overlay.className = s === 'PLAYING' ? 'hidden' : '';
    },

    update: function (dt, g) {
      const I = VD.Input;
      if (States.cur === 'TITLE') { g.time += dt; VD.Particles.update(dt); }

      if (I.hit('m')) VD.SFX.toggleMute();

      if (States.cur === 'TITLE') {
        if (I.hit('Enter') || I.hit(' ')) {
          VD.SFX.resume();
          g.reset();
          States.set('PLAYING', g);
        }
      } else if (States.cur === 'PLAYING') {
        if (I.hit('p')) {
          States.set('PAUSED', g);
        } else {
          g.step(dt);
          if (States.cur === 'PLAYING') {
            if (VD.Waves.complete(g)) {
              if (g.wave >= VD.Waves.count) States.set('VICTORY', g);
              else {
                States.set('WAVE_CLEAR', g);
                VD.SFX.waveClear();
              }
            }
          }
        }
      } else if (States.cur === 'PAUSED') {
        if (I.hit('p') || I.hit('Enter')) States.set('PLAYING', g);
      } else if (States.cur === 'WAVE_CLEAR') {
        States.timer += dt;
        VD.Particles.update(dt);
        if (States.timer > 2.2) {
          States.set('SHOP', g);
        }
      } else if (States.cur === 'SHOP') {
        VD.Upgrade.update(g);
      } else if (States.cur === 'GAMEOVER' || States.cur === 'VICTORY') {
        if (I.hit('Enter')) {
          g.reset();
          States.set('PLAYING', g);
        }
      }
    },

    draw: function (ctx, g) {
      if (States.cur !== 'TITLE') return;
      const t = g.time;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const x = g.W * (0.2 + 0.15 * i) + Math.sin(t * 0.3 + i) * 40;
        const y = g.H * (0.3 + 0.1 * i) + Math.cos(t * 0.25 + i) * 40;
        const r = 60 + i * 40;
        ctx.strokeStyle = i % 2 ? 'rgba(251,191,36,0.08)' : 'rgba(34,211,238,0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  VD.States = States;
})();
