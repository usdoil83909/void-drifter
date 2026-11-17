(function () {
  const VD = (window.VD = window.VD || {});
  let ctx = null, master = null, muted = false, toneIndex = 0, noiseIndex = 0;
  const tones = [], noises = [];
  const clearNotes = [523, 659, 784, 1047], loseNotes = [392, 311, 262, 196], winNotes = [523, 659, 784, 1047, 1319];
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(ctx.destination);
      // Persistent voices and one procedural noise buffer avoid per-shot nodes/buffers.
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), data = buffer.getChannelData(0);
      let seed = 71;
      for (let i = 0; i < data.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; data[i] = seed / 2147483648 - 1; }
      for (let i = 0; i < 24; i++) {
        const oscillator = ctx.createOscillator(), gain = ctx.createGain();
        gain.gain.value = 0; oscillator.connect(gain).connect(master); oscillator.start();
        tones.push({ source: oscillator, gain: gain });
      }
      for (let i = 0; i < 12; i++) {
        const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
        source.buffer = buffer; source.loop = true; filter.type = 'lowpass'; gain.gain.value = 0;
        source.connect(filter).connect(gain).connect(master); source.start();
        noises.push({ source: source, filter: filter, gain: gain });
      }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function envelope(gain, start, duration, volume) {
    gain.cancelScheduledValues(ctx.currentTime); gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.setValueAtTime(0.0001, start); gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.exponentialRampToValueAtTime(0.0001, start + duration); gain.setValueAtTime(0, start + duration + 0.02);
  }
  function tone(type, f0, f1, duration, volume, delay) {
    if (muted || !ensure()) return;
    const voice = tones[toneIndex++ % tones.length], t = ctx.currentTime + (delay || 0);
    voice.source.type = type;
    voice.source.frequency.cancelScheduledValues(ctx.currentTime);
    voice.source.frequency.setValueAtTime(f0, t);
    voice.source.frequency.exponentialRampToValueAtTime(Math.max(1, f1 || f0), t + duration);
    envelope(voice.gain.gain, t, duration, volume);
  }
  function noise(duration, volume, f0, f1) {
    if (muted || !ensure()) return;
    const voice = noises[noiseIndex++ % noises.length], t = ctx.currentTime;
    voice.filter.frequency.cancelScheduledValues(t); voice.filter.frequency.setValueAtTime(f0, t);
    voice.filter.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + duration);
    envelope(voice.gain.gain, t, duration, volume);
  }
  function melody(notes, type, duration, volume, spacing) {
    for (let i = 0; i < notes.length; i++) tone(type, notes[i], notes[i], duration, volume, i * spacing);
  }
  VD.SFX = {
    resume: ensure,
    toggleMute: function () { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.6; return muted; },
    isMuted: function () { return muted; },
    shoot: function () { tone('square', 720, 240, 0.09, 0.12); },
    hit: function () { tone('sawtooth', 220, 60, 0.28, 0.22); noise(0.22, 0.18, 1400, 200); },
    pickup: function () { tone('sine', 680, 1200, 0.1, 0.16); tone('sine', 1000, 1600, 0.08, 0.1, 0.06); },
    explosion: function () { noise(0.45, 0.3, 1800, 80); tone('triangle', 180, 40, 0.35, 0.15); },
    small: function () { noise(0.18, 0.18, 2200, 300); },
    waveClear: function () { melody(clearNotes, 'triangle', 0.16, 0.16, 0.1); },
    gameOver: function () { melody(loseNotes, 'sawtooth', 0.34, 0.18, 0.16); },
    victory: function () { melody(winNotes, 'square', 0.2, 0.16, 0.12); },
    boss: function () { tone('sawtooth', 70, 50, 0.9, 0.25); noise(0.9, 0.15, 500, 80); }
  };
})();
