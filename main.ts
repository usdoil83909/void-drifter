// VOID DRIFTER packaging entry. Run directly with Node 22:
//   MAKEFUN_OUTPUT_DIR=out3 node main.ts
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
const REQUIRED_SCREENSHOTS = ['1-play.png', '2-title.png', '3-boss.png', '4-gameover.png'];
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  // The kit counts directories too: 993 game entries leave room for the
  // game/ and screenshots/ roots, four screenshots, and dossier.json.
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Runtime manifest: index.html, its stylesheet, and bootstrap's module graph.
// Add new runtime assets here when extending the game. Everything else under
// game/ is packaging debris (including temporary files and Node helper scripts).
const GAME_FILES = new Set([
  'index.html', 'styles.css', 'bootstrap.js', 'palette.js', 'storage.js',
  'settings.js', 'input.js', 'audio.js', 'music.js', 'particles.js',
  'entities.js', 'waves.js', 'armory.js', 'upgrade.js', 'hud.js',
  'bestiary.js', 'story.js', 'background.js', 'telemetry.js', 'states.js',
  'capture.js', 'game.js',
  'polish.js',
]);

function requireDirectory(path: string, label: string): void {
  if (!existsSync(path) || !lstatSync(path).isDirectory()) {
    throw new Error(`${label}: missing or not a plain directory`);
  }
}

function contains(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function build(): void {
  requireDirectory(gameDir, 'game/');
  if (!existsSync(shotsDir)) {
    throw new Error(`screenshots/: missing required screenshots: ${REQUIRED_SCREENSHOTS.join(', ')}`);
  }
  requireDirectory(shotsDir, 'screenshots/');
  const missing = REQUIRED_SCREENSHOTS.filter((name) => !existsSync(join(shotsDir, name)));
  if (missing.length) throw new Error(`screenshots/: missing required screenshots: ${missing.join(', ')}`);
  for (const name of REQUIRED_SCREENSHOTS) {
    const stats = lstatSync(join(shotsDir, name));
    if (!stats.isFile()) throw new Error(`screenshots/${name}: not a plain file`);
    if (stats.size > CAPS.screenshots.max_bytes) {
      throw new Error(`screenshots/${name}: ${stats.size} bytes, over the ${CAPS.screenshots.max_bytes} allowed`);
    }
  }

  // Reject overlapping paths before pruning or replacing any output trees.
  for (const source of [gameDir, shotsDir]) {
    if (contains(out, source) || contains(source, out)) {
      throw new Error('MAKEFUN_OUTPUT_DIR must not overlap game/ or screenshots/');
    }
  }
  for (const name of GAME_FILES) {
    const path = join(gameDir, name);
    if (!existsSync(path) || !lstatSync(path).isFile()) {
      throw new Error(`game/${name}: missing or not a plain runtime file`);
    }
  }
  for (const entry of readdirSync(gameDir)) {
    if (GAME_FILES.has(entry)) continue;
    rmSync(join(gameDir, entry), { recursive: true, force: true });
    console.log(`Pruned game/${entry}`);
  }

  let parsedModules = 0;
  let gameBytes = 0;
  for (const name of GAME_FILES) {
    const path = join(gameDir, name);
    gameBytes += statSync(path).size;
    if (!name.endsWith('.js')) continue;
    const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
      input: readFileSync(path),
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      throw new Error(`game/${name}: does not parse as an ES module\n${result.error?.message ?? result.stderr}`);
    }
    parsedModules += 1;
  }

  mkdirSync(out, { recursive: true });
  // Replace the generated trees so previous builds cannot retain stale files.
  for (const name of ['game', 'screenshots']) {
    rmSync(join(out, name), { recursive: true, force: true });
  }
  cpSync(gameDir, join(out, 'game'), { recursive: true });
  cpSync(shotsDir, join(out, 'screenshots'), {
    recursive: true,
    filter: (source) => source === shotsDir || REQUIRED_SCREENSHOTS.includes(relative(shotsDir, source)),
  });
  const dossier = buildDossier(out, CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log(`game/: ${GAME_FILES.size} files, ${gameBytes} bytes, ${parsedModules} JS modules parsed`);
  console.log(`BUILD-OK ${dossier.byteLength}`);
}

try {
  build();
} catch (error) {
  console.error(`BUILD-FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
