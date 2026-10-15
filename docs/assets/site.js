// HabitQuest public site: sections and cards appear as they scroll into view.
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('section h2, .sub, .card, .shots figure, .step, .premium > *, section details, .cta');
  document.documentElement.classList.add('js-reveal');
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      io.unobserve(el);
      // Once shown, hand the element back to its own hover effects.
      setTimeout(function () {
        el.classList.remove('reveal', 'in');
        el.style.transitionDelay = '';
      }, 900);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(function (el, i) {
    el.classList.add('reveal');
    // Cards of a same row arrive one after the other.
    el.style.transitionDelay = (i % 4) * 70 + 'ms';
    io.observe(el);
  });
})();

// Visitors whose phone is in Chinese (Taiwan is the Instagram account's first audience) land on
// the Japanese page from the bio link: offer the 繁體中文 page in a bar at the top.
(function () {
  const langs = (navigator.languages || [navigator.language || '']).join(',').toLowerCase();
  if (!/(^|,)zh/.test(langs)) return;
  const html = document.documentElement.getAttribute('lang') || '';
  const zh = document.querySelector('a.lang[hreflang="zh-Hant"], .langs a[hreflang="zh-Hant"]');
  if (html.indexOf('zh') === 0 || !zh) return;
  const link = zh.getAttribute('href');
  const bar = document.createElement('a');
  bar.className = 'zh-bar';
  bar.href = link;
  bar.textContent = '🇹🇼 本網站與 App 都有繁體中文版 → 切換';
  document.body.insertBefore(bar, document.body.firstChild);
})();

// The header's Play button only shows once the hero's big one has scrolled away: one call to action
// on screen at a time.
(function () {
  const hero = document.querySelector('.hero .play');
  if (!hero || !('IntersectionObserver' in window)) return document.body.classList.add('scrolled');
  new IntersectionObserver(function (entries) {
    document.body.classList.toggle('scrolled', !entries[0].isIntersecting);
  }).observe(hero);
})();
