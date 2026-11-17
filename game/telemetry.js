const VD = window.VD = window.VD || {};

// Run-local counters; no network reporting or persistence of individual events.
function reset(g) {
  g.stats = { kills: 0, bestCombo: 0, shots: 0 };
}

function summary(g) {
  const stats = g.stats;
  return '<p class="stat">FLIGHT TIME <b>' + VD.Storage.duration(g.time) +
    '</b> · ELIMINATIONS <b>' + stats.kills + '</b></p>' +
    '<p class="stat">BEST CHAIN <b>' + stats.bestCombo +
    '</b> · SHOTS <b>' + stats.shots + '</b></p>';
}

VD.Telemetry = { reset, summary };
