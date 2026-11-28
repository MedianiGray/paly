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
