// Menu extensions share the existing state machine, shop transactions and inputs.
const VD = window.VD;
let resultState = 'GAMEOVER';

function toggleEndless(g) {
  g.endless = !g.endless;
  VD.States.set('TITLE', g);
  document.querySelector('[data-polish="endless"]').focus({ preventScroll: true });
}

const init = VD.States.init;
VD.States.init = function () {
  init();
  document.getElementById('overlay').addEventListener('click', function (event) {
    const target = event.target.closest('[data-polish]');
    const g = VD.g;
    if (!target || g.capture) return;
    const action = target.dataset.polish;
    if (action === 'endless' && VD.States.cur === 'TITLE') toggleEndless(g);
    else if (action === 'stats' && ['GAMEOVER', 'VICTORY'].includes(VD.States.cur)) {
      resultState = VD.States.cur;
      VD.States.set('STATS', g);
    } else if (action === 'stats-back' && VD.States.cur === 'STATS') VD.States.set(resultState, g);
  });
};

const set = VD.States.set;
VD.States.set = function (state, g) {
  // The original completion path requests victory at 20; endless returns to the dock.
  if (state === 'VICTORY' && g.endless) {
    state = 'WAVE_CLEAR';
    VD.SFX.waveClear();
  }
  if (state === 'WAVE_CLEAR' || state === 'VICTORY') {
    g.stats.wavesCleared = Math.max(g.stats.wavesCleared, g.wave);
  }
  set(state, g);
  const overlay = document.getElementById('overlay');
  if (state === 'TITLE') {
    overlay.querySelector('.title-footer').textContent = g.endless ?
      '20 SECTORS + INFINITE WAVES · SCALING ENEMIES · RECURRING BOSSES' :
      '20 SECTORS · 5 WEAPONS · ONE SIGNAL TO SILENCE';
    overlay.querySelector('.controls').insertAdjacentHTML('afterend',
      '<div class="menu-actions"><button data-polish="endless" aria-pressed="' + !!g.endless +
      '">ENDLESS MODE: ' + (g.endless ? 'ON' : 'OFF') + ' / E</button></div>');
  } else if (state === 'GAMEOVER' || state === 'VICTORY') {
    overlay.querySelector('.menu-actions').insertAdjacentHTML('afterbegin',
      '<button data-polish="stats">STATS / T</button>');
  } else if (state === 'STATS') {
    overlay.innerHTML = VD.Telemetry.page(g);
    VD.Music.setMode('paused');
    if (!g.capture) overlay.querySelector('button').focus({ preventScroll: true });
  }
};

const update = VD.States.update;
VD.States.update = function (dt, g) {
  if (VD.States.cur === 'TITLE' && VD.Input.hit('e')) { toggleEndless(g); return; }
  if (['GAMEOVER', 'VICTORY'].includes(VD.States.cur) && VD.Input.hit('t')) {
    resultState = VD.States.cur;
    VD.States.set('STATS', g);
    return;
  }
  if (VD.States.cur === 'STATS' && VD.Input.hit('Escape')) {
    VD.States.set(resultState, g);
    return;
  }
  update(dt, g);
};

const refresh = VD.Upgrade.refresh;
VD.Upgrade.refresh = function (g) {
  refresh(g);
  document.querySelector('.shop-items').insertAdjacentHTML('beforebegin', VD.Waves.preview(g.wave + 1, g));
};
