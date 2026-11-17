# Research note — Token Launch Radar v4

## What this board is

A ranked board of the **198 protocols in the snapshot that record no token
and pass the watchlist's own cleanliness rule** (no bridge, staking, wrapped
or exchange product, not versioned, not an exchange's own name): the 40
watchlist protocols, the 20 clean protocols above the $50M floor the list
leaves out, and the 138 clean protocols below it. Each row is ranked by an
implied value from a curve fitted on the snapshot itself.

## The model (radar-5)

`log10(market cap) = 4.132 + 0.387 * log10(TVL) - 0.085 * log1p(chains)`,
OLS on the 92 launched protocols that already trade and pass the same rule.
The curve uses the snapshot's own figures only — TVL and chain count — and
no list of names.

## The blind tests (all three, both models)

| Test | Model in the formula | Fuller model (TVL, chains, age, growth) |
|---|---|---|
| 5-fold cross-validation | x2.94 (37% within 2x) | x3.43 |
| Forward time split | x2.10 (49% within 2x) | x1.98 |
| Reverse time split | x2.11 (46% within 2x) | x2.70 |

The fuller model wins only the forward split and loses the
cross-validation and the reverse split, so growth and age stay out of the
formula. The numbers above are the medians of the factor error (how many
times too big or too small the prediction is). Bootstrap: 200 seeded refits;
each row's band is the 5th–95th percentile of its 200 predictions, and the
coefficients' own ranges over the same refits are a 2.638–5.772,
b 0.189–0.607, c −0.261–0.081 — the chains term is weak (its band crosses
zero) and the size term carries the fit.

## Farm verdicts

FARM when the plan's gas is $10 or less and the bootstrap band's low end is
$10M or more; SKIP when the gas is $40 or more or the low end is under $4M;
THIN in between. Eight costed steps per row, derived from the protocol's own
category, chains, TVL and age; all 1,584 steps are unique to their row.

## One honest limit

The snapshot carries no parentProtocol field, so a protocol the list leaves
out for a parent it does not show is judged on the ten fields alone. The
twenty above-floor rows are clean by every field the snapshot carries.
