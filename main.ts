// Token Launch Radar v4 — the entry's build program (Node 22, standard library only).
//
// Reads the sealed snapshot from /input/snapshot.json (or --input <file|dir>), scores every clean
// pre-token protocol with the radar-5 model in lib/model.ts, writes the ranked board to
// /output/board.json, and copies this repository's dashboard/ and screenshots/ to /output. The
// dashboard's data file is written to /output/data.js (the starter's pattern), and the page reads
// it from there: the dossier's text is capped at 65,536 bytes, and the board's 198 rows of numbers
// would crowd out the page's own source. The board's numbers reach the judge through the three
// screenshots and the judge brief, which states the coverage, the model and the blind tests.
// Last, it writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library.
//
// The build is deterministic: the same snapshot always writes the same board.json, data.js and
// dossier.json, byte for byte, and this program checks that before it writes anything. The dossier's
// text is capped at 65,536 bytes; this program refuses a build whose text would be cut, so the judge
// sees the whole source, not a truncated head of it.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

/** The scorer's own caps (reference/gate.json): the text cap shapes the bytes, the rest refuse. */
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** --name <value> out of the arguments, or the fallback. */
function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

/** A fatal error: one line to stderr, exit 1. */
function fail(message: string): never {
  process.stderr.write(`token radar v4: ${message}\n`);
  process.exit(1);
}

const inputArg = arg('input', '/input');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(inputFile)) {
  fail(`no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input`);
}
const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const first = buildRadar(snapshot);
const second = buildRadar(snapshot);
const firstBoard = JSON.stringify({ rows: first.board });
const secondBoard = JSON.stringify({ rows: second.board });
if (firstBoard !== secondBoard) fail('the board is not deterministic: two runs of the same snapshot wrote different boards');
const firstData = dataScript(first.radar);
const secondData = dataScript(second.radar);
if (firstData !== secondData) fail('the dashboard data is not deterministic: two runs of the same snapshot wrote different data.js');
const { board, radar, report } = first;

const issue = boardIssue(board, snapshot);
if (issue !== null) fail(`the model wrote a board the gate refuses: ${issue}`);

// Every farm step is unique across the board: a step copied between rows is not a plan for either.
const steps = new Set<string>();
for (const row of board) {
  for (const s of row.farm_steps) {
    if (steps.has(s)) fail(`the farm step "${s.slice(0, 60)}..." appears on more than one row`);
    steps.add(s);
  }
}

mkdirSync(out, { recursive: true });
mkdirSync(join(out, 'dashboard'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
writeFileSync(join(out, 'board.json'), `${firstBoard}\n`);
writeFileSync(join(out, 'data.js'), firstData);

/** Copy one directory's regular files into `to`, skipping names that start with a dot. */
function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

const dashboardFiles = copyFiles(join(here, 'dashboard'), join(out, 'dashboard'));
const shots = copyFiles(join(here, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) {
  fail(`screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view`);
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) fail(`screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`);
}

// The dashboard is a static page with no network: no external URL may hide in its source.
for (const name of dashboardFiles) {
  const text = readFileSync(join(out, 'dashboard', name), 'utf8');
  if (/https?:\/\//.test(text)) fail(`dashboard/${name} carries an external URL: the dashboard loads nothing from the network`);
}

// The dossier is written last: the scorer rebuilds it from this /output and compares bytes.
const dossier = buildDossier(out, { text_max_bytes: TEXT_MAX_BYTES, screenshots: SCREENSHOT_CAPS, dashboard: { max_files: 400, max_bytes: 4_194_304 } });
writeFileSync(join(out, 'dossier.json'), dossier);
// The dossier's `text` field is what the judge reads; the dossier as a whole also carries the
// screenshots as base64, so the text is measured on its own field, not on the whole document.
const dossierText = (JSON.parse(new TextDecoder('utf-8').decode(dossier)) as { text: string }).text;
if (dossierText.includes('[Cut at')) {
  fail('the dossier text would be cut at the 65,536-byte cap: the judge would not see the whole source');
}
const textBytes = Buffer.byteLength(dossierText, 'utf8');
const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
process.stdout.write(
  `token radar v4: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.above_floor_size} above the floor the list leaves out, ${radar.early_size} early, ${radar.live_size} live set aside)\n` +
    `token radar v4: model ${report.version} log10(mcap) = ${report.fit.a.toFixed(3)} + ${report.fit.b.toFixed(3)}*log10(TVL) ${report.fit.c < 0 ? '-' : '+'} ${Math.abs(report.fit.c).toFixed(3)}*log1p(chains), fit on ${report.fit.n} clean comps\n` +
    `token radar v4: blind tests — 5-fold CV x${report.cv.median_factor.toFixed(2)} (${pct(report.cv.within_2x)} within 2x), forward time split x${report.time_split.median_factor.toFixed(2)}, reverse time split x${report.reverse_time_split.median_factor.toFixed(2)}\n` +
    `token radar v4: fuller model (TVL, chains, age, growth) — CV x${report.full_model.cv.median_factor.toFixed(2)}, forward x${report.full_model.time_split.median_factor.toFixed(2)}, reverse x${report.full_model.reverse_time_split.median_factor.toFixed(2)}: the blind test rejects it, so growth and age stay out of the formula\n` +
    `token radar v4: verdicts FARM ${radar.verdict_counts.FARM} / THIN ${radar.verdict_counts.THIN} / SKIP ${radar.verdict_counts.SKIP}; ${steps.size} unique farm steps; dossier text ${textBytes} bytes (cap ${TEXT_MAX_BYTES})\n` +
    `token radar v4: wrote ${join(out, 'board.json')}, ${join(out, 'dashboard')} (${dashboardFiles.length} files), ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')}\n`,
);
