/* Animations partagées : cascade des cartes, onglets, onde au toucher,
   halo quand un appareil s'allume, fondu de l'affiche Xbox. */
(function(){
  'use strict';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function cascade(root){
    var cards = (root || document).querySelectorAll('.card');
    var i = 0;
    cards.forEach(function(c){
      if (c.offsetParent === null) return;
      c.classList.remove('anim-in'); void c.offsetWidth;
      c.style.setProperty('--i', i++); c.classList.add('anim-in');
    });
  }

  /* onglets (appli téléphone) */
  var order = ['accueil','xbox','maison','journee','reglages'], last = location.hash.slice(1) || 'accueil';
  window.addEventListener('hashchange', function(){
    var cur = location.hash.slice(1) || 'accueil';
    var v = document.getElementById('v-' + cur); if (!v) return;
    v.style.setProperty('--dir', (order.indexOf(cur) >= order.indexOf(last) ? 18 : -18) + 'px');
    v.classList.remove('view-in'); void v.offsetWidth; v.classList.add('view-in');
    last = cur; cascade(v);
  });

  /* onde au toucher */
  document.addEventListener('pointerdown', function(e){
    var el = e.target.closest('.btn,.scene,.appb,.app,.icon-btn,.hue button');
    if (!el) return;
    el.classList.add('rip-host');
    var r = el.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2;
    var s = document.createElement('span'); s.className = 'ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size/2) + 'px'; s.style.top = (e.clientY - r.top - size/2) + 'px';
    el.appendChild(s); setTimeout(function(){ s.remove(); }, 650);
  }, {passive:true});

  /* halo quand un interrupteur s'allume, fondu de l'affiche, chiffres qui changent */
  var obs = new MutationObserver(function(list){
    list.forEach(function(m){
      var t = m.target;
      if (m.type === 'attributes' && m.attributeName === 'aria-checked' && t.getAttribute('aria-checked') === 'true'){
        var card = t.closest('.card') || t.closest('.item'); if (card){ card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse'); }
      }
      if (m.type === 'characterData' || m.type === 'childList'){
        var el = t.nodeType === 3 ? t.parentElement : t;
        if (!el) return;
        if (el.id === 'xb-title'){ var now = el.closest('.now'); if (now){ now.classList.remove('swap'); void now.offsetWidth; now.classList.add('swap'); } }
        if (['wx-t','wx-mini-t','sunrise','sunset','gar-sub','shut-sub','xb-state','presence-txt','chip-xbox','chip-lights'].indexOf(el.id) >= 0){
          el.classList.remove('changed'); void el.offsetWidth; el.classList.add('changed');
        }
      }
    });
  });

  function start(){
    obs.observe(document.body, {subtree:true, attributes:true, attributeFilter:['aria-checked'], childList:true, characterData:true});
    cascade();
    /* horloge : deux-points qui respirent */
    var clock = document.getElementById('clock');
    if (clock){
      var paint = function(){ var t = clock.textContent; if (t.indexOf(':') > 0 && !clock.querySelector('.colon')){ var p = t.split(':'); clock.innerHTML = p[0] + '<span class="colon">:</span>' + p[1]; } };
      new MutationObserver(paint).observe(clock, {childList:true, characterData:true, subtree:true}); paint();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
