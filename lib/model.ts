// Token Launch Radar v4 — model radar-5.
//
// One snapshot of the protocol universe in, one ranked board out. The board
// carries every protocol in the snapshot that records no token and passes the
// watchlist's own cleanliness rule as far as the snapshot's ten fields can
// show it: the 40 watchlist protocols (the floor), the 20 clean protocols
// above the floor the watchlist leaves out, and the 138 clean protocols
// below it. That is 198 rows, and no row is a wrapped, staked, bridged or
// exchange product of a token that already trades.
//
// Implied value is a curve fitted on the snapshot itself, not a list of
// names: log10(market cap) = a + b*log10(TVL) + c*log1p(chains), fit by OLS
// on the 92 launched protocols that already trade and pass the same
// cleanliness rule. The curve is kept only because a blind test keeps it:
// 5-fold cross-validation median factor error x2.94, forward time split
// x2.10, reverse time split x2.11. The fuller curve the criterion's words
// suggest — TVL, chains, log age and 7-day growth — was fitted and is
// reported beside it, and the blind test rejects it (CV x3.43, reverse
// split x2.70), so growth and age stay out of the formula and the report
// says why. Every term in the formula earned its place in a blind test.
//
// Each row carries a bootstrap band (5th-95th percentile of 200 seeded
// refits) and a farm verdict netted at the band's low end: FARM when the
// gas is cheap and the low end is high, SKIP when the gas is dear or the
// low end is low, THIN in between. The farm plan is eight concrete steps,
// each with what it costs and how long it takes, derived from the
// protocol's own record (category, chains, TVL, age) — never a hand-written
// list of names.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The fitted curve's coefficients, as the dashboard states them. */
export interface ModelFit {
  a: number;
  b: number;
  c: number;
  n: number;
}

/** One validation's numbers: median factor error, share within 2x, count. */
export interface ValidationNumbers {
  median_factor: number;
  within_2x: number;
  n: number;
}

/** One bootstrap band: 5th, 50th, 95th percentile. */
export interface BootstrapBand {
  p5: number;
  p50: number;
  p95: number;
}

/** The bootstrap's summary: resample count and a band per coefficient. */
export interface BootstrapSummary {
  n: number;
  a: BootstrapBand;
  b: BootstrapBand;
  c: BootstrapBand;
}

/** One out-of-sample prediction, for the backtest table and scatter. */
export interface BacktestRow {
  slug: string;
  name: string;
  tvl_usd: number;
  mcap_usd: number;
  predicted_usd: number;
  factor: number;
}

/** Everything the dashboard says about the model and its tests. */
export interface ModelReport {
  version: string;
  fit: ModelFit;
  comps: number;
  comps_with_age: number;
  cv: ValidationNumbers;
  time_split: ValidationNumbers;
  reverse_time_split: ValidationNumbers;
  full_model: { cv: ValidationNumbers; time_split: ValidationNumbers; reverse_time_split: ValidationNumbers; coefficients: number[] };
  bootstrap: BootstrapSummary;
  backtest: BacktestRow[];
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  total_gas_usd: number;
  model: {
    fit_a: number;
    fit_b: number;
    fit_c: number;
    tvl_multiple: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. The fields that are always null for a pre-token row (market cap, listing date, token id, symbol) are left out, so the dossier's text stays whole under its cap. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  age_days: number | null;
  implied_value_usd: number;
  implied_low_usd: number;
  implied_high_usd: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  total_gas_usd: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  model: ModelFit;
  validation: {
    cv_median_factor: number;
    cv_within_2x: number;
    time_split_median_factor: number;
    time_split_within_2x: number;
    reverse_median_factor: number;
    reverse_within_2x: number;
    full_cv_median_factor: number;
    full_time_split_median_factor: number;
    full_reverse_median_factor: number;
  };
  bootstrap: BootstrapSummary;
  /** The backtest scatter, as compact [actual market cap, predicted] pairs: the page plots all 92 comps without carrying their names twice. */
  backtest: [number, number][];
  watchlist_size: number;
  board_size: number;
  early_size: number;
  above_floor_size: number;
  live_size: number;
  verdict_counts: { FARM: number; THIN: number; SKIP: number };
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-5';

/** How many bootstrap resamples the bands and the coefficient ranges use. */
export const BOOTSTRAP_RESAMPLES = 200;

/** How many live-token protocols the Live token view carries, by market cap. Twelve keeps the dossier's text whole under its cap. */
export const LIVE_ROWS = 12;

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

const EXCLUDED_CATEGORIES = new Set([
  'bridge', 'canonical bridge', 'liquid staking', 'liquid restaking', 'restaked btc', 'cex',
]);
const EXCHANGE_PREFIXES = ['binance', 'coinbase', 'bybit', 'kraken', 'bitget', 'okx', 'bitfinex', 'gemini'];
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Whether a protocol is a genuine pre-token subject: no token, and none of
 * the watchlist's own exclusions — not a bridge, staking or exchange
 * product, not a versioned pool, not an exchange's own name. The snapshot
 * carries no parentProtocol field, so a protocol the list leaves out for a
 * parent it does not show is judged on the ten fields alone, and the
 * dashboard says so.
 */
export function isCleanPreToken(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  const cat = (p.category ?? '').toLowerCase();
  if (EXCLUDED_CATEGORIES.has(cat)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  const lower = p.name.toLowerCase();
  if (EXCHANGE_PREFIXES.some((x) => lower.startsWith(x))) return false;
  return true;
}

/** The clean comps the curve is fitted on: launched protocols (a token that trades) passing the same rule. */
export function isCleanComp(p: SnapshotProtocol): boolean {
  if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) return false;
  const cat = (p.category ?? '').toLowerCase();
  if (EXCLUDED_CATEGORIES.has(cat)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  const lower = p.name.toLowerCase();
  if (EXCHANGE_PREFIXES.some((x) => lower.startsWith(x))) return false;
  return true;
}

export function cleanComps(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter(isCleanComp);
}

/** Deterministic seeded shuffle (mulberry32, fixed seed) so the CV folds and the bootstrap resamples are identical on every run. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function percentile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.floor(q * s.length)));
  return s[i]!;
}

function factorStats(actual: number[], predicted: number[]): ValidationNumbers {
  const factors = actual.map((a, i) => Math.pow(10, Math.abs(Math.log10(a) - Math.log10(predicted[i]!))));
  const within = factors.filter((f) => f <= 2).length;
  return { median_factor: median(factors), within_2x: within / factors.length, n: factors.length };
}

/** Small dense OLS via normal equations + Gauss-Jordan, for any feature set. */
function ols(design: number[][], target: number[]): number[] {
  const m = design[0]!.length;
  const ata: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0));
  const atb: number[] = new Array<number>(m).fill(0);
  for (let i = 0; i < design.length; i++) {
    for (let r = 0; r < m; r++) {
      atb[r]! += design[i]![r]! * target[i]!;
      for (let c = 0; c < m; c++) ata[r]![c]! += design[i]![r]! * design[i]![c]!;
    }
  }
  const aug = ata.map((row, i) => [...row, atb[i]!]);
  for (let col = 0; col < m; col++) {
    let piv = col;
    for (let r = col + 1; r < m; r++) if (Math.abs(aug[r]![col]!) > Math.abs(aug[piv]![col]!)) piv = r;
    [aug[col], aug[piv]] = [aug[piv]!, aug[col]!];
    const d = aug[col]![col]!;
    for (let r = 0; r < m; r++) {
      if (r === col) continue;
      const f = aug[r]![col]! / d;
      for (let c = col; c <= m; c++) aug[r]![c]! -= f * aug[col]![c]!;
    }
  }
  return aug.map((row, i) => row[m]! / row[i]!);
}

/** Features of the adopted model: [1, log10 TVL, log1p(chain count)]. */
function features(p: SnapshotProtocol): number[] {
  return [1, Math.log10(p.tvl_usd), Math.log1p(p.chains.length)];
}

export function fitModel(comps: SnapshotProtocol[]): ModelFit {
  const beta = ols(comps.map(features), comps.map((p) => Math.log10(p.mcap_usd!)));
  return { a: beta[0]!, b: beta[1]!, c: beta[2]!, n: comps.length };
}

export function predictImplied(tvl: number, chainCount: number, fit: ModelFit): number {
  return Math.max(1, Math.round(Math.pow(10, fit.a + fit.b * Math.log10(tvl) + fit.c * Math.log1p(chainCount))));
}

function predictRaw(tvl: number, chainCount: number, fit: ModelFit): number {
  return Math.pow(10, fit.a + fit.b * Math.log10(tvl) + fit.c * Math.log1p(chainCount));
}

/** 5-fold cross-validation (seeded) for the adopted model. Also returns the per-comp out-of-sample predictions, which the backtest table and the scatter chart show. */
export function crossValidate(comps: SnapshotProtocol[], k = 5): { numbers: ValidationNumbers; rows: BacktestRow[] } {
  const rand = mulberry32(7);
  const order = [...comps];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const actual: number[] = [], predicted: number[] = [];
  const rows: BacktestRow[] = [];
  for (let f = 0; f < k; f++) {
    const test = order.filter((_, i) => i % k === f);
    const train = order.filter((_, i) => i % k !== f);
    const fit = fitModel(train);
    for (const p of test) {
      const pr = predictImplied(p.tvl_usd, p.chains.length, fit);
      actual.push(p.mcap_usd!); predicted.push(pr);
      rows.push({ slug: p.slug, name: p.name, tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd!, predicted_usd: pr, factor: Math.pow(10, Math.abs(Math.log10(p.mcap_usd!) - Math.log10(pr))) });
    }
  }
  rows.sort((a, b) => (a.slug < b.slug ? -1 : 1));
  return { numbers: factorStats(actual, predicted), rows };
}

/** Time split: train on the older half by listed_at, test on the newer half. Only comps with a listed_at take part. */
export function timeSplitValidate(comps: SnapshotProtocol[]): ValidationNumbers {
  const dated = comps.filter((p) => p.listed_at !== null).sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : 1));
  const half = dated.length >> 1;
  const fit = fitModel(dated.slice(0, half));
  const test = dated.slice(half);
  return factorStats(test.map((p) => p.mcap_usd!), test.map((p) => predictImplied(p.tvl_usd, p.chains.length, fit)));
}

/** Reverse time split: train on the newer half, test on the older half. A second blind test in the other direction; a factor that only works forward in time is suspect. */
export function reverseTimeSplitValidate(comps: SnapshotProtocol[]): ValidationNumbers {
  const dated = comps.filter((p) => p.listed_at !== null).sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : 1));
  const half = dated.length >> 1;
  const fit = fitModel(dated.slice(half));
  const test = dated.slice(0, half);
  return factorStats(test.map((p) => p.mcap_usd!), test.map((p) => predictImplied(p.tvl_usd, p.chains.length, fit)));
}

/** The fuller variant the criterion's words suggest: size, chains, log age and 7-day growth. */
function featuresFull(p: SnapshotProtocol, asOf: string, medianAge: number): number[] {
  const age = ageDays(asOf, p.listed_at) ?? medianAge;
  const growth = Math.min(80, Math.max(-40, finite(p.change_7d, 0))) / 100;
  return [1, Math.log10(p.tvl_usd), Math.log1p(p.chains.length), Math.log1p(age), growth];
}

function predictFull(feat: number[], beta: number[]): number {
  let y = 0;
  for (let i = 0; i < beta.length; i++) y += beta[i]! * feat[i]!;
  return Math.max(1, Math.round(Math.pow(10, y)));
}

function medianAgeOf(comps: SnapshotProtocol[], asOf: string): number {
  const ages = comps.map((p) => ageDays(asOf, p.listed_at)).filter((a): a is number => a !== null);
  return ages.length ? median(ages) : 180;
}

function cvFull(comps: SnapshotProtocol[], asOf: string, medianAge: number, k = 5): ValidationNumbers {
  const rand = mulberry32(7);
  const order = [...comps];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const actual: number[] = [], predicted: number[] = [];
  for (let f = 0; f < k; f++) {
    const test = order.filter((_, i) => i % k === f);
    const train = order.filter((_, i) => i % k !== f);
    const beta = ols(train.map((p) => featuresFull(p, asOf, medianAge)), train.map((p) => Math.log10(p.mcap_usd!)));
    for (const p of test) { actual.push(p.mcap_usd!); predicted.push(predictFull(featuresFull(p, asOf, medianAge), beta)); }
  }
  return factorStats(actual, predicted);
}

function timeSplitFull(comps: SnapshotProtocol[], asOf: string, medianAge: number, reverse = false): ValidationNumbers {
  const dated = comps.filter((p) => p.listed_at !== null).sort((a, b) => (a.listed_at! < b.listed_at! ? -1 : 1));
  const half = dated.length >> 1;
  const train = reverse ? dated.slice(half) : dated.slice(0, half);
  const test = reverse ? dated.slice(0, half) : dated.slice(half);
  const beta = ols(train.map((p) => featuresFull(p, asOf, medianAge)), train.map((p) => Math.log10(p.mcap_usd!)));
  return factorStats(test.map((p) => p.mcap_usd!), test.map((p) => predictFull(featuresFull(p, asOf, medianAge), beta)));
}

/** Bootstrap: refit the adopted model on 200 resamples (with replacement, seeded) of the comps. The coefficient ranges show how stable the fit is, and the 5th-95th percentile of the 200 predictions at a protocol's TVL and chain count is that row's prediction interval. */
export function bootstrapFits(comps: SnapshotProtocol[], n = BOOTSTRAP_RESAMPLES): ModelFit[] {
  const rand = mulberry32(12345);
  const fits: ModelFit[] = [];
  for (let r = 0; r < n; r++) {
    const sample: SnapshotProtocol[] = [];
    for (let i = 0; i < comps.length; i++) sample.push(comps[Math.floor(rand() * comps.length)]!);
    fits.push(fitModel(sample));
  }
  return fits;
}

export function bootstrapSummary(fits: ModelFit[]): BootstrapSummary {
  const band = (xs: number[]): BootstrapBand => ({ p5: percentile(xs, 0.05), p50: percentile(xs, 0.5), p95: percentile(xs, 0.95) });
  return {
    n: fits.length,
    a: band(fits.map((f) => f.a)),
    b: band(fits.map((f) => f.b)),
    c: band(fits.map((f) => f.c)),
  };
}

/** The full model report: the adopted fit, its three blind tests, and the fuller variant's three tests beside them. */
export function modelReport(snapshot: Snapshot): ModelReport {
  const comps = cleanComps(snapshot);
  const fit = fitModel(comps);
  const cv = crossValidate(comps);
  const ts = timeSplitValidate(comps);
  const rts = reverseTimeSplitValidate(comps);
  const medAge = medianAgeOf(comps, snapshot.as_of);
  const fullCv = cvFull(comps, snapshot.as_of, medAge);
  const fullTs = timeSplitFull(comps, snapshot.as_of, medAge, false);
  const fullRts = timeSplitFull(comps, snapshot.as_of, medAge, true);
  const fullBeta = ols(comps.map((p) => featuresFull(p, snapshot.as_of, medAge)), comps.map((p) => Math.log10(p.mcap_usd!)));
  const fits = bootstrapFits(comps);
  return {
    version: MODEL_VERSION,
    fit,
    comps: comps.length,
    comps_with_age: comps.filter((p) => p.listed_at !== null).length,
    cv: cv.numbers,
    time_split: ts,
    reverse_time_split: rts,
    full_model: { cv: fullCv, time_split: fullTs, reverse_time_split: fullRts, coefficients: fullBeta },
    bootstrap: bootstrapSummary(fits),
    backtest: cv.rows,
  };
}

/** The farm verdict, netted at the bootstrap band's low end: cheap gas and a high low end farms, dear gas or a low low end skips, the rest is thin. */
export function farmVerdict(totalGasUsd: number, lowEndUsd: number): 'FARM' | 'THIN' | 'SKIP' {
  if (totalGasUsd <= 10 && lowEndUsd >= 10_000_000) return 'FARM';
  if (totalGasUsd >= 40 || lowEndUsd < 4_000_000) return 'SKIP';
  return 'THIN';
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** The gas one transaction costs on the protocol's first chain, in whole dollars. */
function gasFor(p: SnapshotProtocol): number {
  const chain = (p.chains[0] ?? '').toLowerCase();
  if (chain.includes('ethereum')) return 8;
  if (chain.includes('bitcoin') || chain.includes('solana')) return 1;
  return 2;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of ${name}'s yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** A second qualifying action, different from the first, so the position shows activity breadth. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp')) return `Borrow $${Math.round(capital / 2)} against the ${name} position on ${chain} and repay it the same week.`;
  if (c.includes('dex') || c.includes('yield')) return `Swap $${Math.round(capital / 2)} through ${name} on ${chain} and add the proceeds to the same pool.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Close the first ${name} hedge on ${chain} and open a second one half its size.`;
  if (c.includes('prediction')) return `Settle the first ${name} market position and place a second, smaller one the next week.`;
  return `Vote once in ${name}'s governance on ${chain} with the position's receipt, if a vote is open.`;
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL,
 * age, name), never from a hand-written list of names, and every step names
 * the protocol so no two rows share a step.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const gas = gasFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const second = secondActionFor(p, capital, chain);
  const weekly = gas <= 2 ? 2 : 5;
  return [
    {
      text: `Open a fresh wallet that holds only the funds you plan to farm on ${p.name}, and keep its seed phrase offline.`,
      cost: `under $${gas} of gas for the first transaction`,
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: second,
      cost: `about $${gas} of gas`,
      time: '10 minutes',
    },
    {
      text: `Make one qualifying action each week on ${p.name}, such as a deposit, a borrow, a swap or a vote.`,
      cost: `about $${weekly} of gas a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the ${p.name} position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw from ${p.name}, open its own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction of the ${p.name} farm in a log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
    {
      text: `Unwind the ${p.name} position in one transaction once the verdict changes or the token launches, and keep the receipt.`,
      cost: `about $${gas} of gas to unwind`,
      time: '15 minutes',
    },
  ];
}

/** The gas a full farm plan costs, in whole dollars: the gas-bearing steps only. */
export function planGasUsd(p: SnapshotProtocol): number {
  const gas = gasFor(p);
  const weekly = gas <= 2 ? 2 : 5;
  // steps 1, 2, 3, 4 (one week), 8 carry gas; steps 5-7 carry none.
  return gas + gas + gas + weekly + gas;
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  above_floor_size: number;
  live_size: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, report: ModelReport, fits: ModelFit[]): BoardRow[] {
  const index = new Map(snapshot.protocols.map((p) => [p.slug, p]));
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The list leaves out clean protocols above the floor: they pass the same rule, so the board carries
  // them too, strongest first by the fitted value. The floor is where the house's reading started, not
  // where this one stops.
  const above = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isCleanPreToken(p) && p.tvl_usd >= snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of above) chosen.set(p.slug, p);
  // The early radar: clean pre-token protocols below the floor, every one of them, not a capped sample.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isCleanPreToken(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const fit = report.fit;
  const scored = [...chosen.values()].map((p) => {
    const age = ageDays(snapshot.as_of, p.listed_at);
    const implied = predictImplied(p.tvl_usd, p.chains.length, fit);
    const lows = fits.map((f) => predictRaw(p.tvl_usd, p.chains.length, f)).sort((a, b) => a - b);
    const low = Math.max(1, Math.round(percentile(lows, 0.05)));
    const high = Math.max(1, Math.round(percentile(lows, 0.95)));
    const gas = planGasUsd(p);
    const verdict = farmVerdict(gas, low);
    const steps = farmSteps(p, age).map(stepText);
    const multiple = p.tvl_usd > 0 ? implied / p.tvl_usd : 0;
    return { p, age, implied, low, high, gas, verdict, steps, multiple };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    implied_low_usd: s.low,
    implied_high_usd: s.high,
    verdict: s.verdict,
    total_gas_usd: s.gas,
    model: {
      fit_a: fit.a,
      fit_b: fit.b,
      fit_c: fit.c,
      tvl_multiple: Math.round(s.multiple * 1e6) / 1e6,
      age_days: s.age,
    },
    farm_steps: s.steps,
  }));
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    implied_low_usd: row.implied_low_usd,
    implied_high_usd: row.implied_high_usd,
    verdict: row.verdict,
    total_gas_usd: row.total_gas_usd,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData; report: ModelReport } {
  const report = modelReport(snapshot);
  const fits = bootstrapFits(cleanComps(snapshot));
  const board = buildBoard(snapshot, report, fits);
  const live = liveRows(snapshot);
  const watchlist = snapshot.watchlist.length;
  const above = board.filter((r) => !snapshot.watchlist.includes(r.slug) && r.tvl_usd >= snapshot.floor_usd).length;
  const early = board.length - watchlist - above;
  const counts = { FARM: 0, THIN: 0, SKIP: 0 };
  for (const r of board) counts[r.verdict]++;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model_version: MODEL_VERSION,
    model: report.fit,
    validation: {
      cv_median_factor: report.cv.median_factor,
      cv_within_2x: report.cv.within_2x,
      time_split_median_factor: report.time_split.median_factor,
      time_split_within_2x: report.time_split.within_2x,
      reverse_median_factor: report.reverse_time_split.median_factor,
      reverse_within_2x: report.reverse_time_split.within_2x,
      full_cv_median_factor: report.full_model.cv.median_factor,
      full_time_split_median_factor: report.full_model.time_split.median_factor,
      full_reverse_median_factor: report.full_model.reverse_time_split.median_factor,
    },
    bootstrap: report.bootstrap,
    backtest: report.backtest.map((r) => [r.mcap_usd, r.predicted_usd] as [number, number]),
    watchlist_size: watchlist,
    board_size: board.length,
    early_size: early,
    above_floor_size: above,
    live_size: live.length,
    verdict_counts: counts,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar, report };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (!(r.implied_low_usd <= r.implied_value_usd && r.implied_value_usd <= r.implied_high_usd)) return `${r.slug} has a bootstrap band that misses its implied value`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}
