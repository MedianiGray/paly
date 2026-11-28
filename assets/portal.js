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
    Promise.all([get('total-open'), get('total-replay'), get('d-' + today + '-open')]).then(function (a) {
      if (a[0] === null || a[1] === null) {
        line.textContent = '留人读数：读不到全站计数（断网或计数服务不可达）。游戏不受影响。';
        return;
      }
      var open = a[0] || 0, replay = a[1] || 0, todayOpen = a[2] || 0;
      var rate = open > 0 ? (replay / open).toFixed(2) : '0.00';
      line.textContent = '留人读数：全区被打开 ' + open + ' 次（今天 ' + todayOpen + ' 次），有人点了 ' + replay +
        ' 次"再来一局"——平均每打开一次，点 ' + rate + ' 次再来。这个数只涨不骗人，谁都能在同一页读到。';
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
