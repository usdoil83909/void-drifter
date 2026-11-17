const VD = window.VD = window.VD || {};

// Sixteenth-note transport at 104 BPM. A short lookahead tolerates render
// stalls without making pause, mute, or a boss transition feel unresponsive.
const BPM = 104;
const SIXTEENTH = 60 / BPM / 4;
const LOOKAHEAD = 0.12;
const INTERVAL = 25;
const roots = [33, 33, 29, 31];
const bassPattern = [0, null, 0, 12, null, 0, 7, null, 0, null, 12, 0, null, 7, 0, null];
const arpPattern = [0, 7, 12, 15, 19, 12, 7, 15, 0, 7, 14, 15, 19, 15, 12, 7];
const padIntervals = [0, 7, 15];
let context = null;
let bus = null;
let filter = null;
let compressor = null;
let timer = null;
let nextTime = 0;
let step = 0;
let mode = 'title';
let running = false;
let muted = VD.Settings.values.muted;
let level = VD.Settings.values.music;
const voices = new Set();

function frequency(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function volumeForMode() {
  if (mode === 'paused') return 0.28;
  if (mode === 'title' || mode === 'story') return 0.55;
  if (mode === 'shop') return 0.65;
  if (mode === 'gameover') return 0.38;
  return 1;
}

function updateGain() {
  if (!bus) return;
  const target = muted ? 0 : level * 0.38 * volumeForMode();
  bus.gain.cancelScheduledValues(context.currentTime);
  bus.gain.setTargetAtTime(target, context.currentTime, 0.08);
  filter.frequency.setTargetAtTime(mode === 'paused' ? 650 : 4200,
    context.currentTime,
    0.12);
}

function connect(audioContext) {
  if (context) return;
  context = audioContext;
  bus = context.createGain();
  filter = context.createBiquadFilter();
  compressor = context.createDynamicsCompressor();
  filter.type = 'lowpass';
  filter.frequency.value = 4200;
  filter.Q.value = 0.65;
  compressor.threshold.value = -19;
  compressor.knee.value = 12;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.006;
  compressor.release.value = 0.2;
  bus.gain.value = 0;
  bus.connect(filter);
  filter.connect(compressor);
  compressor.connect(context.destination);
  updateGain();
}

function note(type, midi, time, duration, amplitude, detune = 0, attack = 0.008) {
  if (!context || voices.size > 96) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency(midi);
  oscillator.detune.value = detune;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, amplitude), time + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(gain);
  gain.connect(bus);
  const voice = { oscillator, gain };
  voices.add(voice);
  oscillator.onended = function () {
    oscillator.disconnect();
    gain.disconnect();
    voices.delete(voice);
  };
  oscillator.start(time);
  oscillator.stop(time + duration + 0.03);
}

function kick(time, strength) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(125, time);
  oscillator.frequency.exponentialRampToValueAtTime(38, time + 0.17);
  gain.gain.setValueAtTime(strength, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
  oscillator.connect(gain).connect(bus);
  const voice = { oscillator, gain };
  voices.add(voice);
  oscillator.onended = function () {
    oscillator.disconnect();
    gain.disconnect();
    voices.delete(voice);
  };
  oscillator.start(time);
  oscillator.stop(time + 0.23);
}

function tick(time, accent) {
  // Inharmonic, very short oscillators make a metallic closed hi-hat.
  note('square', 112, time, 0.025, accent ? 0.018 : 0.009, 17);
  note('triangle', 119, time, 0.018, accent ? 0.013 : 0.006, -31);
}

function schedule(index, time) {
  const beat = index % 16;
  const bar = Math.floor(index / 16) % roots.length;
  const root = roots[bar];
  const boss = mode === 'boss';
  const calm = mode === 'title' || mode === 'story' || mode === 'gameover';
  const bass = bassPattern[beat];
  if (bass !== null) {
    note('sawtooth', root + bass, time, SIXTEENTH * 1.3, 0.16);
    note('sine', root - 12, time, SIXTEENTH * 1.5, 0.12);
  }
  if (!calm || beat % 2 === 0) {
    note('triangle', root + 24 + arpPattern[beat], time,
      SIXTEENTH * 2.3, calm ? 0.065 : 0.085);
    // A quiet delayed echo supplies space without a feedback network.
    note('sine', root + 24 + arpPattern[beat], time + SIXTEENTH * 1.5,
      SIXTEENTH * 1.5, 0.024);
  }
  if (beat === 0) {
    padIntervals.forEach((interval, voice) => {
      note('triangle', root + 12 + interval, time,
        SIXTEENTH * 18, 0.075, voice * 4 - 4, 0.3);
      note('sine', root + 24 + interval, time,
        SIXTEENTH * 17, 0.025, 5 - voice * 3, 0.4);
    });
  }
  if (!calm && mode !== 'paused') {
    if (beat % 4 === 0) kick(time, boss ? 0.35 : 0.24);
    if (beat % 2 === 0 || boss) tick(time, beat % 4 === 2);
    if (beat === 4 || beat === 12) {
      note('triangle', 53, time, 0.09, 0.08, 23);
      note('square', 94, time, 0.045, 0.025, -19);
    }
  }
  if (boss) {
    // Octave ostinato and a dissonant fifth answer the normal arpeggio.
    if (beat % 2 === 0) {
      note('sawtooth', root + (beat % 4 ? 19 : 12), time,
        SIXTEENTH * 0.8, 0.095, -7);
      note('sawtooth', root + (beat % 4 ? 19 : 12), time,
        SIXTEENTH * 0.8, 0.06, 7);
    }
    if (beat === 14) {
      note('square', root + 30, time, SIXTEENTH * 2, 0.045);
    }
  }
}

function scheduler() {
  if (!running || !context || context.state !== 'running') return;
  // Resuming a background tab must not schedule minutes of missed notes.
  if (nextTime < context.currentTime - 0.1) {
    nextTime = context.currentTime + 0.02;
  }
  while (nextTime < context.currentTime + LOOKAHEAD) {
    schedule(step, nextTime);
    step = (step + 1) % 64;
    nextTime += SIXTEENTH;
  }
}

function start(audioContext) {
  connect(audioContext);
  if (running) return;
  running = true;
  nextTime = context.currentTime + 0.03;
  scheduler();
  timer = window.setInterval(scheduler, INTERVAL);
}

function stop() {
  running = false;
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  for (const voice of voices) {
    voice.gain.gain.cancelScheduledValues(context.currentTime);
    voice.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.02);
    try {
      voice.oscillator.stop(context.currentTime + 0.06);
    } catch {
      // A voice may have naturally ended between scheduling and teardown.
    }
  }
}

function setMode(next) {
  mode = next;
  updateGain();
}

function setVolume(value) {
  level = Math.max(0, Math.min(1, value));
  updateGain();
}

function setMuted(value) {
  muted = Boolean(value);
  updateGain();
}

function status() {
  return {
    running,
    mode,
    step,
    voices: voices.size,
    volume: level,
    muted
  };
}

VD.Music = {
  start,
  stop,
  setMode,
  setVolume,
  setMuted,
  status
};
