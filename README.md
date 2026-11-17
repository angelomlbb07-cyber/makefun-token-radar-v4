[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/angelomlbb07-cyber/makefun-token-radar-v4/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/angelomlbb07-cyber/makefun-token-radar-v4/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Launch Radar v4 — every clean pre-token protocol, priced

A token launch radar that ranks **every clean pre-token protocol in the
snapshot** — not just the watchlist — by the implied value a blind-tested
curve gives it, and shows a concrete, costed farm plan for each one, in a
sortable, filterable static dashboard.

## Coverage: the watchlist is the floor, never the ceiling

The board carries **198 rows**:

- **40** watchlist protocols — all of them.
- **20** clean protocols above the $50M floor that the list leaves out
  (they pass the same rule — no token, no bridge, staking, wrapped or
  exchange product, not versioned — but the list leaves them out). The
  strongest of them, at $2.76B TVL, would rank #1.
- **138** clean protocols below the floor — the early radar.

No row is a wrapped, staked, bridged or exchange product of a token that
already trades.

## The model (radar-5)

```
log10(implied value) = 4.132 + 0.387 x log10(TVL) - 0.085 x log1p(chains)
```

fitted by OLS on the **92 launched protocols** in the snapshot that already
trade and pass the same cleanliness rule. No protocol name is special-cased
and no coefficient is hardcoded. The formula uses the snapshot's own figures
only.

## The blind tests

| Test | Model in the formula | Fuller model (TVL, chains, age, growth) |
|---|---|---|
| 5-fold cross-validation | x2.94 (37% within 2x) | x3.43 |
| Forward time split | x2.10 (49% within 2x) | x1.98 |
| Reverse time split | x2.11 (46% within 2x) | x2.70 |

The fuller model wins only the forward split and loses the cross-validation
and the reverse split, so growth and age stay out of the formula — and the
dashboard says why. Each row carries a bootstrap band (5th–95th percentile
of 200 seeded refits).

## Farm plans

Each row's verdict is **FARM / THIN / SKIP, netted at the bootstrap band's
low end**: FARM when the plan's gas is $10 or less and the low end is $10M
or more; SKIP when the gas is $40 or more or the low end is under $4M. Each
row has **8 concrete steps**, each with what it costs and how long it takes,
derived from that protocol's own record. All 1,584 steps are unique to their
row.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

Node 22, standard library only. The build is deterministic: the same
snapshot always writes the same board, data and dossier, byte for byte.
