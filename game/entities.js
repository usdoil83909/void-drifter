(function () {
  const VD = (window.VD = window.VD || {});
  const TAU = Math.PI * 2;
  const COLORS = ['#f472b6', '#4ade80', '#fb923c', '#a78bfa'];
  function wrap(o, g) {
    if (o.x < -o.r) o.x = g.W + o.r;
    else if (o.x > g.W + o.r) o.x = -o.r;
    if (o.y < -o.r) o.y = g.H + o.r;
    else if (o.y > g.H + o.r) o.y = -o.r;
  }
  function polygon(ctx, r, sides, rotation) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rotation + i * TAU / sides;
      if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function shot(g, o, angle, speed) {
    g.fire(o.x + Math.cos(angle) * o.r, o.y + Math.sin(angle) * o.r,
      angle, speed, false, 1, 0, '#f472b6');
  }
  function rayHit(o, p, angle, width) {
    const dx = p.x - o.x, dy = p.y - o.y;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    return along > 0 && Math.abs(dx * Math.sin(angle) - dy * Math.cos(angle)) < p.r + width;
  }
  VD.Player = class {
    constructor(g) {
      this.g = g; this.x = g.W / 2; this.y = g.H / 2;
      this.vx = 0; this.vy = 0; this.angle = -Math.PI / 2; this.r = 13;
      this.maxHull = 100; this.hull = 100; this.maxShield = 100; this.shield = 100;
      this.fireCd = 0; this.invuln = 2; this.thrust = false; this.shieldOn = false;
      this.engine = 0; this.magnet = 0; this.recharger = 0; this.plating = 0;
      this.weapon = 0; this.tiers = new Uint8Array(5); this.tiers[0] = 1;
      this.charge = 0; this.trailCd = 0;
    }
    update(dt) {
      const I = VD.Input, g = this.g;
      this.angle += ((I.down('ArrowRight', 'd') ? 1 : 0) - (I.down('ArrowLeft', 'a') ? 1 : 0)) * 3.6 * dt;
      this.thrust = I.down('ArrowUp', 'w');
      if (this.thrust) {
        this.vx += Math.cos(this.angle) * (880 + this.engine * 150) * dt;
        this.vy += Math.sin(this.angle) * (880 + this.engine * 150) * dt;
      }
      const damp = Math.exp(-2.8 * dt);
      this.vx *= damp; this.vy *= damp;
      const speed = Math.hypot(this.vx, this.vy), max = 360 + this.engine * 45;
      if (speed > max) { this.vx *= max / speed; this.vy *= max / speed; }
      this.x += this.vx * dt; this.y += this.vy * dt; wrap(this, g);
      this.shieldOn = I.down('Shift') && this.shield > 1;
      this.shield = this.shieldOn ? Math.max(0, this.shield - 42 * dt) :
        Math.min(this.maxShield, this.shield + (16 + this.recharger * 9) * dt);
      this.invuln = Math.max(0, this.invuln - dt); this.fireCd -= dt;
      for (let i = 0; i < 5; i++) {
        if (I.hit(VD.Upgrade.keys[i]) && this.tiers[i]) { this.weapon = i; this.charge = 0; }
      }
      const firing = I.down(' ', 'Spacebar');
      if (this.weapon === 4) {
        if (firing && this.fireCd <= 0) this.charge = Math.min(1.2, this.charge + dt);
        if (this.charge > 0 && (!firing || this.charge >= 1.2)) {
          if (this.charge >= 0.25) this.shoot();
          this.charge = 0;
        }
      } else if (firing && this.fireCd <= 0) this.shoot();
      this.trailCd -= dt;
      if (this.thrust && this.trailCd <= 0) {
        this.trailCd = 0.035; VD.Particles.trail(this, '#22d3ee', 1);
      }
    }
    shoot() {
      const g = this.g, w = this.weapon, tier = this.tiers[w];
      const x = this.x + Math.cos(this.angle) * this.r, y = this.y + Math.sin(this.angle) * this.r;
      if (w === 0) {
        this.fireCd = 0.17 - tier * 0.02;
        g.fire(x, y, this.angle, 680, true, 1 + (tier - 1) * 0.5, 0, '#22d3ee');
      } else if (w === 1) {
        this.fireCd = 0.46 - tier * 0.035;
        for (let i = -tier - 1; i <= tier + 1; i++) g.fire(x, y, this.angle + i * 0.10, 600, true, 0.8, 0, '#fbbf24');
      } else if (w === 2) {
        this.fireCd = 0.48 - tier * 0.05;
        g.fire(x, y, this.angle, 1100, true, 1.5 + tier * 0.5, 3 + tier, '#67e8f9', 2);
      } else if (w === 3) {
        this.fireCd = 0.65 - tier * 0.05;
        for (let i = 0; i < tier + 2; i++) g.fire(x, y, this.angle + (i - (tier + 1) / 2) * 0.24, 420, true, 1.3, 0, '#4ade80', 3);
      } else {
        this.fireCd = 0.55;
        g.fire(x, y, this.angle, 1900, true, (3 + tier * 2) * this.charge / 1.2, 10, '#f0abfc', 4);
        g.shake = Math.max(g.shake, this.charge * 6);
      }
      VD.SFX.shoot(); VD.Particles.sparks(x, y, '#67e8f9', 3, 90, 0.18);
    }
    damage(amount) {
      if (this.invuln > 0) return;
      if (this.shieldOn) {
        VD.Particles.sparks(this.x, this.y, '#22d3ee', 10, 180, 0.4); VD.SFX.small(); return;
      }
      this.hull = Math.max(0, this.hull - amount); this.invuln = 0.9;
      this.g.combo = 0; this.g.comboTime = 0;
      VD.Particles.number(this.x, this.y, amount, '#f43f5e');
      VD.Particles.flash('#f43f5e', 0.3); VD.SFX.hit();
      this.g.shake = Math.max(this.g.shake, 10);
    }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
      ctx.strokeStyle = '#22d3ee'; ctx.fillStyle = '#0b263b'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 16; ctx.lineWidth = 2;
      if (this.thrust) {
        ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-24 - Math.sin(this.g.time * 53) * 5, 0); ctx.lineTo(-8, 5); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-10, -10); ctx.lineTo(-4, 0); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (this.shieldOn || (this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0)) {
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.stroke();
      }
      if (this.charge > 0) {
        ctx.strokeStyle = '#f0abfc'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU * this.charge / 1.2); ctx.stroke();
      }
      ctx.restore();
    }
  };
  VD.Bullet = class {
    constructor() { this.hits = new Int32Array(16); }
    init(g, x, y, angle, speed, friendly, damage, pierce, color, kind) {
      this.x = x; this.y = y; this.px = x; this.py = y;
      this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
      this.friendly = friendly; this.damage = damage; this.pierce = pierce;
      this.color = color; this.kind = kind || 0; this.r = friendly ? 3 : 4;
      this.life = friendly ? (kind === 3 ? 2.5 : 1.5) : 5;
      this.dead = false; this.hitCount = 0;
    }
    update(dt, g) {
      this.px = this.x; this.py = this.y;
      if (this.kind === 3) {
        let target = g.boss && !g.boss.entering ? g.boss : null, best = Infinity;
        for (let i = 0; i < g.hunters.length; i++) {
          const e = g.hunters[i], d = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
          if (!e.dead && d < best) { best = d; target = e; }
        }
        if (target) {
          const a = Math.atan2(target.y - this.y, target.x - this.x), old = Math.atan2(this.vy, this.vx);
          const turn = Math.atan2(Math.sin(a - old), Math.cos(a - old));
          const next = old + Math.max(-3.5 * dt, Math.min(3.5 * dt, turn));
          this.vx = Math.cos(next) * 420; this.vy = Math.sin(next) * 420;
        }
      }
      this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt;
      if (this.life <= 0 || this.x < -80 || this.x > g.W + 80 || this.y < -80 || this.y > g.H + 80) this.dead = true;
    }
    draw(ctx) {
      ctx.save(); ctx.strokeStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10;
      ctx.lineWidth = this.kind === 4 ? 5 : this.r; ctx.lineCap = 'round';
      const length = this.kind === 2 || this.kind === 4 ? 0.075 : 0.02;
      ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - this.vx * length, this.y - this.vy * length); ctx.stroke(); ctx.restore();
    }
  };
  VD.Crystal = class {
    init(g, x, y, kind) {
      this.x = x; this.y = y; this.kind = kind || 0; this.r = 8; this.t = 0; this.dead = false;
      this.vx = (g.random() - 0.5) * 40; this.vy = (g.random() - 0.5) * 40;
      this.color = this.kind === 1 ? '#4ade80' : this.kind === 2 ? '#22d3ee' : '#fbbf24';
    }
    update(dt, g) {
      this.t += dt;
      const p = g.player, dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
      const radius = 190 + p.magnet * 85;
      if (d < radius) { this.vx += dx / d * 1500 * (1 - d / radius) * dt; this.vy += dy / d * 1500 * (1 - d / radius) * dt; }
      this.vx *= Math.exp(-1.4 * dt); this.vy *= Math.exp(-1.4 * dt);
      this.x += this.vx * dt; this.y += this.vy * dt; wrap(this, g);
      if (d < p.r + this.r + 4) this.collect(g);
    }
    collect(g) {
      if (this.dead) return;
      this.dead = true;
      if (this.kind === 1) g.player.hull = Math.min(g.player.maxHull, g.player.hull + 22);
      else if (this.kind === 2) g.player.shield = Math.min(g.player.maxShield, g.player.shield + 40);
      else {
        g.credits += 8; g.score += 10; g.crystalCount++;
        if (g.crystalCount % 5 === 0) g.player.hull = Math.min(g.player.maxHull, g.player.hull + 12);
      }
      VD.SFX.pickup(); VD.Particles.sparkle(this.x, this.y, this.color);
    }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y); ctx.strokeStyle = this.color; ctx.fillStyle = '#122237';
      ctx.shadowColor = this.color; ctx.shadowBlur = 12; ctx.lineWidth = 2;
      polygon(ctx, 8 + Math.sin(this.t * 6), 4, Math.PI / 2);
      if (this.kind) {
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
        if (this.kind === 1) { ctx.moveTo(0, -4); ctx.lineTo(0, 4); }
        ctx.stroke();
      }
      ctx.restore();
    }
  };
  VD.Asteroid = class {
    constructor() { this.verts = new Float32Array(10); }
    init(g, x, y, level, speed) {
      this.id = ++g.serial; this.x = x; this.y = y; this.level = level;
      this.r = level === 3 ? 46 : level === 2 ? 28 : 15; this.dead = false;
      const a = g.random() * TAU, s = (20 + g.random() * 30) * (speed || 1);
      this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s; this.rot = a; this.rotSpd = g.random() - 0.5;
      for (let i = 0; i < 10; i++) this.verts[i] = 0.75 + g.random() * 0.4;
    }
    update(dt, g) { this.x += this.vx * dt; this.y += this.vy * dt; this.rot += this.rotSpd * dt; wrap(this, g); }
    hit(g) {
      if (this.dead) return;
      this.dead = true;
      VD.Particles.number(this.x, this.y, 1, '#e879f9');
      if (this.level > 1) {
        for (let i = 0; i < 2; i++) {
          const a = g.random() * TAU;
          const child = g.spawn('asteroids', this.x + Math.cos(a) * 8, this.y + Math.sin(a) * 8, this.level - 1, 1);
          if (child) { child.vx = this.vx + Math.cos(a) * 40; child.vy = this.vy + Math.sin(a) * 40; }
        }
      }
      g.reward(this, this.level === 1 ? 25 : this.level * 10, this.level === 1 ? 4 : 2);
      VD.Particles.explosion(this.x, this.y, '#e879f9', this.level === 3 ? 1 : 0, g);
    }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot);
      ctx.strokeStyle = '#e879f9'; ctx.fillStyle = '#211a35'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = i * TAU / 10, r = this.r * this.verts[i];
        if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  };
  // One pooled enemy record; type 0 retains the original Hunter behavior.
  VD.Hunter = class {
    init(g, x, y, type, small, owner) {
      this.id = ++g.serial; this.x = x; this.y = y; this.type = type || 0; this.small = !!small;
      this.owner = owner || 0; this.vx = 0; this.vy = 0; this.angle = 0; this.dead = false;
      this.r = this.type === 2 ? (this.small ? 14 : 26) : this.type === 3 ? 17 : 13;
      this.hp = this.type === 2 ? (this.small ? 3 : 9) : this.type === 3 ? 4 : this.type === 1 ? 3 : 2;
      this.color = COLORS[this.type]; this.t = g.random() * TAU; this.state = 0;
      this.timer = 0.8 + g.random(); this.burst = 0; this.beam = 0; this.lock = 0;
      this.trailCd = 0; this.flash = 0; this.contactTime = 0; this.speedMul = Math.min(1.6, 0.8 + g.wave * 0.04);
    }
    update(dt, g) {
      this.t += dt; this.timer -= dt; this.beam = Math.max(0, this.beam - dt); this.flash = Math.max(0, this.flash - dt);
      const dx = g.player.x - this.x, dy = g.player.y - this.y, d = Math.hypot(dx, dy) || 1;
      this.angle = Math.atan2(dy, dx);
      let forward = 0, strafe = 0;
      if (this.type === 0) {
        forward = (d > 230 ? 105 : d < 160 ? -105 : 0) * this.speedMul;
        if (this.timer <= 0 && d < 600) { shot(g, this, this.angle, 300); this.timer = 1.4 + g.random() * 0.6; }
      } else if (this.type === 1) {
        // Approach -> three-shot burst -> evasive sine strafe.
        forward = d > 260 ? 155 : d < 150 ? -100 : 20;
        strafe = Math.sin(this.t * 4.8) * (this.state === 2 ? 240 : 170);
        if (this.timer <= 0) {
          if (this.state === 0) { this.state = 1; this.burst = 3; }
          if (this.state === 1) {
            shot(g, this, this.angle, 340); this.burst--; this.timer = 0.14;
            if (!this.burst) { this.state = 2; this.timer = 1.3; }
          } else { this.state = 0; this.timer = 0.4; }
        }
      } else if (this.type === 2) {
        // Armored advance -> planted radial volley -> recovery.
        forward = this.state === 0 ? (this.small ? 75 : 42) : 0;
        if (this.timer <= 0) {
          if (this.state === 0) { this.state = 1; this.timer = 0.7; }
          else if (this.state === 1) {
            for (let i = 0; i < 6; i++) shot(g, this, this.angle + i * TAU / 6, 220);
            this.state = 2; this.timer = 0.8;
          } else { this.state = 0; this.timer = 2.4; }
        }
      } else {
        // Retreat/seek -> locked, visible 1.2s charge -> hitscan -> cooldown.
        forward = this.state === 0 ? (d < 330 ? -125 : d > 460 ? 85 : 0) : 0;
        if (this.state === 0 && this.timer <= 0 && this.x > 0 && this.x < g.W && this.y > 0 && this.y < g.H) {
          this.state = 1; this.timer = 1.2; this.lock = this.angle;
        } else if (this.state === 1 && this.timer <= 0) {
          this.state = 2; this.timer = 1.5; this.beam = 0.18;
          if (rayHit(this, g.player, this.lock, 5)) g.player.damage(24);
          g.shake = Math.max(g.shake, 4); VD.SFX.hit();
        } else if (this.state === 2 && this.timer <= 0) { this.state = 0; this.timer = 0.7; }
      }
      this.vx = dx / d * forward - dy / d * strafe; this.vy = dy / d * forward + dx / d * strafe;
      this.x += this.vx * dt; this.y += this.vy * dt; wrap(this, g);
      if (this.type === 3) {
        this.x = Math.max(this.r, Math.min(g.W - this.r, this.x));
        this.y = Math.max(this.r, Math.min(g.H - this.r, this.y));
      }
      this.trailCd -= dt;
      if (this.trailCd <= 0 && (forward || strafe)) {
        this.trailCd = this.type === 2 ? 0.12 : 0.06; VD.Particles.trail(this, this.color, this.type === 2 ? 1.8 : 0.7);
      }
    }
    hit(g, bullet) {
      if (this.dead) return;
      const damage = (bullet ? bullet.damage : 1) * (this.type === 2 && !this.small && this.state !== 2 ? 0.6 : 1);
      this.hp -= damage; this.flash = 0.09;
      VD.Particles.number(this.x, this.y, damage, this.color);
      if (this.hp > 0) return;
      this.dead = true;
      if (this.type === 2 && !this.small) {
        g.spawn('hunters', this.x - 20, this.y, 2, true); g.spawn('hunters', this.x + 20, this.y, 2, true);
      }
      g.reward(this, this.type === 2 && !this.small ? 250 : 150, this.small ? 8 : 18);
      VD.Particles.explosion(this.x, this.y, this.color, this.type === 2 && !this.small ? 1 : 0, g);
    }
    draw(ctx) {
      ctx.save();
      if (this.type === 3 && (this.state === 1 || this.beam > 0)) {
        ctx.strokeStyle = this.beam > 0 ? '#ffffff' : this.color;
        ctx.globalAlpha = this.beam > 0 ? 1 : 0.35 + (1 - this.timer / 1.2) * 0.6;
        ctx.lineWidth = this.beam > 0 ? 9 : 1 + (1 - this.timer / 1.2) * 2;
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(this.lock) * 4000, this.y + Math.sin(this.lock) * 4000); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.translate(this.x, this.y); ctx.rotate(this.type === 2 ? this.t * 0.3 : this.angle);
      ctx.strokeStyle = this.flash > 0 ? '#ffffff' : this.color; ctx.fillStyle = '#131e32';
      ctx.shadowColor = this.color; ctx.shadowBlur = 12; ctx.lineWidth = this.type === 2 ? 3 : 2;
      if (this.type === 2) { polygon(ctx, this.r, 6, 0); if (!this.small) polygon(ctx, this.r * 0.7, 6, 0); }
      else if (this.type === 3) { polygon(ctx, this.r, 4, 0); ctx.strokeRect(2, -3, 23, 6); }
      else {
        ctx.beginPath(); ctx.moveTo(this.r + (this.type === 1 ? 7 : 0), 0);
        ctx.lineTo(-this.r, -this.r * (this.type === 1 ? 0.5 : 0.8)); ctx.lineTo(-4, 0);
        ctx.lineTo(-this.r, this.r * (this.type === 1 ? 0.5 : 0.8)); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
  };
  VD.Mine = class {
    init(g, x, y) { this.id = ++g.serial; this.x = x; this.y = y; this.r = 12; this.dead = false; this.timer = 1.5; this.state = 0; this.t = 0; }
    update(dt, g) {
      this.t += dt; this.timer -= dt;
      if (this.state === 0 && this.timer <= 0) this.state = 1;
      if (this.state === 1 && Math.hypot(g.player.x - this.x, g.player.y - this.y) < 90) { this.state = 2; this.timer = 0.65; }
      if (this.state === 2 && this.timer <= 0) this.explode(g);
    }
    explode(g) {
      this.dead = true;
      if (Math.hypot(g.player.x - this.x, g.player.y - this.y) < 95) g.player.damage(22);
      for (let i = 0; i < 8; i++) shot(g, this, i * TAU / 8, 190);
      VD.Particles.explosion(this.x, this.y, '#fb7185', 1, g);
    }
    hit(g) { if (!this.dead) { this.dead = true; g.reward(this, 40, 5); VD.Particles.explosion(this.x, this.y, '#fb7185', 0, g); } }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y); ctx.strokeStyle = this.state === 0 ? '#64748b' : '#fb7185'; ctx.fillStyle = '#29162b'; ctx.lineWidth = 2;
      polygon(ctx, this.r, 8, this.t * 0.4);
      if (this.state === 2) { ctx.globalAlpha = 0.3 + Math.abs(Math.sin(this.t * 20)) * 0.5; ctx.beginPath(); ctx.arc(0, 0, 95, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
  };
  VD.Boss = class {
    init(g, type) {
      this.id = ++g.serial; this.type = type; this.x = g.W / 2; this.y = -90; this.r = 60;
      this.name = type === 1 ? 'SENTINEL CORE' : type === 2 ? 'HIVE QUEEN' : 'VOID SOVEREIGN';
      this.color = type === 1 ? '#38bdf8' : type === 2 ? '#4ade80' : '#e879f9';
      this.maxHp = type === 1 ? 110 : type === 2 ? 190 : 350; this.hp = this.maxHp;
      this.dead = false; this.entering = true; this.t = 0; this.phase = 1; this.cd = 1;
      this.angle = 0; this.hitFlash = 0; this.swarmTimer = 0; this.exposed = false; this.enraged = false; this.pattern = 0;
      this.vx = 0; this.vy = 90; this.trailCd = 0;
    }
    phaseChange(g) {
      g.hitStop = 0.03; g.shake = Math.max(g.shake, 16);
      VD.Particles.flash(this.color, 0.35); VD.SFX.boss();
    }
    update(dt, g) {
      this.t += dt; this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.trailCd -= dt;
      if (this.trailCd <= 0) { this.trailCd = 0.07; VD.Particles.trail(this, this.color, 3); }
      if (this.entering) {
        this.y += 90 * dt;
        if (this.y >= Math.min(150, g.H * 0.25)) {
          this.entering = false; this.phaseChange(g);
          if (this.type === 2) this.spawnSwarm(g);
        }
        return;
      }
      const x = g.W / 2 + Math.sin(this.t * 0.45) * Math.max(0, g.W / 2 - 100);
      const y = Math.min(150, g.H * 0.25) + Math.sin(this.t * 1.2) * 25;
      this.vx = (x - this.x) / dt; this.vy = (y - this.y) / dt; this.x = x; this.y = y;
      this.angle = this.t * 0.55;
      if (this.type === 2) {
        let alive = 0;
        for (let i = 0; i < g.hunters.length; i++) if (!g.hunters[i].dead && g.hunters[i].owner === this.id) alive++;
        if (!alive && !this.exposed) { this.exposed = true; this.swarmTimer = 7; this.phaseChange(g); }
        if (this.exposed) { this.swarmTimer -= dt; if (this.swarmTimer <= 0) this.spawnSwarm(g); }
      }
      if (this.type === 3) {
        const phase = this.hp / this.maxHp < 0.34 ? 3 : this.hp / this.maxHp < 0.67 ? 2 : 1;
        const enrage = this.hp / this.maxHp < 0.3;
        if (phase !== this.phase || enrage !== this.enraged) {
          this.phase = phase; this.enraged = enrage; this.phaseChange(g);
          g.notice = enrage ? 'VOID SOVEREIGN — ENRAGED' : 'VOID SOVEREIGN — PHASE ' + phase; g.noticeTime = 2;
        }
      }
      this.cd -= dt;
      if (this.cd > 0) return;
      const aim = Math.atan2(g.player.y - this.y, g.player.x - this.x);
      if (this.type === 1) {
        for (let i = 0; i < 10; i++) shot(g, this, this.angle + i * TAU / 10, 230);
        this.cd = 1.25;
      } else if (this.type === 2) {
        for (let i = -2; i <= 2; i++) shot(g, this, aim + i * 0.22, 260);
        this.cd = this.exposed ? 1.5 : 2;
      } else {
        const speed = this.enraged ? 330 : 260;
        const pattern = this.phase === 1 ? 0 : this.phase === 2 ? this.pattern % 2 : this.pattern % 3;
        if (pattern === 0) for (let i = 0; i < 3; i++) shot(g, this, this.t * 1.8 + i * TAU / 3, speed);
        else if (pattern === 1) for (let i = 0; i < 4; i++) {
          for (let j = -1; j <= 1; j++) shot(g, this, this.angle + i * TAU / 4 + j * 0.09, speed);
        }
        else for (let i = -3; i <= 3; i++) shot(g, this, aim + i * 0.16, speed + 40);
        this.pattern++; this.cd = (pattern === 0 ? 0.16 : 0.8) * (this.enraged ? 0.65 : 1);
      }
    }
    spawnSwarm(g) {
      this.exposed = false;
      for (let i = 0; i < 4 + (this.hp < this.maxHp / 2 ? 2 : 0); i++) {
        const a = i * TAU / 6;
        g.spawn('hunters', this.x + Math.cos(a) * 90, this.y + Math.sin(a) * 90, 1, false, this.id);
      }
      this.phaseChange(g);
    }
    hit(g, bullet) {
      if (this.dead || this.entering) return;
      if (this.type === 1) {
        const a = Math.atan2(bullet.py - this.y, bullet.px - this.x) - this.angle;
        if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > Math.PI / 6) {
          VD.Particles.sparks(bullet.x, bullet.y, '#38bdf8', 4, 80, 0.2); return;
        }
      }
      if (this.type === 2 && !this.exposed) return;
      this.hp = Math.max(0, this.hp - bullet.damage); this.hitFlash = 0.1;
      VD.Particles.number(bullet.x, bullet.y, bullet.damage, '#fbbf24');
      if (this.hp > 0) return;
      this.dead = true; g.bossDown = true; g.reward(this, 2000 * this.type, 150 * this.type);
      VD.Particles.explosion(this.x, this.y, this.color, 2, g); VD.SFX.victory();
    }
    draw(ctx) {
      ctx.save(); ctx.translate(this.x, this.y); ctx.strokeStyle = this.hitFlash > 0 ? '#fff' : this.color;
      ctx.fillStyle = '#201b38'; ctx.shadowColor = this.color; ctx.shadowBlur = 24; ctx.lineWidth = 3;
      polygon(ctx, this.r, this.type === 2 ? 8 : 6, this.angle);
      polygon(ctx, this.r * 0.45, this.type === 3 ? 3 + this.phase : 6, -this.angle);
      if (this.type === 1) {
        ctx.lineWidth = 7;
        for (let i = 0; i < 5; i++) {
          const a = this.angle + Math.PI / 6 + i * Math.PI / 3;
          ctx.beginPath(); ctx.arc(0, 0, this.r + 8, a + 0.025, a + Math.PI / 3 - 0.025); ctx.stroke();
        }
      } else if (this.type === 2 && !this.exposed) {
        ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, this.r + 10, 0, TAU); ctx.stroke();
      } else if (this.enraged) {
        ctx.strokeStyle = '#f43f5e'; polygon(ctx, this.r + 12, 3, -this.angle * 2);
      }
      ctx.restore();
    }
  };
})();
