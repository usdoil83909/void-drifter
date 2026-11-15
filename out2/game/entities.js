(function () {
  const VD = (window.VD = window.VD || {});
  const AST_R = [0, 15, 28, 46];

  function wrap(o, g, m) {
    m = m == null ? o.r : m;
    const W = g.W;
    const H = g.H;
    if (o.x < -m) o.x = W + m;
    else if (o.x > W + m) o.x = -m;
    if (o.y < -m) o.y = H + m;
    else if (o.y > H + m) o.y = -m;
  }

  VD.Player = class {
    constructor(g) {
      this.g = g;
      this.x = g.W / 2;
      this.y = g.H / 2;
      this.vx = 0;
      this.vy = 0;
      this.angle = -Math.PI / 2;
      this.r = 13;
      this.maxHull = 100;
      this.hull = 100;
      this.maxShield = 100;
      this.shield = 100;
      this.fireCd = 0;
      this.invuln = 2;
      this.thrust = false;
      this.shieldOn = false;
      this.flame = 0;
    }

    update(dt) {
      const I = VD.Input;
      const g = this.g;
      let rot = 0;
      if (I.down('ArrowLeft', 'a')) rot -= 1;
      if (I.down('ArrowRight', 'd')) rot += 1;
      this.angle += rot * 3.6 * dt;

      const accel = 880;
      this.thrust = false;
      if (I.down('ArrowUp', 'w')) {
        this.vx += Math.cos(this.angle) * accel * dt;
        this.vy += Math.sin(this.angle) * accel * dt;
        this.thrust = true;
        this.flame = 1;
      }
      this.flame = Math.max(0, this.flame - dt * 4);

      const damp = Math.exp(-2.8 * dt);
      this.vx *= damp;
      this.vy *= damp;

      const sp = Math.hypot(this.vx, this.vy);
      const max = 360;
      if (sp > max) {
        this.vx *= max / sp;
        this.vy *= max / sp;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      wrap(this, g);

      this.shieldOn = I.down('Shift') && this.shield > 1;
      if (this.shieldOn) this.shield = Math.max(0, this.shield - 42 * dt);
      else this.shield = Math.min(this.maxShield, this.shield + 16 * dt);

      if (this.invuln > 0) this.invuln -= dt;
      this.fireCd -= dt;

      if ((I.down(' ') || I.down('Spacebar')) && this.fireCd <= 0) {
        this.fireCd = 0.15;
        this.shoot();
      }

      if (this.thrust && Math.random() < 0.7) {
        const bx = this.x - Math.cos(this.angle) * this.r;
        const by = this.y - Math.sin(this.angle) * this.r;
        VD.Particles.add(
          bx,
          by,
          -Math.cos(this.angle) * 90 + (Math.random() - 0.5) * 40,
          -Math.sin(this.angle) * 90 + (Math.random() - 0.5) * 40,
          0.25 + Math.random() * 0.2,
          2 + Math.random() * 2,
          '#22d3ee',
          3
        );
      }
    }

    shoot() {
      const s = 640;
      const nx = this.x + Math.cos(this.angle) * this.r;
      const ny = this.y + Math.sin(this.angle) * this.r;
      this.g.bullets.push(
        new VD.Bullet(nx, ny, Math.cos(this.angle) * s + this.vx * 0.3, Math.sin(this.angle) * s + this.vy * 0.3, true)
      );
      VD.SFX.shoot();
      VD.Particles.sparks(nx, ny, '#67e8f9', 3, 90, 0.18);
    }

    damage(amt) {
      if (this.invuln > 0) return;
      if (this.shieldOn) {
        VD.Particles.sparks(this.x, this.y, '#22d3ee', 16, 220, 0.5);
        VD.SFX.small();
        return;
      }
      this.hull -= amt;
      this.invuln = 0.9;
      VD.SFX.hit();
      VD.Particles.burst(this.x, this.y, '#22d3ee', 18, 0.9);
      VD.Particles.flash('#f43f5e', 0.35);
      this.g.shake = Math.min(18, this.g.shake + 10);
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      if (this.thrust) {
        const f = 0.6 + Math.random() * 0.6;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#67e8f9';
        ctx.beginPath();
        ctx.moveTo(-this.r * 0.6, -this.r * 0.5);
        ctx.lineTo(-this.r * 0.6 - this.r * 1.5 * f, 0);
        ctx.lineTo(-this.r * 0.6, this.r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.4;
      ctx.fillStyle = 'rgba(34,211,238,0.12)';
      ctx.beginPath();
      ctx.moveTo(this.r, 0);
      ctx.lineTo(-this.r * 0.7, -this.r * 0.75);
      ctx.lineTo(-this.r * 0.3, 0);
      ctx.lineTo(-this.r * 0.7, this.r * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + 5, 0, 6.2832);
        ctx.stroke();
        ctx.restore();
      }

      if (this.shieldOn) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.g.time * 20);
        ctx.strokeStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 16;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r + 9, 0, 6.2832);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  VD.Bullet = class {
    constructor(x, y, vx, vy, friendly) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.friendly = friendly;
      this.r = friendly ? 3 : 4;
      this.life = friendly ? 1.2 : 3.2;
      this.dead = false;
      this.color = friendly ? '#22d3ee' : '#f472b6';
    }

    update(dt, g) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;
      if (this.life <= 0) this.dead = true;
      if (this.x < -30 || this.x > g.W + 30 || this.y < -30 || this.y > g.H + 30) this.dead = true;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = this.r;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 0.02, this.y - this.vy * 0.02);
      ctx.stroke();
      ctx.restore();
    }
  };

  VD.Crystal = class {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 40;
      this.vy = (Math.random() - 0.5) * 40;
      this.r = 8;
      this.rot = Math.random() * 6.28;
      this.rotSpd = (Math.random() - 0.5) * 2;
      this.dead = false;
      this.t = 0;
    }

    update(dt, g) {
      this.t += dt;
      const p = g.player;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 190) {
        const pull = 1500 * (1 - d / 190);
        this.vx += (dx / d) * pull * dt;
        this.vy += (dy / d) * pull * dt;
      }
      const damp = Math.exp(-1.4 * dt);
      this.vx *= damp;
      this.vy *= damp;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rot += this.rotSpd * dt;
      wrap(this, g, 12);
      if (d < p.r + this.r + 4) this.collect(g);
    }

    collect(g) {
      this.dead = true;
      g.score += 10;
      g.crystalCount++;
      VD.SFX.pickup();
      VD.Particles.sparkle(this.x, this.y, '#fbbf24');
      if (g.crystalCount % 5 === 0) {
        g.player.hull = Math.min(g.player.maxHull, g.player.hull + 12);
        VD.Particles.sparks(g.player.x, g.player.y, '#4ade80', 20, 140, 0.6);
      }
    }

    draw(ctx) {
      const pulse = 1 + 0.15 * Math.sin(this.t * 6);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -this.r * pulse);
      ctx.lineTo(this.r * 0.7 * pulse, 0);
      ctx.lineTo(0, this.r * pulse);
      ctx.lineTo(-this.r * 0.7 * pulse, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };

  VD.Asteroid = class {
    constructor(x, y, level, speedMul) {
      this.x = x;
      this.y = y;
      this.level = level;
      this.r = AST_R[level];
      this.dead = false;
      const a = Math.random() * 6.2832;
      const s = (20 + Math.random() * 30) * (speedMul || 1) * (1 + (3 - level) * 0.25);
      this.vx = Math.cos(a) * s;
      this.vy = Math.sin(a) * s;
      this.rot = Math.random() * 6.28;
      this.rotSpd = (Math.random() - 0.5) * 1.6;
      this.verts = [];
      const n = 8 + ((Math.random() * 4) | 0);
      for (let i = 0; i < n; i++) this.verts.push(0.72 + Math.random() * 0.5);
    }

    update(dt, g) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rot += this.rotSpd * dt;
      wrap(this, g);
    }

    hit(g) {
      VD.Particles.sparks(this.x, this.y, '#e879f9', 12, 150, 0.5);
      if (this.level > 1) {
        VD.SFX.small();
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * 6.2832;
          const na = new VD.Asteroid(this.x + Math.cos(a) * 8, this.y + Math.sin(a) * 8, this.level - 1, 0.8);
          na.vx = this.vx + Math.cos(a) * 40;
          na.vy = this.vy + Math.sin(a) * 40;
          g.asteroids.push(na);
        }
        g.score += this.level * 10;
      } else {
        VD.SFX.explosion();
        VD.Particles.burst(this.x, this.y, '#e879f9', 22, 0.8);
        g.score += 25;
        if (Math.random() < 0.5) g.crystalList.push(new VD.Crystal(this.x, this.y));
      }
      this.dead = true;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.strokeStyle = '#e879f9';
      ctx.fillStyle = 'rgba(232,121,249,0.08)';
      ctx.shadowColor = '#e879f9';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const n = this.verts.length;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.2832;
        const rr = this.r * this.verts[i];
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };

  VD.Hunter = class {
    constructor(x, y, speedMul) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.r = 13;
      this.angle = 0;
      this.hp = 2;
      this.fireCd = 1 + Math.random();
      this.dead = false;
      this.speedMul = speedMul || 1;
    }

    update(dt, g) {
      const p = g.player;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.angle = Math.atan2(dy, dx);

      const desired = d > 230 ? 1 : d < 160 ? -1 : 0;
      const accel = 190 * this.speedMul * desired;
      this.vx += (dx / d) * accel * dt;
      this.vy += (dy / d) * accel * dt;

      const damp = Math.exp(-1.8 * dt);
      this.vx *= damp;
      this.vy *= damp;

      const sp = Math.hypot(this.vx, this.vy);
      const max = 190 * this.speedMul;
      if (sp > max) {
        this.vx *= max / sp;
        this.vy *= max / sp;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      wrap(this, g);

      this.fireCd -= dt;
      if (this.fireCd <= 0 && d < 520) {
        this.fireCd = 1.4 + Math.random() * 0.6;
        const s = 300;
        g.ebullets.push(
          new VD.Bullet(
            this.x + Math.cos(this.angle) * this.r,
            this.y + Math.sin(this.angle) * this.r,
            Math.cos(this.angle) * s,
            Math.sin(this.angle) * s,
            false
          )
        );
        VD.SFX.shoot();
      }
    }

    hit(g) {
      this.hp--;
      VD.Particles.sparks(this.x, this.y, '#f472b6', 10, 140, 0.4);
      if (this.hp <= 0) {
        this.dead = true;
        VD.SFX.explosion();
        VD.Particles.burst(this.x, this.y, '#f472b6', 20, 0.8);
        g.score += 150;
        if (Math.random() < 0.6) g.crystalList.push(new VD.Crystal(this.x, this.y));
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.shadowColor = '#f472b6';
      ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(244,114,182,0.15)';
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.r, 0);
      ctx.lineTo(-this.r * 0.8, -this.r * 0.8);
      ctx.lineTo(-this.r * 0.3, 0);
      ctx.lineTo(-this.r * 0.8, this.r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, 6.2832);
      ctx.fillStyle = '#f9a8d4';
      ctx.fill();
      ctx.restore();
    }
  };

  VD.Boss = class {
    constructor(g) {
      this.x = g.W / 2;
      this.y = -120;
      this.r = 64;
      this.maxHp = 70;
      this.hp = 70;
      this.dead = false;
      this.t = 0;
      this.phase = 0;
      this.cd = 1.6;
      this.entering = true;
      this.dir = 1;
      this.angle = 0;
      this.hitFlash = 0;
    }

    update(dt, g) {
      this.t += dt;
      const p = g.player;

      if (this.entering) {
        this.y += 90 * dt;
        if (this.y >= 150) {
          this.y = 150;
          this.entering = false;
          VD.SFX.boss();
          VD.Particles.flash('#e879f9', 0.4);
        }
        return;
      }

      this.x += this.dir * 70 * dt;
      if (this.x < 120) {
        this.x = 120;
        this.dir = 1;
      }
      if (this.x > g.W - 120) {
        this.x = g.W - 120;
        this.dir = -1;
      }
      this.y = 150 + Math.sin(this.t * 1.2) * 30;
      this.angle = Math.atan2(p.y - this.y, p.x - this.x);

      if (this.hitFlash > 0) this.hitFlash -= dt;
      this.cd -= dt;

      if (this.cd <= 0) {
        this.phase = (this.phase + 1) % 3;
        if (this.phase === 0) {
          for (let i = -2; i <= 2; i++) {
            const a = this.angle + i * 0.18;
            g.ebullets.push(
              new VD.Bullet(this.x + Math.cos(a) * this.r, this.y + Math.sin(a) * this.r, Math.cos(a) * 340, Math.sin(a) * 340, false)
            );
          }
          VD.SFX.shoot();
          this.cd = 1.5;
        } else if (this.phase === 1) {
          const n = 14;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * 6.2832 + this.t;
            g.ebullets.push(new VD.Bullet(this.x, this.y, Math.cos(a) * 260, Math.sin(a) * 260, false));
          }
          VD.SFX.explosion();
          this.cd = 1.9;
        } else {
          VD.SFX.hit();
          g.asteroids.push(new VD.Asteroid(this.x - 40, this.y + 40, 2, 1.2));
          g.asteroids.push(new VD.Asteroid(this.x + 40, this.y + 40, 2, 1.2));
          this.cd = 2.2;
        }
      }
    }

    hit(g) {
      this.hp--;
      this.hitFlash = 0.12;
      VD.Particles.sparks(this.x, this.y, '#fbbf24', 8, 150, 0.4);
      if (this.hp <= 0) {
        this.dead = true;
        VD.SFX.explosion();
        VD.SFX.victory();
        for (let i = 0; i < 5; i++) {
          VD.Particles.burst(this.x + (Math.random() - 0.5) * 80, this.y + (Math.random() - 0.5) * 80, '#fbbf24', 26, 1.4);
        }
        VD.Particles.flash('#fbbf24', 0.6);
        g.shake = 20;
        g.bossDown = true;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const col = this.hitFlash > 0 ? '#ffffff' : '#e879f9';
      ctx.shadowColor = col;
      ctx.shadowBlur = 26;
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(232,121,249,0.10)';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.2832 + this.t * 0.3;
        const x = Math.cos(a) * this.r;
        const y = Math.sin(a) * this.r;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.t * 8);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, this.r * 0.45, 0, 6.2832);
      ctx.fill();
      ctx.restore();
    }
  };
})();
