const VD = window.VD = window.VD || {};
const entries = [
  {
    name: 'Drift asteroid',
    code: 'DEBRIS / A-01',
    kind: 'asteroid',
    type: 3,
    color: '#e879f9',
    first: '01',
    behavior: 'Drifts and wraps across the arena. Large rocks break into two medium pieces; medium pieces break into two small fragments.',
    response: 'Clear a lane before accelerating. A piercing shot can break several generations of debris.',
    detail: 'CONTACT 14 · THREE SIZES · SPLITS ON IMPACT'
  },
  {
    name: 'Hunter',
    code: 'INTERCEPTOR / H-02',
    kind: 'hunter',
    type: 0,
    color: '#f472b6',
    first: '02',
    behavior: 'Approaches to firing range, then maintains distance while aiming single bolts at your position.',
    response: 'Move across its line of fire. Closing head-on gives it a simple shot.',
    detail: 'HULL 2 · AIMED SHOTS · RANGE CONTROL'
  },
  {
    name: 'Weaver',
    code: 'SKIRMISHER / W-03',
    kind: 'hunter',
    type: 1,
    color: '#4ade80',
    first: '03',
    behavior: 'Approaches in a sine strafe, fires a three-round burst, then makes a fast evasive pass before repeating.',
    response: 'Track the end of the burst. Homing missiles handle the sideways movement well.',
    detail: 'HULL 3 · THREE-SHOT BURST · EVASIVE STRAFE'
  },
  {
    name: 'Bulwark',
    code: 'ARMORED DRONE / B-04',
    kind: 'hunter',
    type: 2,
    color: '#fb923c',
    first: '04',
    behavior: 'Advances slowly, plants itself, and fires a radial volley. Its armor reduces damage until its recovery phase. Destruction releases two smaller drones.',
    response: 'Attack after the radial volley. Keep an escape lane for the two children.',
    detail: 'HULL 9 · 40% ARMOR REDUCTION · SPLITS IN TWO'
  },
  {
    name: 'Sniper',
    code: 'BEAM PLATFORM / S-05',
    kind: 'hunter',
    type: 3,
    color: '#c4b5fd',
    first: '05',
    behavior: 'Retreats to long range and locks a visible aim line for 1.2 seconds before firing an instant beam.',
    response: 'Cross the aim line before it brightens. The beam is locked, so a short lateral thrust is enough.',
    detail: 'HULL 4 · BEAM DAMAGE 24 · LOCKED TELEGRAPH'
  },
  {
    name: 'Proximity mine',
    code: 'AREA DENIAL / M-04',
    kind: 'mine',
    type: 0,
    color: '#fb7185',
    first: '04',
    behavior: 'Arms after deployment. Approaching within 90 units triggers a short fuse and an eight-way fragmentation burst.',
    response: 'Shoot from a distance to disarm it safely and earn salvage.',
    detail: 'BLAST DAMAGE 22 · FUSE 0.65s · SHOOT TO DISARM'
  },
  {
    name: 'Sentinel Core',
    code: 'GATE GUARDIAN / CORE-07',
    kind: 'boss',
    type: 1,
    color: '#38bdf8',
    first: '07',
    behavior: 'A rotating shield blocks five of six sectors. The exposed gap turns with the core while ten-shot rings fill the arena.',
    response: 'Follow the gap from a safe distance and release concentrated fire through it.',
    detail: 'HULL 110 · ROTATING SHIELD · RADIAL VOLLEYS'
  },
  {
    name: 'Hive Queen',
    code: 'BROOD CARRIER / HIVE-14',
    kind: 'boss',
    type: 2,
    color: '#4ade80',
    first: '14',
    behavior: 'Weaver escorts sustain an impenetrable shield. Destroying every escort exposes the Queen for seven seconds before a new brood launches.',
    response: 'Clear the entire escort group, then spend the exposure window firing at the carrier.',
    detail: 'HULL 190 · ESCORT SHIELD · SEVEN-SECOND EXPOSURE'
  },
  {
    name: 'Void Sovereign',
    code: 'SIGNAL SOURCE / VOID-20',
    kind: 'boss',
    type: 3,
    color: '#e879f9',
    first: '20',
    behavior: 'Cycles from spiral fire to crossing barrages and aimed fans as its hull falls. Below thirty percent, every pattern accelerates.',
    response: 'Preserve shield energy for crossings. Keep a wide orbit and avoid reversing into the previous spiral.',
    detail: 'HULL 350 · THREE PHASES · ENRAGES BELOW 30%'
  }
];
let page = 0;
const PAGE_SIZE = 3;
let previewTime = 0;
let previews = [];

function preview(entry, index) {
  // A private world prevents help portraits from consuming run RNG or pools.
  let seed = 500 + index;
  const world = {
    W: 200,
    H: 150,
    wave: 1,
    serial: 0,
    random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }
  };
  let object;
  if (entry.kind === 'hunter') {
    object = new VD.Hunter();
    object.init(world, 100, 75, entry.type);
  } else if (entry.kind === 'asteroid') {
    object = new VD.Asteroid();
    object.init(world, 100, 75, 3, 1);
  } else if (entry.kind === 'mine') {
    object = new VD.Mine();
    object.init(world, 100, 75);
    object.state = 1;
  } else {
    object = new VD.Boss();
    object.init(world, entry.type);
    object.x = 100;
    object.y = 75;
    object.entering = false;
    object.enraged = entry.type === 3;
  }
  return object;
}

function markup() {
  const first = page * PAGE_SIZE;
  let html = '<div class="panel menu help"><p class="eyebrow">TACTICAL ARCHIVE</p>';
  html += '<h1 class="menu-title">KNOW THE VOID</h1>';
  html += '<p class="muted">Silhouette, behavior, and a way through.</p>';
  html += '<div class="bestiary-grid">';
  entries.slice(first, first + PAGE_SIZE).forEach((entry, slot) => {
    html += '<article class="enemy-card" style="--item-color:' + entry.color + '">';
    html += '<canvas id="enemy-preview-' + slot + '" width="200" height="150" aria-label="' + entry.name + '"></canvas>';
    html += '<p class="eyebrow">' + entry.code + '</p>';
    html += '<h2>' + entry.name + '</h2>';
    html += '<p class="enemy-intel">FIRST CONTACT / WAVE ' + entry.first + '</p>';
    html += '<p>' + entry.behavior + '</p>';
    html += '<p class="tactic">' + entry.response + '</p>';
    html += '<p class="enemy-detail">' + entry.detail + '</p></article>';
  });
  html += '</div><div class="menu-actions">';
  html += '<button data-action="help-prev">← PREVIOUS</button>';
  html += '<span class="page-number">' + (page + 1) + ' / 3</span>';
  html += '<button data-action="help-next">NEXT →</button>';
  html += '<button data-action="back">BACK / ESC</button></div>';
  html += '<details class="field-manual"><summary>FLIGHT MANUAL & WEAPONS</summary>';
  html += '<p>W / ↑ thrust · A D / ← → rotate · SPACE fire · 1–5 equip owned weapons.</p>';
  html += '<p>Hold SHIFT to block incoming damage. Energy drains while held and recharges when released.</p>';
  html += '<p>Chain kills within four seconds to raise your score multiplier. Taking hull damage breaks the chain.</p>';
  html += '<p>Amber salvage grants 8 credits. Green cells restore 22 hull; cyan cells restore 40 shield.</p>';
  html += '<p>Every fifth amber crystal repairs 12 hull. Uncollected drops are banked at the salvage dock.</p>';
  html += VD.Armory.weaponGuide();
  return html + '</details></div>';
}

function render() {
  document.getElementById('overlay').innerHTML = markup();
  previews = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(preview);
  draw();
}

function open() {
  page = 0;
  previewTime = 0;
  render();
}

function change(direction) {
  page = (page + direction + Math.ceil(entries.length / PAGE_SIZE)) % Math.ceil(entries.length / PAGE_SIZE);
  render();
}

function update(dt) {
  previewTime += dt;
  draw();
}

function draw() {
  previews.forEach((object, index) => {
    const canvas = document.getElementById('enemy-preview-' + index);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 200, 150);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, 200, 150);
    ctx.strokeStyle = '#263751';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(100, 75, 65, 0, Math.PI * 2);
    ctx.moveTo(20, 75);
    ctx.lineTo(180, 75);
    ctx.moveTo(100, 8);
    ctx.lineTo(100, 142);
    ctx.stroke();
    object.angle = previewTime * 0.3;
    object.rot = previewTime * 0.2;
    object.t = previewTime;
    object.draw(ctx);
  });
}

VD.Bestiary = {
  entries,
  open,
  change,
  update,
  draw
};
