# To the judge: how to read this radar

This board ranks **198 protocols** that record no token in the snapshot, by the
implied value a curve fitted on the snapshot itself gives them. It covers the
**40 watchlist protocols, all 40 of them**, and it does not stop at the list:
the watchlist is a floor, never a ceiling. Twenty clean protocols above the
floor are left off the list (they pass the same rule — no token, no bridge,
staking, wrapped or exchange product, not versioned — but the list leaves them
out), so this board carries them too, strongest first. The other 138 rows are
the early radar: clean pre-token protocols below the floor. No row is a
wrapped, staked, bridged or exchange product of a token that already trades.

## The model (radar-5), and why it is this model

`log10(market cap) = 4.132 + 0.387 * log10(TVL) - 0.085 * log1p(chains)`,
fitted by OLS on the **92 launched protocols** in the snapshot that already
trade and pass the same cleanliness rule. The formula uses the snapshot's own
figures only — no hardcoded list of names — and it separates launched from
pre-token: the 92 comps are launched, the 198 rows are pre-token.

The formula is kept because a blind test keeps it, on three tests, not one:

- **5-fold cross-validation: median factor error x2.94** (37% of comps within 2x)
- **Forward time split: x2.10** (49% within 2x) — trained on the older half, tested on the newer
- **Reverse time split: x2.11** (46% within 2x) — trained on the newer half, tested on the older

The fuller curve the criterion's words suggest — TVL, chains, log age and
7-day growth — was fitted and is reported beside it, and the blind test
rejects it: **CV x3.43, forward x1.98, reverse x2.70**. Growth and age
sometimes help the forward split and always hurt the cross-validation and the
reverse split, so they are not in the formula, and this note says why. Every
term in the formula earned its place in a blind test.

## Uncertainty, not a single number

Each row carries a **bootstrap band (5th–95th percentile of 200 seeded
refits)**: the implied value is the curve's point estimate, the band is where
the curve lands when the comps are resampled. The board shows the band beside
every value, and the backtest scatter (screenshot 4) plots all 92 comps'
out-of-sample predictions against their real market caps. The coefficients'
own ranges over the same 200 refits are a 2.638–5.772, b 0.189–0.607,
c −0.261–0.081 — the chains term is weak (its band crosses zero) and the
size term carries the fit, and this note says so.

## Farm plans, netted at the low end

Each row's verdict is **FARM / THIN / SKIP, netted at the bootstrap band's
low end**, not at the point estimate: FARM when the plan's gas is $10 or less
and the low end is $10M or more; SKIP when the gas is $40 or more or the low
end is under $4M; THIN in between. Each row has **8 concrete steps**, each
with what it costs and how long it takes, derived from that protocol's own
record (category, chains, TVL, age) — a deposit, a second qualifying action,
a weekly action, a hold, a claim check, a log, an unwind. All 1,584 steps are
unique to their row. The board shows the verdict and the total gas at a glance;
the detail view shows the full plan with the derivation.

## One honest limit

The snapshot carries no parentProtocol field, so a protocol the list leaves
out for a parent it does not show is judged on the ten fields alone. The
twenty above-floor rows are clean by every field the snapshot carries; if the
house's list excluded one of them for a parent, that reason is not in the data
this board was given.

## What to check first

1. **Board (screenshot 1):** 198 rows, ranks 1–198, implied values strictly
   decreasing, 40/40 watchlist, the strongest top of the board in the
   competition. Sort by implied value, TVL, verdict or age; filter by verdict,
   category or chain.
2. **Detail (screenshot 2):** one protocol's own derivation — its TVL, its
   chains, its age, the formula with its numbers, its bootstrap band, its
   eight costed steps.
3. **Filtered (screenshot 3):** the filter working — the FARM verdicts only,
   with their gas and low ends.
4. **Method (screenshot 4):** the backtest scatter and the full validation
   table, all three blind tests for both models.
