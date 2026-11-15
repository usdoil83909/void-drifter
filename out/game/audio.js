(function () {
  const VD = (window.VD = window.VD || {});
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(type, f0, f1, dur, vol, delay) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function noise(dur, vol, f0, f1, delay) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(f0, t);
    if (f1) flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  const SFX = (VD.SFX = {
    resume: function () {
      ensure();
    },
    toggleMute: function () {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.6;
      return muted;
    },
    isMuted: function () {
      return muted;
    },
    shoot: function () {
      tone('square', 720, 240, 0.09, 0.12);
    },
    hit: function () {
      tone('sawtooth', 220, 60, 0.28, 0.22);
      noise(0.22, 0.18, 1400, 200);
    },
    pickup: function () {
      tone('sine', 680, 1200, 0.1, 0.16);
      tone('sine', 1000, 1600, 0.08, 0.1, 0.06);
    },
    explosion: function () {
      noise(0.45, 0.3, 1800, 80);
      tone('triangle', 180, 40, 0.35, 0.15);
    },
    small: function () {
      noise(0.18, 0.18, 2200, 300);
    },
    waveClear: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone('triangle', f, f, 0.16, 0.16, i * 0.1);
      });
    },
    gameOver: function () {
      [392, 311, 262, 196].forEach(function (f, i) {
        tone('sawtooth', f, f * 0.98, 0.34, 0.18, i * 0.16);
      });
    },
    victory: function () {
      [523, 659, 784, 1047, 1319].forEach(function (f, i) {
        tone('square', f, f, 0.2, 0.16, i * 0.12);
      });
    },
    boss: function () {
      tone('sawtooth', 70, 50, 0.9, 0.25);
      noise(0.9, 0.15, 500, 80);
    }
  });
})();
