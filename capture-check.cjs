const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const server = spawn(process.execPath, ['serve.ts', '--port', '8091'], { stdio: ['ignore', 'pipe', 'inherit'] });
async function main() {
  await new Promise(resolve => server.stdout.once('data', resolve));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    env: { ...process.env, TMPDIR: __dirname + '/.browsers' } });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.route('**/favicon.ico', route => route.fulfill({ status: 204 }));
    for (const shot of ['title', 'play', 'boss', 'gameover']) {
      let previous;
      for (let repeat = 0; repeat < 2; repeat++) {
        await page.goto('http://127.0.0.1:8091/?shot=' + shot + '&seed=1234');
        await page.waitForFunction(() => window.__shotReady === true);
        const snapshot = () => page.evaluate(() => {
          const g = VD.g;
          return { state: VD.States.cur, time: g.time, wave: g.wave, score: g.score, combo: g.combo,
            enemies: [...g.asteroids, ...g.hunters].map(o => [o.x, o.y]),
            shots: [...g.bullets, ...g.ebullets].map(o => [o.x, o.y]),
            boss: g.boss && [g.boss.name, g.boss.hp, g.boss.entering],
            image: g.canvas.toDataURL() };
        });
        const current = await snapshot();
        if (previous) assert.deepEqual(current, previous, shot + ' seeded replay');
        previous = current;
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert.deepEqual(await snapshot(), current, shot + ' frozen');
        if (shot === 'play' || shot === 'boss') {
          assert.equal(current.state, 'PLAYING');
          assert.ok(current.enemies.length > 0 || current.boss, 'enemies spawned');
          assert.ok(current.shots.length > 0, 'projectiles visible');
          if (shot === 'play') assert.ok(current.combo > 0, 'combo visible');
          else { assert.equal(current.boss[0], 'SENTINEL CORE'); assert.equal(current.boss[2], false); }
        }
        if (shot === 'gameover') { assert.equal(current.state, 'GAMEOVER'); assert.ok(current.score > 0); }
      }
      await page.screenshot({ path: 'screenshots/expand3-' + shot + '.png' });
      console.log(shot, { ...previous, image: '[canvas]', enemies: previous.enemies.length, shots: previous.shots.length });
    }
    await page.goto('http://127.0.0.1:8091/');
    await page.click('[data-action="help"]');
    for (let i = 0; i < 3; i++) {
      assert.equal(await page.locator('.enemy-card canvas').count(), 3);
      await page.click('[data-action="help-next"]');
    }
    await page.click('[data-action="back"]');
    await page.click('[data-action="settings"]');
    await page.locator('[data-setting="shake"]').uncheck();
    await page.locator('[data-setting="music"]').fill('30');
    await page.click('[data-action="back"]');
    await page.click('[data-action="launch"]');
    await page.click('[data-action="story-skip"]');
    await page.keyboard.press('p');
    await page.waitForFunction(() => VD.States.cur === 'PAUSED');
    const pausedTime = await page.evaluate(() => VD.g.time);
    await page.click('[data-action="settings"]');
    await page.click('[data-action="back"]');
    assert.equal(await page.evaluate(() => VD.g.time), pausedTime);
    assert.equal(await page.evaluate(() => VD.Music.status().mode), 'paused');
    assert.ok(await page.evaluate(() => VD.Music.status().running));
    await page.click('[data-action="resume"]');
    await page.evaluate(() => { VD.g.credits = 1000; VD.States.set('SHOP', VD.g); });
    const offer = await page.evaluate(() => ({ credits: VD.g.credits, discounts: VD.Upgrade.discounts }));
    await page.click('[data-action="shop-reroll"]');
    assert.equal(await page.evaluate(() => VD.g.credits), offer.credits - 20);
    assert.notDeepEqual(await page.evaluate(() => VD.Upgrade.discounts), offer.discounts);
    await page.click('[data-buy="1"]');
    assert.equal(await page.evaluate(() => VD.g.player.tiers[1]), 1);
    await page.click('[data-action="shop-page"]');
    await page.click('[data-buy="0"]');
    assert.equal(await page.evaluate(() => VD.g.player.maxHull), 125);
    await page.evaluate(() => { VD.g.credits = 0; });
    const discounts = await page.evaluate(() => VD.Upgrade.discounts);
    await page.click('[data-action="shop-reroll"]');
    assert.deepEqual(await page.evaluate(() => VD.Upgrade.discounts), discounts);
    await page.click('[data-action="shop-launch"]');
    assert.equal(await page.evaluate(() => VD.g.wave), 2);
    const records = await page.evaluate(() => {
      const g = VD.g;
      g.score = 12345; VD.States.set('GAMEOVER', g); VD.States.set('GAMEOVER', g);
      const once = VD.Storage.scores().length;
      g.reset(44); g.score = 23456; VD.States.set('GAMEOVER', g);
      return { once, rows: VD.Storage.scores() };
    });
    assert.equal(records.once, 1);
    assert.equal(records.rows.length, 2);
    assert.equal(records.rows[0].seed, 44);
    await page.reload();
    assert.equal(await page.evaluate(() => VD.Storage.scores()[0].score), 23456);
    assert.equal(await page.evaluate(() => VD.Settings.values.shake), false);
    assert.equal(await page.evaluate(() => VD.Settings.values.music), 0.3);
    // Observe actual displacement across fixed updates, independently of screenshots.
    const movement = await page.evaluate(() => {
      VD.g.reset(1234); VD.States.set('PLAYING', VD.g);
      const enemy = VD.g.hunters[0], before = [enemy.x, enemy.y];
      for (let i = 0; i < 60; i++) VD.g.step(1 / 60);
      return { before, after: [enemy.x, enemy.y] };
    });
    assert.notDeepEqual(movement.before, movement.after);
    assert.deepEqual(errors, [], 'browser console and runtime errors');
    console.log('PASS menus, music transport, settings persistence, shop transactions, repeat-run records, enemy movement');
    console.log('PASS captures: all states, replay pixels, frozen simulation, console');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.kill());
