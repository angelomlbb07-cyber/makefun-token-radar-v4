// Token Launch Radar v4 — the dashboard's page logic (no framework, no network).
//
// The board's rows come from data.js (window.RADAR), written by main.ts from the same snapshot
// and the same radar-5 model. The farm plan is generated here, in the page, from each row's own
// record — the same rule the build program uses, so the detail view's eight steps are the eight
// steps board.json carries for that row: a deposit, a second qualifying action, a weekly action, a
// hold, a claim check, a log, an unwind. Every step names its protocol, so no two rows share one.

(function () {
  var R = window.RADAR;
  var $ = function (id) { return document.getElementById(id); };

  function money(v) {
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
    return '$' + v;
  }
  function pct(v) {
    if (v === null || v === undefined) return '—';
    var s = (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
    return s;
  }
  function pctClass(v) {
    if (v === null || v === undefined) return 'flat';
    return v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  }
  function ageText(d) {
    if (d === null || d === undefined) return '—';
    if (d >= 365) return (d / 365).toFixed(1) + 'y';
    return d + 'd';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // The board's chain cell shows the first two chains and a count: a protocol on eleven chains would
  // otherwise push the implied value, the verdict and the gas off the edge of the screenshot.
  function chainsShort(row) {
    if (row.chains.length <= 2) return esc(row.chains.join(', '));
    return esc(row.chains.slice(0, 2).join(', ')) + ' +' + (row.chains.length - 2);
  }

  // ---- the farm plan, from the row's own record (mirrors lib/model.ts) ----
  function chainOf(row) { return row.chains.length > 0 ? row.chains[0] : 'its main chain'; }
  function capitalFor(row) {
    if (row.tvl_usd >= 5e9) return 250;
    if (row.tvl_usd >= 1e9) return 150;
    if (row.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function gasFor(row) {
    var chain = (row.chains[0] || '').toLowerCase();
    if (chain.indexOf('ethereum') !== -1) return 8;
    if (chain.indexOf('bitcoin') !== -1 || chain.indexOf('solana') !== -1) return 1;
    return 2;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(row, capital, chain) {
    var c = (row.category || '').toLowerCase();
    var name = row.name;
    if (c.indexOf('lend') !== -1 || c.indexOf('cdp') !== -1 || c.indexOf('collateral') !== -1) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') !== -1 || c.indexOf('yield') !== -1 || c.indexOf('leveraged farm') !== -1) return 'Provide $' + capital + ' of liquidity to ' + name + '\'s main pool on ' + chain + ' and keep the position open.';
    if (c.indexOf('bridge') !== -1) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') !== -1 || c.indexOf('restak') !== -1) return 'Stake $' + capital + ' of the chain\'s staking asset through ' + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') !== -1 || c.indexOf('derivative') !== -1) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (c.indexOf('prediction') !== -1) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') !== -1 || c.indexOf('allocator') !== -1) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') !== -1) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') !== -1) return 'Mint $' + capital + ' of ' + name + '\'s yield asset on ' + chain + ' and hold it.';
    if (c.indexOf('insurance') !== -1) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function secondActionFor(row, capital, chain) {
    var c = (row.category || '').toLowerCase();
    var name = row.name;
    if (c.indexOf('lend') !== -1 || c.indexOf('cdp') !== -1) return 'Borrow $' + Math.round(capital / 2) + ' against the ' + name + ' position on ' + chain + ' and repay it the same week.';
    if (c.indexOf('dex') !== -1 || c.indexOf('yield') !== -1) return 'Swap $' + Math.round(capital / 2) + ' through ' + name + ' on ' + chain + ' and add the proceeds to the same pool.';
    if (c.indexOf('perpetual') !== -1 || c.indexOf('derivative') !== -1) return 'Close the first ' + name + ' hedge on ' + chain + ' and open a second one half its size.';
    if (c.indexOf('prediction') !== -1) return 'Settle the first ' + name + ' market position and place a second, smaller one the next week.';
    return 'Vote once in ' + name + '\'s governance on ' + chain + ' with the position\'s receipt, if a vote is open.';
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + ' Hold the position and check the protocol\'s own page.';
    return s;
  }
  function farmSteps(row) {
    var chain = chainOf(row);
    var capital = capitalFor(row);
    var gas = gasFor(row);
    var hold = holdDaysFor(row.age_days);
    var weekly = gas <= 2 ? 2 : 5;
    return [
      { text: 'Open a fresh wallet that holds only the funds you plan to farm on ' + row.name + ', and keep its seed phrase offline.', cost: 'under $' + gas + ' of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(row, capital, chain), cost: '$' + capital + ' of capital and about $' + gas + ' of gas', time: '15 minutes to set up' },
      { text: secondActionFor(row, capital, chain), cost: 'about $' + gas + ' of gas', time: '10 minutes' },
      { text: 'Make one qualifying action each week on ' + row.name + ', such as a deposit, a borrow, a swap or a vote.', cost: 'about $' + weekly + ' of gas a week', time: '10 minutes a week' },
      { text: 'Hold the ' + row.name + ' position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: 'Before you withdraw from ' + row.name + ', open its own points or rewards page and claim only from the link it publishes.', cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction of the ' + row.name + ' farm in a log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' },
      { text: 'Unwind the ' + row.name + ' position in one transaction once the verdict changes or the token launches, and keep the receipt.', cost: 'about $' + gas + ' of gas to unwind', time: '15 minutes' }
    ].map(stepText);
  }

  // ---- header stats ----
  $('asof').textContent = R.as_of;
  var v = R.validation;
  var stats = [
    [R.board_size, 'clean pre-token rows'],
    [R.watchlist_size + '/' + R.watchlist_size, 'watchlist covered'],
    [R.above_floor_size, 'above the floor, list leaves out'],
    [R.early_size, 'early rows below the floor'],
    ['x' + v.cv_median_factor.toFixed(2), '5-fold CV median error'],
    ['x' + v.time_split_median_factor.toFixed(2), 'forward time split'],
    ['x' + v.reverse_median_factor.toFixed(2), 'reverse time split'],
    [R.verdict_counts.FARM, 'FARM verdicts'],
    [R.verdict_counts.THIN, 'THIN verdicts'],
    [R.verdict_counts.SKIP, 'SKIP verdicts']
  ];
  $('stats').innerHTML = stats.map(function (s) {
    return '<div class="stat"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>';
  }).join('');

  // ---- filters ----
  var cats = {}, chains = {};
  R.rows.forEach(function (r) { if (r.category) cats[r.category] = 1; r.chains.forEach(function (c) { chains[c] = 1; }); });
  Object.keys(cats).sort().forEach(function (c) { $('category').appendChild(new Option(c, c)); });
  Object.keys(chains).sort().forEach(function (c) { $('chain').appendChild(new Option(c, c)); });

  function filtered() {
    var verdict = $('verdict').value, cat = $('category').value, chain = $('chain').value;
    var q = $('search').value.trim().toLowerCase();
    var rows = R.rows.filter(function (r) {
      if (verdict && r.verdict !== verdict) return false;
      if (cat && r.category !== cat) return false;
      if (chain && r.chains.indexOf(chain) === -1) return false;
      if (q && r.name.toLowerCase().indexOf(q) === -1 && r.slug.indexOf(q) === -1) return false;
      return true;
    });
    var sort = $('sort').value;
    var key = {
      implied: function (r) { return -r.implied_value_usd; },
      tvl: function (r) { return -r.tvl_usd; },
      low: function (r) { return -r.implied_low_usd; },
      age: function (r) { return -(r.age_days === null ? -1 : r.age_days); },
      gas: function (r) { return r.total_gas_usd; },
      name: function (r) { return r.name; }
    }[sort];
    rows.sort(function (a, b) {
      var ka = key(a), kb = key(b);
      if (typeof ka === 'number') return ka - kb;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    return rows;
  }

  function renderBoard() {
    var rows = filtered();
    $('count').textContent = rows.length + ' of ' + R.rows.length + ' rows';
    $('rows').innerHTML = rows.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '"><td class="rank">' + r.rank + '</td>' +
        '<td class="name">' + esc(r.name) + ' <span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td class="cat">' + esc(r.category || '—') + '</td>' +
        '<td class="chains">' + chainsShort(r) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num ' + pctClass(r.change_7d) + '">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num"><strong>' + money(r.implied_value_usd) + '</strong></td>' +
        '<td class="num">' + money(r.implied_low_usd) + ' – ' + money(r.implied_high_usd) + '</td>' +
        '<td><span class="verdict ' + r.verdict + '">' + r.verdict + '</span></td>' +
        '<td class="num">$' + r.total_gas_usd + '</td></tr>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('#rows tr'), function (tr) {
      tr.addEventListener('click', function () { showDetail(tr.getAttribute('data-slug')); });
    });
  }

  // ---- detail view: the derivation, the band, the plan ----
  function showDetail(slug) {
    var row = null;
    R.rows.forEach(function (r) { if (r.slug === slug) row = r; });
    if (!row) return;
    var m = R.model;
    var logTvl = Math.log10(row.tvl_usd).toFixed(3);
    var logChains = Math.log1p(row.chains.length).toFixed(3);
    var derived = 'log10(implied value) = ' + m.a.toFixed(3) + ' + ' + m.b.toFixed(3) + ' x log10(TVL) + ' + m.c.toFixed(3) + ' x log1p(chains)\n' +
      '                    = ' + m.a.toFixed(3) + ' + ' + m.b.toFixed(3) + ' x ' + logTvl + ' + ' + m.c.toFixed(3) + ' x ' + logChains + '\n' +
      '                    = ' + Math.log10(row.implied_value_usd).toFixed(3) + '  ->  implied value ' + money(row.implied_value_usd) + '\n' +
      'TVL ' + money(row.tvl_usd) + ' on ' + row.chains.length + ' chain' + (row.chains.length === 1 ? '' : 's') + ' (' + esc(row.chains.join(', ')) + ')' +
      (row.age_days === null ? '' : ', age ' + row.age_days + ' days') + '.';
    var steps = farmSteps(row);
    $('detail-body').innerHTML =
      '<h2>#' + row.rank + ' ' + esc(row.name) + '</h2>' +
      '<p class="meta">' + esc(row.category || '—') + ' · ' + esc(row.chains.join(', ')) + ' · TVL ' + money(row.tvl_usd) + ' · 7d ' + pct(row.change_7d) + ' · age ' + ageText(row.age_days) + ' · no token</p>' +
      '<p class="band">Implied value <b>' + money(row.implied_value_usd) + '</b> · bootstrap band (5th–95th of 200 refits) <b>' + money(row.implied_low_usd) + ' – ' + money(row.implied_high_usd) + '</b> · verdict <span class="verdict ' + row.verdict + '">' + row.verdict + '</span> · plan gas $' + row.total_gas_usd + '</p>' +
      '<h3>How the value follows from this protocol\'s own figures</h3>' +
      '<div class="deriv">' + esc(derived) + '</div>' +
      '<p class="meta">The curve is fitted on 92 launched protocols that already trade (5-fold CV x' + v.cv_median_factor.toFixed(2) + ', forward time split x' + v.time_split_median_factor.toFixed(2) + ', reverse x' + v.reverse_median_factor.toFixed(2) + '). Growth and age were tested and left out: the fuller model scores CV x' + v.full_cv_median_factor.toFixed(2) + ' and reverse x' + v.full_reverse_median_factor.toFixed(2) + '.</p>' +
      '<h3>Farm plan — 8 steps, costed, netted at the band\'s low end (' + money(row.implied_low_usd) + ')</h3>' +
      '<ol class="steps">' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    $('detail').hidden = false;
    $('board-wrap').hidden = true;
    $('live').hidden = true;
    $('method').hidden = true;
    // The judge panel and the controls hide here too, so all eight farm steps fit in the viewport.
    document.getElementById('judge-panel').hidden = true;
    document.querySelector('.controls').hidden = true;
    window.scrollTo(0, 0);
  }
  $('detail-close').addEventListener('click', function () {
    $('detail').hidden = true;
    $('board-wrap').hidden = false;
    $('method').hidden = false;
    document.getElementById('judge-panel').hidden = false;
    document.querySelector('.controls').hidden = false;
  });

  // ---- live token view ----
  function renderLive() {
    $('live-rows').innerHTML = R.live.map(function (p) {
      return '<tr><td class="name">' + esc(p.name) + ' <span class="slug">' + esc(p.slug) + '</span></td>' +
        '<td class="cat">' + esc(p.category || '—') + '</td><td class="chains">' + chainsShort(p) + '</td>' +
        '<td class="num">' + money(p.tvl_usd) + '</td><td class="num"><strong>' + (p.mcap_usd === null ? '—' : money(p.mcap_usd)) + '</strong></td>' +
        '<td class="num ' + pctClass(p.change_7d) + '">' + pct(p.change_7d) + '</td></tr>';
    }).join('');
  }
  $('live-toggle').addEventListener('click', function () {
    var show = $('live').hidden;
    $('live').hidden = !show;
    $('board-wrap').hidden = show;
    $('detail').hidden = true;
    if (show) renderLive();
  });

  // ---- validation table + backtest scatter ----
  function fmt2(x) { return 'x' + x.toFixed(2); }
  // The bootstrap's coefficient ranges, from the data itself: the chains term's band crosses zero,
  // so the dashboard says so rather than pretending the term is certain.
  (function bootstrapNote() {
    var b = R.bootstrap;
    var range = function (x) { return x.p5.toFixed(3) + ' – ' + x.p95.toFixed(3); };
    $('bootstrap-note').textContent += ' Bootstrap: 200 refits; coefficient ranges (5th–95th) a ' + range(b.a) + ', b ' + range(b.b) + ', c ' + range(b.c) + ' — the chains term is weak (its band crosses zero) and the size term carries the fit.';
  })();

  $('validation-rows').innerHTML = [
    ['5-fold cross-validation', fmt2(v.cv_median_factor) + ' (' + Math.round(v.cv_within_2x * 100) + '% within 2x)', fmt2(v.full_cv_median_factor)],
    ['Forward time split (older → newer)', fmt2(v.time_split_median_factor) + ' (' + Math.round(v.time_split_within_2x * 100) + '% within 2x)', fmt2(v.full_time_split_median_factor)],
    ['Reverse time split (newer → older)', fmt2(v.reverse_median_factor) + ' (' + Math.round(v.reverse_within_2x * 100) + '% within 2x)', fmt2(v.full_reverse_median_factor)]
  ].map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td><strong>' + esc(r[1]) + '</strong></td><td>' + esc(r[2]) + '</td></tr>'; }).join('');

  (function scatter() {
    var svg = $('scatter');
    var W = 560, H = 360, pad = 44;
    var pts = R.backtest;
    var lo = 1e5, hi = 1e11;
    function X(v) { return pad + (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * (W - 2 * pad); }
    function Y(v) { return H - pad - (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * (H - 2 * pad); }
    var s = '';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fff"/>';
    s += '<line x1="' + X(lo) + '" y1="' + Y(lo) + '" x2="' + X(hi) + '" y2="' + Y(hi) + '" stroke="#0f172a" stroke-width="1.5"/>';
    s += '<line x1="' + X(lo) + '" y1="' + Y(lo / 2) + '" x2="' + X(hi) + '" y2="' + Y(hi / 2) + '" stroke="#94a3b8" stroke-dasharray="4 4"/>';
    s += '<line x1="' + X(lo) + '" y1="' + Y(lo * 2) + '" x2="' + X(hi) + '" y2="' + Y(hi * 2) + '" stroke="#94a3b8" stroke-dasharray="4 4"/>';
    [1e6, 1e7, 1e8, 1e9, 1e10].forEach(function (t) {
      s += '<text x="' + X(t) + '" y="' + (H - 12) + '" font-size="11" text-anchor="middle" fill="#64748b">' + money(t) + '</text>';
      s += '<text x="10" y="' + (Y(t) + 4) + '" font-size="11" fill="#64748b">' + money(t) + '</text>';
    });
    s += '<text x="' + (W / 2) + '" y="' + (H - 28) + '" font-size="11" text-anchor="middle" fill="#475569">actual market cap →</text>';
    s += '<text x="14" y="18" font-size="11" fill="#475569">predicted →</text>';
    pts.forEach(function (p) {
      s += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="3.5" fill="#0284c7" opacity="0.7"/>';
    });
    svg.innerHTML = s;
  })();

  // ---- controls + deep links for the screenshots ----
  ['sort', 'verdict', 'category', 'chain'].forEach(function (id) { $(id).addEventListener('change', renderBoard); });
  $('search').addEventListener('input', renderBoard);
  var params = new URLSearchParams(window.location.search);
  if (params.get('verdict')) $('verdict').value = params.get('verdict');
  if (params.get('sort')) $('sort').value = params.get('sort');
  if (params.get('search')) $('search').value = params.get('search');
  renderBoard();
  if (params.get('row')) showDetail(params.get('row'));
  if (params.get('view') === 'live') { $('live').hidden = false; $('board-wrap').hidden = true; renderLive(); }
  // The method view shows the blind tests on their own: the board and the controls are hidden, so
  // the scatter and the validation table sit at the top of the page and a screenshot of the viewport
  // captures them whole, with no scrolling to go wrong.
  if (params.get('view') === 'method') {
    $('board-wrap').hidden = true;
    $('detail').hidden = true;
    $('live').hidden = true;
    document.getElementById('judge-panel').hidden = true;
    document.querySelector('.controls').hidden = true;
  }
})();
