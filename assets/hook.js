/* 离场钩子 · hook.js
   它不改任何玩法，只在"这一局结束"的那个屏幕上，把四件心理学上真正起作用的东西摆到眼前：
     1) 可及的失败（near-miss）  —— 离上一档还差多少
     2) 最近发展区目标（ZPD）    —— 下一局打一个刚好够得着的数
     3) 承诺一致性              —— 按"下局就打这个"就把目标存下来，下次进门先看到欠账
     4) 连续与断裂（损失厌恶）   —— 今天第几局、连着第几天，断了就明说断了
   全部数据来自页面自己已经写下的 paly.<key>.runs，不另造一套。 */
(function () {
  'use strict';
  var key = (location.pathname.match(/\/games\/([a-z0-9]+)\.html/i) || [])[1];
  if (!key) return;

  var RANKS = ['GODLIKE', 'INVINCIBLE', 'STRONG', 'SOLID', 'WARMUP'];
  // dir: 1 = 越大越好；-1 = 越小越好。tiers 从最高档往下排。
  var CFG = {
    snake:      { dir: 1,  tiers: [25, 18, 12, 6],                     unit: '分', f: 'n', get: function (r) { return r.s; } },
    g2048:      { dir: 1,  tiers: [16000, 2048, 512, 128],             unit: '分', f: 'n', get: function (r) { return r.s; } },
    memory:     { dir: -1, tiers: [8, 10, 13, 18],                     unit: '步', f: 'n', get: function (r) { return r.mv; } },
    breakout:   { dir: 1,  tiers: [4, 3, 2, 1],                        unit: '层', f: 'n', get: function (r) { return r.lv; } },
    reaction:   { dir: -1, tiers: [150, 200, 260, 350],                unit: '毫秒', f: 'n', get: function (r) { return r.ms; } },
    dodge:      { dir: 1,  tiers: [60000, 40000, 25000, 12000],        unit: '秒', f: 'sec', get: function (r) { return r.ms; } },
    minesweeper:{ dir: -1, tiers: [15000, 25000, 40000, 70000],        unit: '秒', f: 'sec', get: function (r) { return r.ms; } },
    typing:     { dir: 1,  tiers: [65, 50, 30],                        unit: '字', f: 'n', get: function (r) { return r.n; } },
    tictactoe:  { dir: -1, tiers: [3, 4, 5],                           unit: '手', f: 'n', get: function (r) { return r.m; } }
  };
  var cfg = CFG[key];
  if (!cfg) return;

  var RUNS_KEY = 'paly.' + key + '.runs';
  var COMMIT_KEY = 'paly.' + key + '.commit';
  var NAME = { snake: '贪吃蛇', g2048: '2048', memory: '记忆翻牌', breakout: '打砖块', reaction: '反应测试',
               dodge: '躲避', minesweeper: '扫雷', typing: '打字冲刺', tictactoe: '井字棋' }[key] || key;

  function fmt(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    if (cfg.f === 'sec') return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + ' 秒';
    return Math.round(v) + ' ' + cfg.unit;
  }
  function rankIdx(v) {
    for (var i = 0; i < cfg.tiers.length; i++) {
      if (cfg.dir === 1 ? v >= cfg.tiers[i] : v <= cfg.tiers[i]) return i;
    }
    return cfg.tiers.length;
  }
  function gapTo(v, i) {
    if (i <= 0) return 0;
    var t = cfg.tiers[i - 1];
    return Math.abs((cfg.dir === 1 ? t - v : v - t));
  }
  function readRuns() {
    try {
      var a = JSON.parse(localStorage.getItem(RUNS_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function daysBack(n) {
    var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n);
    return dayKey(d.getTime());
  }

  /* ---------- 1) 进门先看到欠账 ---------- */
  function showCommitBar() {
    var c = null;
    try { c = JSON.parse(localStorage.getItem(COMMIT_KEY) || 'null'); } catch (e) {}
    if (!c || !c.label) return;
    var ageH = (Date.now() - c.ts) / 3600000;
    var when = ageH < 1 ? '刚才' : (ageH < 24 ? Math.round(ageH) + ' 小时前' : Math.round(ageH / 24) + ' 天前');
    var bar = document.createElement('div');
    bar.className = 'paly-commit-bar';
    bar.setAttribute('role', 'note');
    bar.textContent = '你' + when + '定过：下次进这个区，先打「' + c.label + '」。现在就是那个"下次"。';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  /* ---------- 2) 结束屏上挂四件事 ---------- */
  var host = document.getElementById('result') || document.getElementById('overlay');
  if (!host) return;

  function isUp() {
    if (host.id === 'result') return !host.hasAttribute('hidden');
    return host.classList.contains('show');
  }
  function hasRank() {
    var t = host.textContent || '';
    return /GODLIKE|INVINCIBLE|STRONG|SOLID|WARMUP/.test(t);
  }

  var injectedFor = null;

  function build(run) {
    var runs = readRuns();
    var v = cfg.get(run);
    var idx = rankIdx(v);
    var box = document.createElement('div');
    box.className = 'paly-hook';
    var lines = [];

    // near-miss：把"差一点"具体化
    if (idx > 0) {
      lines.push('再<span class="hl">' + fmt(gapTo(v, idx)) + '</span>就是 ' + RANKS[idx - 1] + '。');
    } else {
      lines.push('你已经在最高档（' + RANKS[0] + '）。这一局的事只剩一件：守住它。');
    }

    // 纵向对比：只跟自己的上一局比（能力感的直接来源，不比别人）
    var prev = runs[1];
    if (prev && prev.at && cfg.get(prev) !== undefined && cfg.get(prev) !== null) {
      var pv = cfg.get(prev);
      var dv = cfg.dir === 1 ? (v - pv) : (pv - v);
      if (dv > 0) lines.push('比上一局好：' + fmt(Math.abs(dv)) + '。（上一局 ' + fmt(pv) + '）');
      else if (dv === 0) lines.push('和上一局打平（' + fmt(pv) + '）。平局不算进步，但也没退。');
      else lines.push('比上一局退了一点：' + fmt(Math.abs(dv)) + '。（上一局 ' + fmt(pv) + '）');
    }

    // ZPD：下一局一个刚好够得着的数，写成 if-then（"下次进这个区，我先打 X"）
    var goalVal = null, goalText = '';
    if (idx > 0) {
      var g = gapTo(v, idx);
      var step = cfg.dir === 1 ? Math.max(1, Math.ceil(g / 2)) : Math.max(1, Math.floor(g / 2));
      goalVal = cfg.dir === 1 ? v + step : v - step;
      goalText = '下次进这个区，我先打 ' + fmt(goalVal) + '（这局 ' + fmt(v) + '）。';
    } else {
      goalVal = v;
      goalText = '下次进这个区，我先打 ' + fmt(v) + ' 或更好——先守住这一档。';
    }
    lines.push('<b>' + goalText + '</b>');

    // 连续、断裂、以及"允许补一次"（给缓冲反而留得住，见 RESEARCH 第二节第 4 条）
    var todayN = 0, daySet = {};
    for (var i = 0; i < runs.length; i++) {
      if (!runs[i] || !runs[i].at) continue;
      var dk = dayKey(runs[i].at);
      daySet[dk] = 1;
      if (dk === daysBack(0)) todayN++;
    }
    var streak = 0;
    for (var d = 0; d < 400; d++) {
      if (daySet[daysBack(d)]) streak++;
      else break;
    }
    function countFrom(start) {
      var n = 0;
      for (var i = start; i < 400; i++) {
        if (daySet[daysBack(i)]) n++;
        else break;
      }
      return n;
    }
    var graceKey = 'paly.' + key + '.grace';
    var graceRaw = '';
    try { graceRaw = localStorage.getItem(graceKey) || ''; } catch (e) {}
    var graceUsedNow = false;
    var gapYesterday = !daySet[daysBack(1)] && !!daySet[daysBack(2)];

    if (streak > 1) {
      lines.push('连着第 <span class="hl">' + streak + '</span> 天来这个区' +
        (todayN > 1 ? '，今天第 ' + todayN + ' 局。' : '。'));
    } else if (gapYesterday) {
      var graceOld = parseInt(graceRaw, 10);
      if (!graceOld || (Date.now() - graceOld) > 6 * 86400000) {
        try { localStorage.setItem(graceKey, String(Date.now())); } catch (e) {}
        graceUsedNow = true;
        lines.push('昨天断了。这一次替你补上——连着第 <span class="hl">' +
          (countFrom(2) + 2) + '</span> 天。这周只有这一次补，下次再断就真断了。');
      } else {
        lines.push('昨天断了，这周的补已经用掉，今天从第 1 天重算。');
      }
    } else if (todayN > 1) {
      lines.push('今天是这个区的第 <span class="hl">' + todayN + '</span> 局。');
    } else {
      lines.push('这是今天的第 1 局。今天再来一次，这个区就算"连着"了。');
    }

    box.innerHTML =
      '<div class="paly-hook-k">这一局之后</div>' +
      '<div class="paly-hook-l">' + lines.join('<br>') + '</div>' +
      '<button type="button" class="paly-hook-btn">就这么定</button>' +
      '<div class="paly-hook-note">按下它，存下这句话；下次进这个区，第一眼先看到"我先打…"。</div>';

    var btn = box.querySelector('.paly-hook-btn');
    btn.addEventListener('click', function () {
      try {
        localStorage.setItem(COMMIT_KEY, JSON.stringify({
          label: fmt(goalVal),
          ts: Date.now()
        }));
      } catch (e) {}
      var start = document.getElementById('ovBtn') || host.querySelector('button.primary') || host.querySelector('button');
      if (start) start.click();
    });
    return box;
  }

  function tick() {
    if (!isUp() || !hasRank()) return;
    var runs = readRuns();
    if (!runs.length) return;
    var run = runs[0];
    var sig = (run && run.id) ? String(run.id) : String(runs.length);
    if (sig === injectedFor) return;
    // 已兑现：这次成绩达到或超过承诺目标
    try {
      var c = JSON.parse(localStorage.getItem(COMMIT_KEY) || 'null');
      if (c && run) {
        var cv = parseFloat(String(c.label).replace(/[^0-9.]/g, ''));
        if (!isNaN(cv)) {
          var hit = cfg.dir === 1 ? cfg.get(run) >= cv : cfg.get(run) <= cv;
          if (hit) localStorage.removeItem(COMMIT_KEY);
        }
      }
    } catch (e) {}
    var old = host.querySelector('.paly-hook');
    if (old) old.parentNode.removeChild(old);
    injectedFor = sig;
    host.appendChild(build(run));
  }

  /* ---------- 3) 样式（同站注入，不外链） ---------- */
  var css = document.createElement('style');
  css.textContent =
    '.paly-commit-bar{position:relative;z-index:5;margin:0;padding:9px 16px;background:#12171c;border-bottom:1px solid #ffb347;' +
    'color:#ffb347;font:500 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;text-align:center}' +
    '.paly-hook{margin-top:14px;padding-top:12px;border-top:1px dashed #222b33;text-align:left}' +
    '.paly-hook-k{font:600 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.22em;color:#6f7d8a;text-transform:uppercase}' +
    '.paly-hook-l{margin-top:8px;font:400 13px/1.9 ui-monospace,SFMono-Regular,Menlo,monospace;color:#c6d2dc}' +
    '.paly-hook .hl{color:#35e0c8;font-weight:700}' +
    '.paly-hook b{color:#f2f6f9;font-weight:700}' +
    '.paly-hook-btn{margin-top:10px;width:100%;padding:9px 12px;background:transparent;border:1px solid #35e0c8;border-radius:6px;' +
    'color:#35e0c8;font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;cursor:pointer}' +
    '.paly-hook-btn:hover{background:rgba(53,224,200,.1)}' +
    '.paly-hook-note{margin-top:8px;font:400 11px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;color:#5f6c78}';
  document.head.appendChild(css);

  showCommitBar();
  tick();
  setInterval(tick, 600);
})();
