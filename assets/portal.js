/* 入口页交互：键盘可达性兜底 + 卡片轻微视差高光。
   不做任何跳转拦截，保证各浏览器与无 JS 环境也能用。 */
(function () {
  'use strict';

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
