const VD = window.VD = window.VD || {};
const defaults = Object.freeze({
  shake: true,
  music: 0.55,
  sfx: 0.8,
  muted: false
});

function volume(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

const saved = VD.Storage.read('settings', {});
const source = saved && typeof saved === 'object' ? saved : {};
const values = {
  shake: typeof source.shake === 'boolean' ? source.shake : defaults.shake,
  music: volume(source.music, defaults.music),
  sfx: volume(source.sfx, defaults.sfx),
  muted: typeof source.muted === 'boolean' ? source.muted : defaults.muted
};

function persist() {
  VD.Storage.write('settings', values);
}

function apply() {
  if (VD.SFX) VD.SFX.setVolume(values.sfx);
  if (VD.Music) VD.Music.setVolume(values.music);
}

function set(key, value) {
  if (!(key in defaults)) return;
  if (key === 'music' || key === 'sfx') {
    values[key] = volume(value, values[key]);
  } else {
    values[key] = Boolean(value);
  }
  apply();
  persist();
}

function markup() {
  return '<div class="panel menu settings">' +
    '<p class="eyebrow">FLIGHT COMPUTER / PREFERENCES</p>' +
    '<h1 class="menu-title">SETTINGS</h1>' +
    '<label class="setting-row"><span>Screen shake</span>' +
    '<input data-setting="shake" type="checkbox" ' + (values.shake ? 'checked' : '') + '></label>' +
    '<p class="setting-note">Disables camera motion from impacts and boss arrivals.</p>' +
    '<label class="setting-row"><span>Music <output id="music-value">' +
    Math.round(values.music * 100) + '%</output></span>' +
    '<input aria-label="Music volume" data-setting="music" type="range" min="0" max="100" value="' +
    Math.round(values.music * 100) + '"></label>' +
    '<label class="setting-row"><span>Sound effects <output id="sfx-value">' +
    Math.round(values.sfx * 100) + '%</output></span>' +
    '<input aria-label="Sound effects volume" data-setting="sfx" type="range" min="0" max="100" value="' +
    Math.round(values.sfx * 100) + '"></label>' +
    '<p class="setting-note">Volumes are saved on this device. M toggles all audio.</p>' +
    '<div class="menu-actions"><button data-action="mute">' +
    (VD.SFX.isMuted() ? 'UNMUTE' : 'MUTE') +
    '</button><button data-action="back">BACK / ESC</button></div></div>';
}

function input(target) {
  const key = target.dataset.setting;
  if (!key) return;
  if (key === 'shake') set(key, target.checked);
  else {
    set(key, Number(target.value) / 100);
    const output = document.getElementById(key + '-value');
    if (output) output.textContent = Math.round(values[key] * 100) + '%';
  }
}

VD.Settings = {
  values,
  defaults,
  set,
  apply,
  markup,
  input
};
