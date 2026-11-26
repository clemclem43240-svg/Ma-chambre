/* Mouvements de l'appli téléphone (version 11) : cascade des cartes, onglets, horloge qui roule,
   vagues de couleur des ambiances, Xbox (démarrage, extinction façon vieille télé, égaliseur),
   lumières, notifications, thèmes. L'appli marche pareil sans ce fichier. */
(function(){
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pref = () => { try { const v = localStorage.getItem('tb-anim'); return v == null ? true : JSON.parse(v) !== false; } catch(e){ return true; } };
  let on = pref() && !reduce;
  root.classList.toggle('noanim', !on);
  if (on) root.classList.add('m-intro');
  const $ = id => document.getElementById(id);
  const restart = (el, c) => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };
  const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; };
  function fx(cls, el, opt){
    if (!on || !el) return;
    opt = opt || {};
    const p = opt.at || center(el), d = document.createElement('div');
    d.className = cls; d.style.left = p[0] + 'px'; d.style.top = p[1] + 'px';
    if (opt.style) d.style.cssText += opt.style; if (opt.html) d.innerHTML = opt.html;
    $(cls === 'm-bloom' ? 'm-back' : 'm-front').appendChild(d);
    setTimeout(() => d.remove(), opt.ms || 2000);
  }
  const glow = (c, s) => 'background:radial-gradient(circle,' + c + ' 0,' + c + 'aa 30%,transparent 70%);--s:' + (s || 8);

  /* ---------- horloge : les chiffres roulent ---------- */
  const CC = ['#ffffff','#f0f6ff','#dcefff','#e6dcff','#f6cdf3','#ffc2ef'];
  let clk = '';
  function clock(el, t){
    if (t === clk) return;
    if (!on){ el.className = 'clock'; el.textContent = t; clk = t; return; }
    if (!clk || clk.length !== t.length || !el.querySelector('.dg')){
      el.className = 'clock m-clk';
      el.innerHTML = [...t].map((ch, i) => '<span class="dg' + (ch === ':' ? ' cl' : '') + '"><b style="background-image:linear-gradient(90deg,' + CC[i] + ',' + CC[i+1] + ')">' + ch + '</b></span>').join('');
      clk = t; return;
    }
    [...t].forEach((ch, i) => {
      if (ch === clk[i]) return;
      const sl = el.children[i], old = sl.lastElementChild, nb = old.cloneNode(false);
      old.className = 'o'; nb.className = 'n'; nb.textContent = ch; sl.appendChild(nb);
      setTimeout(() => old.remove(), 700);
    });
    clk = t;
  }

  /* ---------- météo : dessins animés ---------- */
  const am = (t, v, d, b) => '<animateTransform attributeName="transform" type="' + t + '" values="' + v + '" dur="' + d + '"' + (b ? ' begin="' + b + '"' : '') + ' repeatCount="indefinite"/>';
  const ao = (v, d, b) => '<animate attributeName="opacity" values="' + v + '" dur="' + d + '"' + (b ? ' begin="' + b + '"' : '') + ' repeatCount="indefinite"/>';
  const drift = x => '<g>' + am('translate', '0 0;1.2 0;0 0', '7s') + x + '</g>';
  const drops = (col, ds, dur, dy) => ds.map((d, i) => '<path style="stroke:' + col + '" d="' + d + '">' + am('translate', '0.4 -' + dy + ';-0.4 ' + dy, dur, (i * .33) + 's') + ao('0;1;0', dur, (i * .33) + 's') + '</path>').join('');
  const C15 = '<path d="M7 15h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 6.5 8.5 3.3 3.3 0 0 0 7 15z"/>', C14 = '<path d="M7 14h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 6.5 7.5 3.3 3.3 0 0 0 7 14z"/>';
  const WX = {
    sun: '<g>' + am('rotate', '0 12 12;360 12 12', '30s') + '<path style="stroke:#ffc46b" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g><circle cx="12" cy="12" r="4" style="stroke:#ffc46b"><animate attributeName="r" values="4;4.6;4" dur="4s" repeatCount="indefinite"/></circle>',
    cloudsun: '<g>' + ao('.5;1;.5', '4s') + '<path style="stroke:#ffc46b" d="M8 3v1.5M3.8 5.8l1 1M2 10h1.5M12.2 5.8l-1 1"/></g><path style="stroke:#ffc46b" d="M5.5 11.5a3 3 0 0 1 5.3-2.6"/>' + drift('<path d="M8 20h9a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 8 20z"/>'),
    cloud: drift('<path d="M7 19h10a4.5 4.5 0 0 0 .5-9A6 6 0 0 0 6 11.5 3.8 3.8 0 0 0 7 19z"/>'),
    fog: '<path d="M4 10h16">' + am('translate', '-1 0;1 0;-1 0', '5s') + '</path><path d="M3 14h18">' + am('translate', '1 0;-1 0;1 0', '6s') + '</path><path d="M6 18h12">' + am('translate', '-1 0;1 0;-1 0', '4s') + '</path>',
    rain: drift(C15) + drops('#7cc8ff', ['M9 18l-1 3', 'M13 18l-1 3', 'M17 18l-1 3'], '1s', 1.5),
    snow: drift(C14) + drops('#cfe8ff', ['M9 18h.01', 'M13 18h.01', 'M17 18h.01', 'M11 21h.01', 'M15 21h.01'], '2.2s', 1.2),
    storm: drift(C14) + '<path style="stroke:#ffc46b" d="M12 14l-2 4h4l-2 4">' + ao('1;1;1;1;.1;1;.1;1;1;1', '3s') + '</path>'
  };
  const wx = k => on ? WX[k] : null;

  /* ---------- cascade des cartes (démarrage, onglets) et apparition au défilement ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && e.target.classList.contains('pre')){ e.target.classList.remove('pre'); restart(e.target, 'reveal'); io.unobserve(e.target); }
  }), {rootMargin:'0px 0px -6% 0px'}) : null;
  function cascade(view){
    if (!on || !view) return;
    let i = 0;
    view.querySelectorAll('.card').forEach(c => {
      if (!c.offsetParent) return;
      c.classList.remove('rise', 'pre', 'reveal'); c.style.removeProperty('--i');
      if (c.getBoundingClientRect().top < innerHeight || !io){ void c.offsetWidth; c.style.setProperty('--i', i++); c.classList.add('rise'); }
      else { c.classList.add('pre'); io.observe(c); }
    });
  }

  /* ---------- onglets : pastille qui glisse, vue qui arrive du bon côté ---------- */
  const ORDER = ['accueil','xbox','maison','journee','reglages'];
  let last = (location.hash || '#accueil').slice(1), ind = null;
  function moveInd(){
    const nav = document.querySelector('nav.tabs'), a = nav && nav.querySelector('a[aria-current="page"]');
    if (!nav || !a) return;
    if (!ind){ ind = document.createElement('span'); ind.className = 'm-ind'; nav.prepend(ind); nav.classList.add('m-has'); }
    ind.style.width = a.offsetWidth + 'px'; ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
  }
  window.addEventListener('hashchange', () => setTimeout(() => {
    const cur = (location.hash || '#accueil').slice(1), v = $('v-' + cur);
    moveInd();
    if (!v || !on) { last = cur; return; }
    v.style.setProperty('--dir', (ORDER.indexOf(cur) >= ORDER.indexOf(last) ? 24 : -24) + 'px');
    restart(v, 'm-in'); cascade(v); last = cur;
  }, 0));
  window.addEventListener('resize', moveInd);

  /* ---------- ambiances : vague de couleur derrière le verre, le fond change de teinte ---------- */
  function scene(btn){
    if (!on || !btn) return;
    const c = getComputedStyle(btn).getPropertyValue('--c').trim() || '#7cc8ff';
    const ic = btn.querySelector('.ic'); if (ic) restart(ic, 'm-pop');
    fx('m-bloom', btn, {style: glow(c, 10)});
    fx('m-ring', btn, {style: 'border-color:' + c, ms: 1100});
  }
  /* le fond prend la teinte de l'ambiance en fondu */
  let scT = null;
  function sceneBg(k){
    k = k || ''; if (document.body.dataset.scene === k) return;
    clearTimeout(scT);
    if (!on || document.body.dataset.scene === undefined){ document.body.dataset.scene = k; return; }
    const au = document.querySelector('.aurora'); au.classList.add('m-fade');
    scT = setTimeout(() => { document.body.dataset.scene = k; au.classList.remove('m-fade'); }, 450);
  }

  /* ---------- Xbox ---------- */
  let px = null, pxT = null;
  function xbox(s, media){
    sceneBg(s.scene);
    const c = $('c-xbox'), now = $('xb-now'); if (!c || !now) return;
    if (!now.querySelector('.ox')) now.insertAdjacentHTML('afterbegin', '<i class="ox"></i><i class="swp"></i><i class="crt"></i><span class="eq"><i></i><i></i><i></i><i></i></span>');
    const title = media && media.title || '', key = s.xbox ? (s.app || '') + '|' + title : '';
    c.classList.toggle('m-play', s.xbox && !!(title || (s.app && s.app !== 'Home')));
    const cs = getComputedStyle(now), bg = [cs.backgroundColor, cs.backgroundImage];
    const html = '<span class="label">' + $('xb-label').innerHTML + '</span><span class="title">' + $('xb-title').innerHTML + '</span>';
    if (!px || !on || (s.xbox === px.on && key === px.key)){ px = {on: s.xbox, key, bg, html}; return; }
    const ox = now.querySelector('.ox'); ox.style.backgroundColor = px.bg[0]; ox.style.backgroundImage = px.bg[1];
    clearTimeout(pxT); ['m-boot','m-shut','m-go','m-x'].forEach(k => c.classList.remove(k));
    now.querySelectorAll('.old').forEach(o => o.remove()); void c.offsetWidth;
    if (s.xbox && !px.on){ c.classList.add('m-boot', 'm-go'); fx('m-ring', c.querySelector('.ic'), {style: 'border-color:#5fe39a', ms: 1100}); }
    else if (!s.xbox && px.on){ const o = document.createElement('div'); o.className = 'old'; o.innerHTML = px.html; now.appendChild(o); c.classList.add('m-shut'); setTimeout(() => o.remove(), 700); }
    else c.classList.add('m-go');
    c.classList.add('m-x');
    pxT = setTimeout(() => ['m-boot','m-shut','m-go','m-x'].forEach(k => c.classList.remove(k)), 1500);
    px = {on: s.xbox, key, bg, html};
  }

  /* ---------- thèmes Xbox : fondu d'entrée ---------- */
  let thT = null, thFirst = true;
  function theme(k){
    if (thFirst){ thFirst = false; return; }
    if (!on || !k) return;
    restart($('m-veil'), 'go'); document.body.classList.add('m-thin');
    clearTimeout(thT); thT = setTimeout(() => { document.body.classList.remove('m-thin'); $('m-veil').className = ''; }, 2600);
  }

  /* ---------- notifications ---------- */
  function newNotif(){ if (!on) return; const li = document.querySelector('#notifs li.item'); if (li) li.classList.add('m-new'); }

  /* ---------- reflet sur les cartes visibles ---------- */
  let gi = 0;
  function shine(){
    if (!on || document.hidden) return;
    const vis = [...document.querySelectorAll('.app .card')].filter(c => { if (!c.offsetParent) return false; const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight - 90; });
    if (!vis.length) return;
    const c = vis[gi++ % vis.length]; let g = c.querySelector(':scope > .gl');
    if (!g){ g = document.createElement('i'); g.className = 'gl'; c.appendChild(g); }
    restart(g, 'go');
  }

  /* ---------- touchers : applis, télé, lumières, couleurs ---------- */
  document.addEventListener('touchstart', () => {}, {passive: true}); /* active l'effet d'appui sur iPhone */
  document.addEventListener('click', e => {
    if (!on) return;
    const t = e.target;
    const app = t.closest('[data-app]'); if (app){ const l = app.querySelector('.logo'); if (l) restart(l, 'm-hop'); }
    const tv = t.closest('[data-tv]'); if (tv) fx('m-flt', tv, {html: tv.innerHTML, ms: 1100});
    const sw = t.closest('[data-lc]'); if (sw) restart(sw, 'm-pop');
    const lt = t.closest('[data-l]');
    if (lt) setTimeout(() => {
      const card = lt.closest('.card'), ic = card && card.querySelector('.ic'); if (!card || !card.classList.contains('active') || !ic) return;
      const col = (card.querySelector('[data-lr]') || ic).style.getPropertyValue('--tc') || '#ffcf8a';
      restart(ic, 'm-lit'); fx('m-bloom', ic, {style: glow(col, 5)}); fx('m-ring', ic, {style: 'border-color:' + col, ms: 1100});
    }, 30);
  }, true);

  /* ---------- réglage Animations ---------- */
  function wireSetting(){
    const sel = $('st-anim'); if (!sel) return;
    sel.value = pref() ? '1' : '0';
    sel.onchange = () => { try { localStorage.setItem('tb-anim', JSON.stringify(sel.value === '1')); } catch(e){} location.reload(); };
  }

  function start(){
    document.body.insertAdjacentHTML('beforeend', '<div id="m-back" aria-hidden="true"></div><div id="m-front" aria-hidden="true"></div><div id="m-veil" aria-hidden="true"></div>');
    wireSetting();
    requestAnimationFrame(() => { moveInd(); const v = $('v-' + last); cascade(v && !v.hidden ? v : $('v-accueil')); });
    setTimeout(() => root.classList.remove('m-intro'), 1600);
    setTimeout(() => { const g = document.querySelector('#v-accueil .card'); if (g && g.offsetParent) shine(); }, 1200);
    setInterval(shine, 6000);
  }
  window.Motion = { on: () => on, clock, wx, scene, xbox, theme, newNotif, start };
})();
