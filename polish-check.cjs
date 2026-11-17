const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const server = spawn(process.execPath, ['serve.ts', '--port', '8092'], { stdio: ['ignore', 'pipe', 'inherit'] });

async function main() {
  await new Promise(resolve => server.stdout.once('data', resolve));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    env: { ...process.env, TMPDIR: __dirname + '/.browsers' } });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8092/');
    await page.waitForFunction(() => window.VD && VD.g);
    // Reuse the legacy simulation assertions in the real browser module graph.
    // The old standalone VM loader predates bootstrap.js and has stale file paths.
    const legacy = readFileSync('verify.cjs', 'utf8').split('const lists = ')[1];
    await page.evaluate(body => {
      const assert = {
        ok(value, message) { if (!value) throw Error(message || 'Expected truthy value'); },
        equal(a, b, message) { if (a !== b) throw Error((message || 'Equality') + ': ' + a + ' !== ' + b); },
        deepEqual(a, b, message) { this.equal(JSON.stringify(a), JSON.stringify(b), message); }
      };
      new Function('assert', 'VD', 'g', 'I', 'frame', 'const lists = ' + body)(assert, VD, VD.g, VD.Input, () => {});
      VD.States.set('TITLE', VD.g);
    }, legacy);
    console.log('PASS existing simulation suite in browser: 20 waves, bosses, weapons, pools, shop, replay and pause/retry');

    await page.click('[data-polish="endless"]');
    assert.equal(await page.locator('[data-polish="endless"]').getAttribute('aria-pressed'), 'true');
    await page.click('[data-action="launch"]');
    await page.click('[data-action="story-skip"]');
    const results = await page.evaluate(() => {
      const g = VD.g;
      function empty() {
        for (const key of ['asteroids', 'hunters', 'mines', 'bullets', 'ebullets', 'crystalList']) g.clearList(key);
        g.boss = null;
      }
      const states = [];
      for (let n = 20; n <= 36; n++) {
        empty(); VD.Waves.start(n, g); VD.States.set('PLAYING', g);
        empty(); VD.Waves.update(100, g); empty();
        VD.States.update(1 / 60, g);
        states.push(VD.States.cur);
        VD.States.update(3, g);
        if (!document.querySelector('[aria-label="Wave preview"]')) throw Error('Missing preview');
        VD.Upgrade.launch(g);
        if (g.wave !== n + 1) throw Error('Endless launch failed');
      }
      empty(); VD.Waves.start(1000, g);
      const hull = g.hunters[0].hp;
      const previewSeed = g.seed;
      const preview = VD.Waves.preview(1001, g);
      if (g.seed !== previewSeed) throw Error('Preview consumed RNG');
      g.reset(1234); empty();
      g.player.x = 800; g.player.y = 600; g.player.invuln = 999;
      g.spawn('hunters', 216, 200, 0); g.spawn('hunters', 240, 200, 0);
      g.fire(190, 200, 0, 1900, true, 3, 10, '#fff', 4);
      g.step(1 / 60); g.step(1 / 60);
      const piercing = { hits: g.stats.hits, shots: g.stats.shots, kills: g.stats.byArchetype.Hunter };
      const drop = g.spawn('crystalList', 100, 100, 0);
      drop.collect(g); drop.collect(g);
      const earned = g.stats.creditsEarned;
      g.credits -= 10;
      const afterSpend = g.stats.creditsEarned;
      VD.States.set('GAMEOVER', g);
      return { states, hull, preview, piercing, earned, afterSpend, waves: g.stats.wavesCleared };
    });
    assert.ok(results.states.every(state => state === 'WAVE_CLEAR'));
    assert.ok(results.hull > 100);
    assert.match(results.preview, /EXTREME/);
    assert.deepEqual(results.piercing, { hits: 1, shots: 1, kills: 2 });
    assert.equal(results.earned, 44);
    assert.equal(results.afterSpend, 44);
    assert.equal(results.waves, 0);
    await page.click('[data-polish="stats"]');
    assert.match(await page.locator('#overlay').innerText(), /100.0%/);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => VD.States.cur === 'GAMEOVER');
    await page.keyboard.press('t');
    await page.waitForFunction(() => VD.States.cur === 'STATS');
    await page.setViewportSize({ width: 390, height: 700 });
    await page.click('[data-action="restart"]');
    assert.equal(await page.evaluate(() => VD.g.stats.shots), 0);
    assert.equal(await page.evaluate(() => VD.g.endless), true);
    await page.evaluate(() => { VD.States.set('TITLE', VD.g); });
    await page.keyboard.press('e');
    await page.waitForFunction(() => !VD.g.endless);
    assert.deepEqual(errors, []);
    console.log('PASS endless 20–37, late-wave scaling, preview purity, piercing accuracy, credits, stats navigation, retry and mobile controls');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.kill());
