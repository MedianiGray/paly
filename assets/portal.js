/* 入口页交互：键盘可达性兜底 + 卡片轻微视差高光。
   不做任何跳转拦截，保证各浏览器与无 JS 环境也能用。 */
(function () {
  'use strict';

  // 0) 九个区，一处看：只读本机记录，判断某个区玩过没有
  (function renderTally() {
    var AREAS = [
      { key: 'snake', name: '贪吃蛇' },
      { key: 'g2048', name: '2048' },
      { key: 'memory', name: '记忆翻牌' },
      { key: 'breakout', name: '打砖块' },
      { key: 'reaction', name: '反应测试' },
      { key: 'dodge', name: '躲避' },
      { key: 'minesweeper', name: '扫雷' },
      { key: 'typing', name: '打字冲刺' },
      { key: 'tictactoe', name: '井字棋' }
    ];
    var host = document.getElementById('tally');
    if (!host) return;
    var played = 0, html = '';
    AREAS.forEach(function (a) {
      var on = false;
      try {
        on = localStorage.getItem('paly.' + a.key + '.best') !== null ||
             localStorage.getItem('paly.' + a.key + '.runs') !== null;
      } catch (e) { on = false; }
      if (on) played += 1;
      html += '<div class="tally-cell' + (on ? ' is-on' : '') + '">' +
              '<span class="tally-name">' + a.name + '</span>' +
              '<span class="tally-n">' + (on ? '玩过' : '未玩') + '</span></div>';
    });
    host.innerHTML = html;
    var sum = document.getElementById('tally-sum');
    if (sum) {
      if (!played) {
        sum.textContent = '九个区都还空着，随便挑一个进去';
      } else if (played < 9) {
        sum.textContent = '九个区走过 ' + played + ' 个，还剩 ' + (9 - played) + ' 个空着';
      } else {
        sum.textContent = '九个区全走过了';
      }
    }
    host.setAttribute('data-played', String(played));
  })();

  // 0a) 首次访问随机分组，并把组别带进每个区的链接里
  (function armAssign() {
    var a = 'hooks';
    try {
      a = localStorage.getItem('paly.arm');
      if (!a) {
        a = Math.random() < 0.5 ? 'hooks' : 'plain';
        localStorage.setItem('paly.arm', a);
      }
      document.querySelectorAll('.card').forEach(function (c) {
        var h = c.getAttribute('href');
        if (h && h.indexOf('arm=') < 0) {
          // 带上 build 标记：浏览器缓存住旧 HTML 时，点进去看到的会是改之前的那一版
          var sep = h.indexOf('?') > -1 ? '&' : '?';
          c.setAttribute('href', h + sep + 'arm=' + a + '&v=20261128g');
        }
      });
    } catch (e) {}
    var host = document.getElementById('arm-line');
    if (host) {
      host.textContent = '你这次被分到' + (a === 'plain' ? '对照组（结束屏没有钩子）' : '钩子组（结束屏带目标与承诺）') +
        '。这是随机的，刷新不会改。';
    }
  })();

  // 0b) 留人读数：读全站两个公开计数（进区次数 / 点再来次数）+ 今日进区
  (function renderPulse() {
    var line = document.getElementById('pulse-line');
    if (!line) return;
    var BASE = 'https://abacus.jasoncameron.dev';
    var NS = 'medianigray-paly-v2';
    var d = new Date();
    var today = '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    function get(k) {
      return fetch(BASE + '/get/' + NS + '/' + k, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return j && typeof j.value === 'number' ? j.value : 0; })
        ['catch'](function () { return null; });
    }
    Promise.all([
      get('total-open'), get('total-replay'), get('d-' + today + '-open'),
      get('o-hooks'), get('o-plain'), get('r-hooks'), get('r-plain')
    ]).then(function (a) {
      if (a[0] === null || a[1] === null) {
        line.textContent = '留人读数：读不到全站计数（断网或计数服务不可达）。游戏不受影响。';
        return;
      }
      var open = a[0] || 0, replay = a[1] || 0, todayOpen = a[2] || 0;
      var rate = open > 0 ? (replay / open).toFixed(2) : '0.00';
      line.textContent = '留人读数：全区被打开 ' + open + ' 次（今天 ' + todayOpen + ' 次），有人点了 ' + replay +
        ' 次"再来一局"——平均每打开一次，点 ' + rate + ' 次再来。谁都能在同一页读到。';

      // 对照实验判定：规则写死在这里，结论由数字给，不由我说。
      var ab = document.getElementById('ab-line');
      if (!ab) return;
      var oh = a[3] || 0, op = a[4] || 0, rh = a[5] || 0, rp = a[6] || 0;
      var N = 30;
      var rateH = oh > 0 ? rh / oh : 0;
      var rateP = op > 0 ? rp / op : 0;
      var head = '对照实验：钩子组 ' + oh + ' 次打开 / ' + rh + ' 次再来（' + rateH.toFixed(2) + '）；' +
        '对照组 ' + op + ' / ' + rp + '（' + rateP.toFixed(2) + '）。';
      if (oh < N || op < N) {
        ab.textContent = head + '样本不足：两组各到 ' + N + ' 次真实打开才能下结论（还差 ' +
          Math.max(0, N - oh) + ' / ' + Math.max(0, N - op) + '）。现在下结论就是编。';
        return;
      }
      if (rateH >= 0.5 && rateH >= rateP * 1.5) {
        ab.textContent = head + '样本已够，钩子组达到 0.50 且是对照组的 ' +
          (rateP > 0 ? (rateH / rateP).toFixed(2) : '∞') + ' 倍——这套钩子在这次实验里成立。';
      } else {
        ab.textContent = head + '样本已够，但没到"0.50 且 1.5 倍"的门槛——这套钩子没兑现，得回去改。';
      }
    });
  })();

  // 0c) 进门先看到自己欠下的账，或上次停在哪
  (function renderResume() {
    var host = document.getElementById('resume-line');
    if (!host) return;
    var AREAS = [
      { key: 'snake', name: '贪吃蛇' }, { key: 'g2048', name: '2048' },
      { key: 'memory', name: '记忆翻牌' }, { key: 'breakout', name: '打砖块' },
      { key: 'reaction', name: '反应测试' }, { key: 'dodge', name: '躲避' },
      { key: 'minesweeper', name: '扫雷' }, { key: 'typing', name: '打字冲刺' },
      { key: 'tictactoe', name: '井字棋' }
    ];
    var commit = null, commitName = '';
    var last = null, lastName = '';
    AREAS.forEach(function (a) {
      try {
        var c = JSON.parse(localStorage.getItem('paly.' + a.key + '.commit') || 'null');
        if (c && c.label && (!commit || c.ts > commit.ts)) { commit = c; commitName = a.name; }
        var runs = JSON.parse(localStorage.getItem('paly.' + a.key + '.runs') || '[]');
        if (Array.isArray(runs) && runs[0] && runs[0].at && (!last || runs[0].at > last.at)) {
          last = runs[0]; lastName = a.name;
        }
      } catch (e) {}
    });

    function when(ts) {
      var h = Math.round((Date.now() - ts) / 3600000);
      if (h < 1) return '刚才';
      if (h < 24) return h + ' 小时前';
      return Math.round(h / 24) + ' 天前';
    }

    if (commit && commitName) {
      host.innerHTML = '<span class="resume-k">欠着一笔</span>' +
        '<span class="resume-t">' + when(commit.ts) + '你在 ' + commitName + ' 说下局要打「' + commit.label +
        '」，还没兑现。</span>' +
        '<a class="resume-go" href="games/' + (AREAS.filter(function (a) { return a.name === commitName; })[0].key) + '.html">去兑现 →</a>';
      return;
    }
    if (last && lastName) {
      var key = AREAS.filter(function (a) { return a.name === lastName; })[0].key;
      host.innerHTML = '<span class="resume-k">接着来</span>' +
        '<span class="resume-t">你上次停在 ' + lastName + '，' + when(last.at) + '。那一局还在榜上。</span>' +
        '<a class="resume-go" href="games/' + key + '.html">回到 ' + lastName + ' →</a>';
      return;
    }
    host.innerHTML = '<span class="resume-k">空着</span>' +
      '<span class="resume-t">还没有哪一区留下记录。随便挑一个进去，回来这里会记住你停在哪。</span>';
  })();

  // 0d) 今天的题：一天只推一个区（Wordle 的结构：稀缺 + 焦点，不是砍功能）
  (function renderDaily() {
    var host = document.getElementById('daily-line');
    if (!host) return;
    var AREAS = [
      { key: 'snake', name: '贪吃蛇' }, { key: 'g2048', name: '2048' },
      { key: 'memory', name: '记忆翻牌' }, { key: 'breakout', name: '打砖块' },
      { key: 'reaction', name: '反应测试' }, { key: 'dodge', name: '躲避' },
      { key: 'minesweeper', name: '扫雷' }, { key: 'typing', name: '打字冲刺' },
      { key: 'tictactoe', name: '井字棋' }
    ];
    var now = new Date();
    var seed = now.getFullYear() * 372 + (now.getMonth() + 1) * 31 + now.getDate();
    var pick = AREAS[seed % AREAS.length];
    var todayKey = '' + now.getFullYear() + (now.getMonth() + 1) + now.getDate();
    var todayRuns = 0, playedToday = false;
    try {
      var runs = JSON.parse(localStorage.getItem('paly.' + pick.key + '.runs') || '[]');
      if (Array.isArray(runs)) {
        runs.forEach(function (r) {
          if (!r || !r.at) return;
          var d = new Date(r.at);
          if (('' + d.getFullYear() + (d.getMonth() + 1) + d.getDate()) === todayKey) {
            todayRuns += 1;
            playedToday = true;
          }
        });
      }
    } catch (e) {}
    host.innerHTML = '<span class="resume-k">今天的题</span>' +
      '<span class="resume-t">' + pick.name + ' · ' +
      (playedToday ? '今天已经打过 ' + todayRuns + ' 局' : '今天还没打') +
      '。就这一个，别九个摊开。</span>' +
      '<a class="resume-go" href="games/' + pick.key + '.html">' +
      (playedToday ? '再打一局 →' : '去打今天的题 →') + '</a>';
  })();

  // 0e) 把今天的题发出去：复制一段话，链接故意不带组别（让对方自己随机）
  (function shareBox() {
    var btn = document.getElementById('share-btn');
    if (!btn) return;
    var txt = 'GODLIKE INVINCIBLE FUN ZONE · PRO MAX —— 九个纯前端小游戏，今天只有一道题，两分钟。\nhttps://medianigray.github.io/paly/';
    function ok() { btn.textContent = '已复制 · 粘贴发送就行'; }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;left:-999px';
      document.body.appendChild(ta);
      ta.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (e) {}
      ta.parentNode.removeChild(ta);
      btn.textContent = done ? '已复制 · 粘贴发送就行' : '复制失败：手选下面的链接';
      if (!done) {
        var box = document.createElement('textarea');
        box.className = 'share-fallback';
        box.readOnly = true;
        box.rows = 3;
        box.value = txt;
        btn.parentNode.insertBefore(box, btn.nextSibling);
        try { box.focus(); box.select(); } catch (e) {}
      }
    }
    btn.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(ok)['catch'](fallback);
      } else fallback();
    });
  })();

  // 1) 让卡片可用回车进入（部分老浏览器对 a 元素的可聚焦处理不一致）
  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) {
        var href = card.getAttribute('href');
        if (href) window.location.href = href;
      }
    });
  });

  // 2) 鼠标位置驱动卡片细光的方向（纯装饰，触屏自动跳过）
  if (window.matchMedia('(hover: hover)').matches === false) return;

  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width) * 100;
      card.style.setProperty('--mx', x.toFixed(1) + '%');
    });
  });
})();
