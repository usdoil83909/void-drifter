const VD = window.VD = window.VD || {};
const panels = [
  {
    number: '01 / SIGNAL',
    heading: 'THE LAST RELAY',
    speaker: 'RELAY NINE · AUTOMATED DISTRESS',
    text: 'The shipping lanes went silent six hours ago. Beyond the relay, every beacon is broadcasting the same impossible coordinate. You are the only pilot still answering.',
    footer: 'LOCATION: OUTER SALVAGE BELT',
    color: '#22d3ee'
  },
  {
    number: '02 / CONTACT',
    heading: 'SOMETHING IS AWAKE',
    speaker: 'DRIFTER · TACTICAL COMPUTER',
    text: 'Hunter drones are stripping the wrecks. Behind them, a Sentinel guards the gate. Whatever woke the machines is deeper in the void. We will need their salvage to get there.',
    footer: 'THREAT: AUTONOMOUS DEFENSE NETWORK',
    color: '#fbbf24'
  },
  {
    number: '03 / DEPARTURE',
    heading: 'KEEP A LIGHT BURNING',
    speaker: 'RELAY NINE · FINAL TRANSMISSION',
    text: 'Twenty sectors stand between us and the source. Keep moving, collect what you can, and refit at every quiet interval. If you reach the Sovereign, end the signal. We will keep a light burning for you.',
    footer: 'FLIGHT CLEARANCE: VOID DRIFTER',
    color: '#22d3ee'
  }
];
let index = 0;
let elapsed = 0;
let revealed = -1;
let complete = false;
const RATE = 42;

function start() {
  index = 0;
  elapsed = 0;
  revealed = -1;
  complete = false;
  render();
}

function render() {
  const panel = panels[index];
  document.getElementById('overlay').innerHTML =
    '<div class="panel menu story" style="--story-color:' + panel.color + '">' +
    '<p class="eyebrow">TRANSMISSION ' + panel.number + '</p>' +
    '<div class="signal-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
    '<h1 class="menu-title">' + panel.heading + '</h1>' +
    '<p class="story-speaker">' + panel.speaker + '</p>' +
    '<p id="story-copy" class="story-copy" aria-hidden="true"></p>' +
    '<p class="sr-only">' + panel.text + '</p>' +
    '<p class="story-footer">' + panel.footer + '</p>' +
    '<div class="story-progress" aria-label="Panel ' + (index + 1) + ' of 3">' +
    panels.map((_, i) => '<i class="' + (i <= index ? 'active' : '') + '"></i>').join('') +
    '</div><div class="menu-actions">' +
    '<button data-action="story-next">CONTINUE / ENTER</button>' +
    '<button data-action="story-skip">SKIP INTRO / ESC</button></div></div>';
  update(0);
}

function update(dt) {
  elapsed += dt;
  const panel = panels[index];
  const count = Math.min(panel.text.length, Math.floor(elapsed * RATE));
  if (count !== revealed) {
    revealed = count;
    const node = document.getElementById('story-copy');
    node.textContent = panel.text.slice(0, count) + (count < panel.text.length ? '▌' : '');
  }
  complete = count === panel.text.length;
}

function advance(g) {
  if (!complete) {
    elapsed = panels[index].text.length / RATE + 1;
    update(0);
    return;
  }
  if (index === panels.length - 1) {
    launch(g);
    return;
  }
  index++;
  elapsed = 0;
  revealed = -1;
  complete = false;
  VD.SFX.panel();
  render();
}

function launch(g) {
  // Reset at launch so no enemy or wave timer advances during narration.
  g.reset(g.runSeed);
  VD.States.set('PLAYING', g);
}

function status() {
  return { index, elapsed, revealed, complete };
}

VD.Story = {
  panels,
  start,
  update,
  advance,
  launch,
  status
};
