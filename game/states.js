(function () {
  const VD = (window.VD = window.VD || {});
  let overlay = null;
  let returnState = 'TITLE';

  function button(action, text) {
    return '<button data-action="' + action + '">' + text + '</button>';
  }

  function menuActions() {
    return '<div class="menu-actions">' +
      button('help', 'HELP / H') +
      button('settings', 'SETTINGS / O') +
      button('scores', 'RECORDS / L') + '</div>';
  }

  function begin(g, story) {
    VD.SFX.resume();
    g.reset();
    States.set(story ? 'STORY' : 'PLAYING', g);
  }

  function openMenu(name, g) {
    returnState = States.cur;
    States.set(name, g);
  }

  function action(name, g) {
    if (g.capture) return;
    VD.SFX.resume();
    if (name === 'launch') begin(g, true);
    else if (name === 'resume') States.set('PLAYING', g);
    else if (name === 'restart') begin(g, false);
    else if (name === 'title') States.set('TITLE', g);
    else if (name === 'help') openMenu('HELP', g);
    else if (name === 'settings') openMenu('SETTINGS', g);
    else if (name === 'scores') openMenu('SCORES', g);
    else if (name === 'back') States.set(returnState, g);
    else if (name === 'help-prev') VD.Bestiary.change(-1);
    else if (name === 'help-next') VD.Bestiary.change(1);
    else if (name === 'story-next') VD.Story.advance(g);
    else if (name === 'story-skip') VD.Story.launch(g);
    else if (name === 'mute') {
      VD.SFX.toggleMute();
      States.set(States.cur, g);
    } else if (name === 'shop-page') VD.Upgrade.buy(g, 5);
    else if (name === 'shop-reroll') VD.Upgrade.reroll(g);
    else if (name === 'shop-launch') VD.Upgrade.launch(g);
  }

  const States = {
    cur: 'TITLE',
    timer: 0,

    init: function () {
      overlay = document.getElementById('overlay');
      overlay.addEventListener('click', function (event) {
        const target = event.target.closest('button');
        if (!target || VD.g.capture) return;
        if (target.dataset.action) action(target.dataset.action, VD.g);
        if (target.dataset.buy !== undefined) VD.Upgrade.buy(VD.g, Number(target.dataset.buy));
        // Shop purchases and re-rolls share the keyboard transaction guards in Upgrade; no orphaned sell action remains.
      });
      overlay.addEventListener('input', function (event) {
        if (!VD.g.capture && event.target.dataset.setting) VD.Settings.input(event.target);
      });
    },

    set: function (s, g) {
      States.cur = s;
      States.timer = 0;
      const audioMode = s === 'PLAYING' ? (g.boss ? 'boss' : 'play') :
        s === 'PAUSED' || s === 'SETTINGS' || s === 'HELP' || s === 'SCORES' ? 'paused' : s.toLowerCase();
      VD.Music.setMode(audioMode);
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
          '<div class="menu-actions">' + button('launch', 'BEGIN FLIGHT') + '</div>' +
          menuActions() +
          '<p class="title-footer">20 SECTORS · 5 WEAPONS · ONE SIGNAL TO SILENCE</p>' +
          '</div>';
      } else if (s === 'PAUSED') {
        overlay.innerHTML =
          '<div class="panel">' +
          '<h1 class="glow-title">PAUSED</h1>' +
          '<p class="stat">WAVE ' + g.wave + ' · ' + g.score + ' POINTS</p>' +
          '<div class="menu-actions">' + button('resume', 'RESUME') +
          button('restart', 'RESTART / R') +
          button('mute', VD.SFX.isMuted() ? 'UNMUTE / M' : 'MUTE / M') + '</div>' +
          menuActions() +
          '<p class="start-hint">PRESS <b>P</b> OR <b>ENTER</b> TO RESUME</p>' +
          '</div>';
      } else if (s === 'WAVE_CLEAR') {
        overlay.innerHTML = '<div class="banner">WAVE ' + g.wave + ' CLEAR</div>';
      } else if (s === 'SHOP') {
        VD.Upgrade.open(g);
      } else if (s === 'GAMEOVER') {
        VD.Storage.submit(g, false);
        overlay.innerHTML =
          '<div class="panel">' +
          '<h1 class="glow-title red">GAME OVER</h1>' +
          '<p class="stat">SCORE <b>' + g.score + '</b></p>' +
          '<p class="stat">WAVE REACHED <b>' + g.wave + '</b></p>' +
          VD.Telemetry.summary(g) +
          VD.Storage.table() +
          '<div class="menu-actions">' + button('restart', 'RETRY') + button('title', 'TITLE') + '</div>' +
          '<p class="start-hint">PRESS <b>ENTER</b> TO RETRY</p>' +
          '</div>';
        VD.SFX.gameOver();
      } else if (s === 'VICTORY') {
        VD.Storage.submit(g, true);
        overlay.innerHTML =
          '<div class="panel">' +
          '<h1 class="glow-title amber">VICTORY</h1>' +
          '<p class="stat">TOTAL SCORE <b>' + g.score + '</b></p>' +
          '<p class="stat">VOID SOVEREIGN DESTROYED — ALL 20 WAVES CLEARED</p>' +
          VD.Telemetry.summary(g) +
          VD.Storage.table() +
          '<div class="menu-actions">' + button('restart', 'FLY AGAIN') + button('title', 'TITLE') + '</div>' +
          '<p class="start-hint">PRESS <b>ENTER</b> TO PLAY AGAIN</p>' +
          '</div>';
      } else if (s === 'STORY') {
        VD.Story.start();
      } else if (s === 'HELP') {
        VD.Bestiary.open();
      } else if (s === 'SETTINGS') {
        overlay.innerHTML = VD.Settings.markup();
      } else if (s === 'SCORES') {
        overlay.innerHTML = '<div class="panel menu"><h1 class="menu-title">FLIGHT RECORDS</h1>' +
          VD.Storage.table() + '<div class="menu-actions">' + button('back', 'BACK / ESC') + '</div></div>';
      } else {
        overlay.innerHTML = '';
      }

      overlay.className = s === 'PLAYING' ? 'hidden' : '';
      if (s !== 'PLAYING' && !g.capture) {
        const first = overlay.querySelector('button');
        if (first) first.focus({ preventScroll: true });
      }
    },

    update: function (dt, g) {
      const I = VD.Input;
      VD.Background.update(dt, g);
      if (States.cur === 'TITLE') { g.time += dt; VD.Particles.update(dt); }

      if (I.hit('m')) {
        VD.SFX.toggleMute();
        if (States.cur === 'PAUSED' || States.cur === 'SETTINGS') States.set(States.cur, g);
      }
      if (States.cur === 'TITLE' || States.cur === 'PAUSED') {
        if (I.hit('h')) { openMenu('HELP', g); return; }
        if (I.hit('o')) { openMenu('SETTINGS', g); return; }
        if (I.hit('l')) { openMenu('SCORES', g); return; }
      }

      if (States.cur === 'TITLE') {
        if (I.hit('Enter') || I.hit(' ')) {
          begin(g, true);
        }
      } else if (States.cur === 'PLAYING') {
        if (I.hit('p') || I.hit('Escape')) {
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
        if (I.hit('r')) begin(g, false);
        else if (I.hit('p') || I.hit('Enter') || I.hit('Escape')) States.set('PLAYING', g);
      } else if (States.cur === 'STORY') {
        g.time += dt;
        VD.Story.update(dt);
        if (I.hit('Escape')) VD.Story.launch(g);
        else if (I.hit('Enter') || I.hit(' ')) VD.Story.advance(g);
      } else if (States.cur === 'HELP') {
        VD.Bestiary.update(dt);
        if (I.hit('ArrowLeft')) VD.Bestiary.change(-1);
        if (I.hit('ArrowRight')) VD.Bestiary.change(1);
        if (I.hit('Escape')) States.set(returnState, g);
      } else if (States.cur === 'SETTINGS' || States.cur === 'SCORES') {
        if (I.hit('Escape')) States.set(returnState, g);
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

    action: action,

    prepareShot: function (name, seed, g) {
      return VD.Capture.prepare(name, seed, g);
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
