/* 留人探针：只记两个数——"进了这一区"和"点了再来"。
   它不改任何游戏逻辑，失败静默，断网照样能玩。
   数据打到一个公开计数器，任何人打开 index.html 都能读到同一份。 */
(function () {
  'use strict';
  var NS = 'medianigray-paly-v1';
  var BASE = 'https://abacus.jasoncameron.dev';
  var m = location.pathname.match(/\/games\/([a-z0-9]+)\.html/i);
  var page = m ? m[1].toLowerCase() : 'portal';

  function hit(k) {
    try {
      fetch(BASE + '/hit/' + NS + '/' + encodeURIComponent(k), {
        mode: 'cors',
        keepalive: true,
        cache: 'no-store'
      })['catch'](function () {});
    } catch (e) {}
  }

  function ymd() {
    var d = new Date();
    return '' + d.getFullYear() +
      ('0' + (d.getMonth() + 1)).slice(-2) +
      ('0' + d.getDate()).slice(-2);
  }

  // 进入这一页：同一标签页会话里只记一次，刷新不虚高
  try {
    if (!sessionStorage.getItem('paly-pulse-' + page)) {
      sessionStorage.setItem('paly-pulse-' + page, '1');
      hit(page + '-open');
      hit('total-open');
      hit('d-' + ymd() + '-open');
    }
  } catch (e) {
    hit(page + '-open');
    hit('total-open');
    hit('d-' + ymd() + '-open');
  }

  // 点"再来一局 / 再开 / 重开"：每次记一次，单页最多 20 次，防连点刷数
  var n = 0;
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('button,a') : null;
    if (!el) return;
    var t = (el.textContent || '').replace(/\s+/g, '');
    if (/再来|再开|重开|again|restart/i.test(t) && n < 20) {
      n += 1;
      hit(page + '-replay');
      hit('total-replay');
    }
  }, true);
})();
