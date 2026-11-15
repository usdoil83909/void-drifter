// VOID DRIFTER entry (Node 22, standard library only): game/ holds the plain static files a
// desktop browser loads offline, screenshots/ holds the four renders the judge sees, and this
// program copies both beside an in-container /output or MAKEFUN_OUTPUT_DIR and writes the
// dossier.json summary with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const REQUIRED_SCREENSHOTS = ['1-play.png', '2-title.png', '3-boss.png', '4-gameover.png'];
const SCREENSHOT_MAX_BYTES = 262144;

function gameTreeStats(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = gameTreeStats(path);
      files += nested.files;
      bytes += nested.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

function checkModuleParsing(dir: string, base: string): number {
  let checked = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      checked += checkModuleParsing(path, base);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
      input: readFileSync(path),
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      const name = path.slice(base.length + 1);
      throw new Error(`game/${name}: does not parse as an ES module\n${result.stderr ?? result.error}`);
    }
    checked += 1;
  }
  return checked;
}

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

if (!existsSync(gameDir)) throw new Error('game/: missing');
if (!existsSync(shotsDir)) throw new Error('screenshots/: missing');

const shotEntries = readdirSync(shotsDir, { withFileTypes: true });
const shotNames = shotEntries.map((entry) => entry.name).sort();
const expectedNames = [...REQUIRED_SCREENSHOTS].sort();
if (
  shotNames.length !== expectedNames.length ||
  shotNames.some((name, index) => name !== expectedNames[index])
) {
  throw new Error(
    `screenshots/: expected exactly ${REQUIRED_SCREENSHOTS.join(', ')}, found ${shotNames.join(', ') || 'nothing'}`,
  );
}
for (const name of REQUIRED_SCREENSHOTS) {
  const path = join(shotsDir, name);
  const stats = statSync(path);
  if (!stats.isFile()) throw new Error(`screenshots/${name}: not a file`);
  if (stats.size > SCREENSHOT_MAX_BYTES) {
    throw new Error(
      `screenshots/${name}: ${stats.size} bytes, over the ${SCREENSHOT_MAX_BYTES} (256 KiB) allowed`,
    );
  }
}

const parsedModules = checkModuleParsing(gameDir, gameDir);

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

const stats = gameTreeStats(gameDir);
console.log(`game/: ${stats.files} files, ${stats.bytes} bytes, ${parsedModules} JS modules parsed`);
console.log(`dossier.json: ${dossier.byteLength} bytes`);
