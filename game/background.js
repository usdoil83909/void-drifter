const VD = window.VD = window.VD || {};
const TAU = Math.PI * 2;

// A separate generator keeps cosmetic detail from changing combat rolls.
function generator(seed) {
  let value = seed >>> 0;
  return function () {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const layers = [];
let offsetX = 0;
let offsetY = 0;
let pulse = 0;
let pulseX = 0.5;
let pulseY = 0.25;
let currentSeed = -1;

function reset(seed) {
  currentSeed = seed >>> 0;
  const random = generator(currentSeed ^ 0x53544152);
  layers.length = 0;
  offsetX = 0;
  offsetY = 0;
  pulse = 0;
  for (let depth = 0; depth < 3; depth++) {
    const stars = [];
    const count = 110 - depth * 30;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: random(),
        y: random(),
        phase: random() * TAU,
        size: 0.6 + depth * 0.45 + random() * 0.6,
        brightness: 0.25 + random() * 0.5,
        warm: random() > 0.84
      });
    }
    layers.push({
      stars,
      drift: 3 + depth * 7,
      parallax: 0.025 + depth * 0.045
    });
  }
}

function update(dt, g) {
  if (currentSeed < 0) reset(g.runSeed || 0);
  if (g.player && VD.States.cur === 'PLAYING') {
    offsetX += g.player.vx * dt;
    offsetY += g.player.vy * dt;
  }
  pulse = Math.max(0, pulse - dt * 0.8);
}

function wrap(value, size) {
  return ((value % size) + size) % size;
}

function cloud(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.45, color.replace(/[^,]+\)$/, '0.055)'));
  gradient.addColorStop(1, 'rgba(11,16,32,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function draw(ctx, g) {
  if (currentSeed < 0) reset(g.runSeed || 0);
  const w = g.W;
  const h = g.H;
  const t = g.time;
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(-30, -30, w + 60, h + 60);
  const radius = Math.max(w, h) * 0.7;
  cloud(ctx,
    w * (0.24 + Math.sin(t * 0.025) * 0.16),
    h * (0.38 + Math.cos(t * 0.021) * 0.18),
    radius,
    'rgba(36,95,136,0.20)');
  cloud(ctx,
    w * (0.78 + Math.cos(t * 0.019) * 0.12),
    h * (0.65 + Math.sin(t * 0.027) * 0.15),
    radius * 0.8,
    'rgba(103,43,132,0.18)');
  cloud(ctx,
    w * (0.5 + Math.sin(t * 0.013) * 0.25),
    h * 0.9,
    radius * 0.55,
    'rgba(129,83,36,0.12)');
  layers.forEach((layer, index) => {
    for (const star of layer.stars) {
      const x = wrap(star.x * w - offsetX * layer.parallax, w);
      const y = wrap(star.y * h + t * layer.drift - offsetY * layer.parallax, h);
      ctx.globalAlpha = star.brightness * (0.8 + Math.sin(t * 0.7 + star.phase) * 0.2);
      ctx.fillStyle = star.warm ? '#ffe0a0' : '#b9e9ff';
      ctx.fillRect(x, y, star.size, star.size);
      if (index === 2 && star.brightness > 0.65) {
        ctx.globalAlpha *= 0.28;
        ctx.fillRect(x - 2, y + star.size / 2, star.size + 4, 0.7);
        ctx.fillRect(x + star.size / 2, y - 2, 0.7, star.size + 4);
      }
    }
  });
  ctx.globalAlpha = 1;
  // A faint, stationary vignette makes HUD text readable over every nebula.
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
  vignette.addColorStop(0, 'rgba(3,7,18,0)');
  vignette.addColorStop(1, 'rgba(3,7,18,0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function bossPulse(g) {
  pulse = 1;
  pulseX = g.boss ? g.boss.x / g.W : 0.5;
  pulseY = g.boss ? Math.max(0.15, g.boss.y / g.H) : 0.25;
}

function drawPulse(ctx, g) {
  if (!pulse) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const radius = (1 - pulse) * Math.max(g.W, g.H) * 1.25 + 40;
  const colors = ['#22d3ee', '#f472b6', '#fbbf24'];
  colors.forEach((color, index) => {
    ctx.strokeStyle = color;
    ctx.globalAlpha = pulse * 0.36;
    ctx.lineWidth = 2 + pulse * 7;
    ctx.beginPath();
    ctx.arc(g.W * pulseX + (index - 1) * 8 * pulse,
      g.H * pulseY,
      radius + index * 9,
      0,
      TAU);
    ctx.stroke();
  });
  ctx.restore();
}

VD.Background = {
  reset,
  update,
  draw,
  bossPulse,
  drawPulse
};
