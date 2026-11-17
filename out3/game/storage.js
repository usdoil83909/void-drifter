// Persistence is optional: private browsing and corrupt saves never stop a run.
const VD = window.VD = window.VD || {};
const PREFIX = 'void-drifter.v2.';
const memory = new Map();

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return memory.has(key) ? memory.get(key) : fallback;
    return JSON.parse(raw);
  } catch {
    return memory.has(key) ? memory.get(key) : fallback;
  }
}

function write(key, value) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function validScore(row) {
  return row && Number.isFinite(row.score) && row.score >= 0 &&
    Number.isInteger(row.wave) && row.wave >= 1 && row.wave <= 20;
}

function loadScores() {
  const saved = read('scores', []);
  if (!Array.isArray(saved)) return [];
  return saved.filter(validScore).map(row => ({
    score: Math.floor(row.score),
    wave: row.wave,
    victory: row.victory === true,
    seconds: Number.isFinite(row.seconds) ? Math.max(0, row.seconds) : 0,
    seed: Number.isInteger(row.seed) ? row.seed >>> 0 : 0
  })).sort((a, b) => b.score - a.score || b.wave - a.wave).slice(0, 5);
}

function submit(g, victory) {
  // Capture fixtures must never displace a player's actual records.
  if (g.capture || g.scoreRecorded) return loadScores();
  g.scoreRecorded = true;
  const scores = loadScores();
  scores.push({
    score: Math.floor(g.score),
    wave: g.wave,
    victory: Boolean(victory),
    seconds: g.time,
    seed: g.runSeed
  });
  scores.sort((a, b) => b.score - a.score || b.wave - a.wave);
  scores.length = Math.min(scores.length, 5);
  write('scores', scores);
  return scores;
}

function duration(seconds) {
  const total = Math.floor(seconds);
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

function table() {
  const scores = VD.g && VD.g.capture ? [] : loadScores();
  let html = '<section class="records"><h2>LOCAL FLIGHT RECORDS</h2>';
  if (!scores.length) {
    return html + '<p class="muted">No flights recorded. Make your mark in the void.</p></section>';
  }
  html += '<table><thead><tr><th scope="col">RANK</th>';
  html += '<th scope="col">SCORE</th><th scope="col">WAVE</th>';
  html += '<th scope="col">TIME</th></tr></thead><tbody>';
  scores.forEach((row, index) => {
    html += '<tr><td>' + String(index + 1).padStart(2, '0') + '</td>';
    html += '<td>' + row.score.toLocaleString('en-US') + '</td>';
    html += '<td>' + row.wave + (row.victory ? ' ★' : '') + '</td>';
    html += '<td>' + duration(row.seconds) + '</td></tr>';
  });
  return html + '</tbody></table></section>';
}

VD.Storage = {
  read,
  write,
  scores: loadScores,
  submit,
  table,
  duration
};
