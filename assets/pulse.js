/* 留人探针：只记两个数——"进了这一区"和"点了再来"。
   它不改任何游戏逻辑，失败静默，断网照样能玩。
   数据打到一个公开计数器，任何人打开 index.html 都能读到同一份。 */
(function () {
  'use strict';
  // 被验收台/压测台/自动跑局用 iframe 装进来时，一律不报：
  // 那不是"有人进门"，是机器在跑。让公开计数只收真人的。
  if (window.top !== window.self) return;

  var NS = 'medianigray-paly-v2';
  var BASE = 'https://abacus.jasoncameron.dev';
  // 调试旁路：带 dbg=1 的页面照常玩、照常测试，但一个数都不报。
  // 我自己验收时一律用它，所以两组样本里不会有我跑出来的数。
  var SKIP = /[?&]dbg=1/.test(location.search);
  var m = location.pathname.match(/\/games\/([a-z0-9]+)\.html/i);
  var page = m ? m[1].toLowerCase() : 'portal';

  // 对照实验分组：URL 参数优先，其次用门户给这个浏览器分配的组，最后默认 hooks。
  function armOf() {
    var q = location.search;
    if (/[?&]arm=plain/.test(q)) return 'plain';
    if (/[?&]arm=hooks/.test(q)) return 'hooks';
    try {
      var a = localStorage.getItem('paly.arm');
      return a === 'plain' ? 'plain' : 'hooks';
    } catch (e) { return 'hooks'; }
  }
  var arm = armOf();

  function hit(k) {
    if (SKIP) return;
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
      hit('o-' + arm);
      hit('d-' + ymd() + '-open');
    }
  } catch (e) {
    hit(page + '-open');
    hit('total-open');
    hit('o-' + arm);
    hit('d-' + ymd() + '-open');
  }

  // 点"再来一局 / 再开 / 重开"：每次记一次，单页最多 20 次，防连点刷数
  // 只认真实指针/键盘点击（isTrusted），脚本 el.click() 一律不算；
  // 同一按钮 400ms 内的连点也只算一次。
  var n = 0, lastAt = 0;
  document.addEventListener('click', function (e) {
    if (e.isTrusted === false) return;
    var el = e.target && e.target.closest ? e.target.closest('button,a') : null;
    if (!el) return;
    var t = (el.textContent || '').replace(/\s+/g, '');
    if (!/再来|再开|重开|again|restart/i.test(t) || n >= 20) return;
    var now = Date.now();
    if (now - lastAt < 400) return;
    lastAt = now;
    n += 1;
    hit(page + '-replay');
    hit('total-replay');
    hit('r-' + arm);
  }, true);
})();
