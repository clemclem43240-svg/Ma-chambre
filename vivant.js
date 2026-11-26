/* Ma chambre vivante (version 1) : ciel qui suit l'heure et la météo, messages d'accueil,
   couleurs tirées de la jaquette en cours, plan 3D de la chambre.
   Partagé par l'appli téléphone et la tablette : JavaScript ES5 (Android 4.4), sans dépendance. */
(function(){
  'use strict';
  var V = window.VIV = {};
  function each(a, f){ for (var i = 0; i < a.length; i++) f(a[i], i); }
  function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
  /* ---------- couleurs ---------- */
  function rgb(h){ h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function hex(c){ var s = '#'; each(c, function(v){ v = Math.round(clamp(v, 0, 255)); s += (v < 16 ? '0' : '') + v.toString(16); }); return s; }
  function mix(a, b, t){ a = rgb(a); b = rgb(b); return hex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
  function grey(h, f, d){ var c = rgb(h), l = c[0] * .3 + c[1] * .59 + c[2] * .11; return hex([(c[0] + (l - c[0]) * f) * d, (c[1] + (l - c[1]) * f) * d, (c[2] + (l - c[2]) * f) * d]); }
  function rgba(h, a){ var c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  V.mix = mix; V.rgba = rgba; V.rgb = rgb; V.hex = hex;
  V.lighten = function(h, f){ return mix(h, '#ffffff', f); };
  V.darken = function(h, f){ return mix(h, '#000000', f); };
  function grad(el, dir, stops){
    var s = stops.join(',');
    el.style.backgroundImage = '-webkit-linear-gradient(' + (dir === 'v' ? 'top' : 'left') + ',' + s + ')';
    el.style.backgroundImage = 'linear-gradient(' + (dir === 'v' ? '180deg' : '90deg') + ',' + s + ')';
  }

  /* ---------- ciel : hauteur du soleil -> couleurs ---------- */
  /* hauteur approximative du soleil (degrés) à partir des heures de lever et de coucher */
  V.sunInfo = function(now, rise, set){
    var d = new Date(now), day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    function hm(h, m){ return new Date(day.getTime() + (h * 60 + m) * 60000); }
    if (!rise || isNaN(rise)) rise = hm(7, 45); if (!set || isNaN(set)) set = hm(17, 15);
    /* ramène lever/coucher sur la journée en cours */
    rise = hm(rise.getHours(), rise.getMinutes()); set = hm(set.getHours(), set.getMinutes());
    var doy = Math.floor((day - new Date(d.getFullYear(), 0, 0)) / 864e5), maxE = 45 + 23.44 * Math.sin(2 * Math.PI * (doy - 81) / 365);
    var t = d.getTime(), e, f;
    if (t >= rise && t <= set){ f = (t - rise) / (set - rise); e = Math.sin(Math.PI * f) * maxE; }
    else { var m = t < rise ? (rise - t) / 60000 : (t - set) / 60000; e = -Math.min(m / 6, 40);
      var nl = 1440 - (set - rise) / 60000; f = t > set ? (t - set) / 60000 / nl : 1 - (rise - t) / 60000 / nl; }
    return {elev: e, day: t >= rise && t <= set, frac: clamp(f, 0, 1)};
  };
  var KEYS = [[-18, '#030716', '#0a1130', '#121a40'], [-10, '#050a24', '#141a4e', '#2e2563'], [-4, '#101c55', '#3d3a8a', '#b5627e'],
    [0, '#23397f', '#a35d8c', '#ff965a'], [5, '#2a5ab4', '#6f86cc', '#ffbe7d'], [12, '#1d55b8', '#3577d0', '#79b2ea'], [30, '#1a4fae', '#2f74cf', '#6aa8e6']];
  var WXF = {sun:[0, 1, 0], moon:[0, 1, 0], partly:[.25, .95, .45], cloud:[.6, .82, .85], fog:[.7, .88, .6], rain:[.72, .68, .9], storm:[.8, .55, .95], snow:[.6, .92, .8], wind:[.2, .95, .3]};
  /* elev : hauteur du soleil ; cond : sun, partly, cloud, fog, rain, storm, snow, wind */
  V.sky = function(info, cond){
    var e = clamp(info.elev, -18, 30), i = 0;
    while (i < KEYS.length - 2 && e > KEYS[i + 1][0]) i++;
    var a = KEYS[i], b = KEYS[i + 1], t = clamp((e - a[0]) / (b[0] - a[0]), 0, 1);
    var c = [mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t)], w = WXF[cond] || WXF.sun;
    if (w[0]) c = [grey(c[0], w[0], w[1]), grey(c[1], w[0], w[1]), grey(c[2], w[0], w[1])];
    var night = clamp((-e - 2) / 8, 0, 1);
    return {top: c[0], mid: c[1], hor: c[2], night: night,
      stars: night * (cond === 'partly' ? .55 : w[2] > .5 ? .1 : 1), clouds: w[2], rain: cond === 'rain' || cond === 'storm',
      glow: clamp(1 - Math.abs(e) / 9, 0, 1) * (1 - w[0]), sun: info.day && w[0] < .7, frac: info.frac,
      shade: clamp(e / 25, 0, 1) * .35 + .08, elev: e};
  };
  /* dessine le ciel dans un conteneur créé par skyBuild */
  V.skyBuild = function(el, n, opt){
    var h = '<i class="vsl"></i><i class="vsl"></i><div class="vstars">', i;
    for (i = 0; i < n; i++){
      var x = (i * 47.3 + 13) % 100, y = (i * 29.7 + 7) % 62, s = 1 + (i % 3) * .6, d = 2 + (i % 5) * .7;
      h += '<i style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%;width:' + s + 'px;height:' + s + 'px;-webkit-animation-duration:' + d + 's;animation-duration:' + d + 's;-webkit-animation-delay:-' + (i % 7) + 's;animation-delay:-' + (i % 7) + 's"></i>';
    }
    h += '<b class="vshoot"></b></div><i class="vsun"></i><i class="vmoon"></i><div class="vclouds">';
    for (i = 0; i < 4; i++) h += '<i class="vcl" style="top:' + [6, 18, 30, 12][i] + '%;-webkit-animation-duration:' + [140, 190, 230, 170][i] + 's;animation-duration:' + [140, 190, 230, 170][i] + 's;-webkit-animation-delay:-' + [20, 90, 150, 60][i] + 's;animation-delay:-' + [20, 90, 150, 60][i] + 's"></i>';
    h += '</div>';
    if (opt && opt.rain){ h += '<div class="vrain">'; for (i = 0; i < 36; i++) h += '<i style="left:' + ((i * 37) % 100) + '%;-webkit-animation-delay:-' + (i * .13).toFixed(2) + 's;animation-delay:-' + (i * .13).toFixed(2) + 's"></i>'; h += '</div>'; }
    h += '<i class="vshade"></i><i class="vfoot"></i>';
    el.className = 'vsky'; el.innerHTML = h; el._cur = 0;
  };
  V.skyPaint = function(el, k){
    var L = el.querySelectorAll('.vsl'), nx = L[el._cur ? 0 : 1], old = L[el._cur], sx, sy;
    sx = 8 + 84 * k.frac; sy = 78 - Math.sin(Math.PI * k.frac) * 58;
    var g = k.glow > .05 ? rgba('#ffb070', (k.glow * .75).toFixed(2)) : 'rgba(0,0,0,0)';
    var lin = k.top + ' 0%,' + k.mid + ' 58%,' + k.hor + ' 100%';
    nx.style.backgroundImage = '-webkit-radial-gradient(' + sx.toFixed(0) + '% 100%,circle,' + g + ' 0,rgba(0,0,0,0) 55%),-webkit-linear-gradient(top,' + lin + ')';
    nx.style.backgroundImage = 'radial-gradient(circle at ' + sx.toFixed(0) + '% 100%,' + g + ' 0,rgba(0,0,0,0) 55%),linear-gradient(180deg,' + lin + ')';
    nx.style.backgroundColor = k.mid;
    nx.className = 'vsl on'; old.className = 'vsl'; el._cur = el._cur ? 0 : 1;
    el.querySelector('.vstars').style.opacity = k.stars.toFixed(2);
    var sun = el.querySelector('.vsun'), moon = el.querySelector('.vmoon');
    sun.style.left = moon.style.left = sx.toFixed(1) + '%'; sun.style.top = moon.style.top = sy.toFixed(1) + '%';
    sun.style.opacity = k.sun ? (k.elev < 4 ? .75 : 1) : 0;
    moon.style.opacity = !k.sun && k.night > .3 && k.clouds < .7 ? .9 : 0;
    var cl = el.querySelector('.vclouds'); cl.style.opacity = (k.clouds * (k.night > .5 ? .45 : .85)).toFixed(2);
    var r = el.querySelector('.vrain'); if (r) r.style.display = k.rain ? 'block' : 'none';
    el.querySelector('.vshade').style.opacity = k.shade.toFixed(2);
    el.setAttribute('data-night', k.night > .5 ? '1' : '0');
  };
  /* étoile filante de temps en temps (seulement si le ciel est étoilé) */
  V.skyShoot = function(el){
    var s = el.querySelector('.vshoot'), st = el.querySelector('.vstars');
    if (!s || parseFloat(st.style.opacity || 0) < .5) return;
    s.style.left = (20 + Math.random() * 50).toFixed(0) + '%'; s.style.top = (5 + Math.random() * 25).toFixed(0) + '%';
    s.className = 'vshoot'; void s.offsetWidth; s.className = 'vshoot go';
  };

  /* ---------- messages d'accueil ---------- */
  function slot(h){ return h >= 5 && h < 12 ? 0 : h >= 12 && h < 18 ? 1 : h >= 18 && h < 23 ? 2 : 3; }
  V.learn = function(store, id){
    if (!id) return; var hb = store.get('habits', {}) || {}, k = slot(new Date().getHours());
    hb[id] = hb[id] || [0, 0, 0, 0]; hb[id][k]++; store.set('habits', hb);
  };
  V.fav = function(store, h){
    var hb = store.get('habits', {}) || {}, k = slot(h), best = null, n = 1;
    for (var id in hb) if (hb.hasOwnProperty(id) && hb[id][k] > n && id !== 'Home'){ best = id; n = hb[id][k]; }
    return best;
  };
  V.firstName = function(n){ n = String(n || '').replace(/[._-]+/g, ' ').replace(/^\s+|\s+$/g, '').split(/\s+/)[0] || ''; return n ? n.charAt(0).toUpperCase() + n.slice(1) : ''; };
  /* c : {name, h, playing:{name,kind}, fav:{name,kind}, temp, cond, next:{t,txt}} ; kind : game, video, music, home */
  V.greet = function(c){
    var h = c.h, late = h >= 23 || h < 5;
    var hello = late ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir', L = [];
    var p = c.playing, f = c.fav;
    if (p && p.kind !== 'home') L.push(p.kind === 'game' ? 'Bonne partie sur ' + p.name + ' !' : p.kind === 'music' ? 'Bonne écoute sur ' + p.name + ' !' : 'Bon visionnage sur ' + p.name + ' !');
    else if (f && !late) L.push(f.kind === 'game' ? 'Prêt pour une partie de ' + f.name + ' ?' : f.kind === 'music' ? 'Un peu de musique sur ' + f.name + ' ?' : (h >= 18 ? 'Un épisode sur ' : 'Une petite vidéo sur ') + f.name + ' ?');
    if (c.next) L.push('À ' + c.next.t + ' : ' + c.next.txt);
    var t = typeof c.temp === 'number' ? Math.round(c.temp) : null;
    if (c.cond === 'rain' || c.cond === 'storm') L.push(c.cond === 'storm' ? 'Orage dehors : bien au chaud dans ta chambre.' : 'Il pleut dehors, parfait pour rester au chaud.');
    else if (c.cond === 'snow') L.push('Il neige dehors !');
    else if (t !== null && t <= 3) L.push('Il fait ' + t + '° dehors, couvre-toi si tu sors.');
    else if (t !== null && t >= 22 && c.cond === 'sun' && h >= 9 && h < 19) L.push('Grand soleil et ' + t + '° dehors !');
    if (late) L.push('Il se fait tard, pense à dormir.');
    else if (!L.length) L.push(h < 10 ? 'Bien dormi ? Belle journée à toi.' : h < 12 ? 'Belle matinée à toi.' : h < 18 ? 'Ta chambre est prête.' : 'La soirée commence, installe-toi.');
    return {hello: hello + (c.name ? ' ' + c.name : ''), lines: L};
  };

  /* ---------- jaquette : couleurs dominantes + version minuscule (fond flou) ---------- */
  V.palette = function(url, cb){
    var done = false;
    function fin(r){ if (!done){ done = true; cb(r); } }
    function go(cors){
      var img = new Image();
      if (cors) img.crossOrigin = 'anonymous';
      img.onload = function(){
        try {
          var cv = document.createElement('canvas'); cv.width = cv.height = 20;
          var x = cv.getContext('2d'); x.drawImage(img, 0, 0, 20, 20);
          var d = x.getImageData(0, 0, 20, 20).data, bins = [], i, tot = [0, 0, 0, 0];
          for (i = 0; i < 12; i++) bins.push([0, 0, 0, 0]);
          for (i = 0; i < d.length; i += 4){
            var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), s = mx ? (mx - mn) / mx : 0, hh = 0;
            tot[0] += d[i]; tot[1] += d[i + 1]; tot[2] += d[i + 2]; tot[3]++;
            if (mx - mn < .08 || mx < .18) continue;
            if (mx === r) hh = ((g - b) / (mx - mn) + 6) % 6; else if (mx === g) hh = (b - r) / (mx - mn) + 2; else hh = (r - g) / (mx - mn) + 4;
            var k = Math.floor(hh * 2) % 12, wgt = s * s * (mx > .95 ? .7 : 1);
            bins[k][0] += d[i] * wgt; bins[k][1] += d[i + 1] * wgt; bins[k][2] += d[i + 2] * wgt; bins[k][3] += wgt;
          }
          var order = bins.map ? bins.slice() : bins; order.sort(function(p, q){ return q[3] - p[3]; });
          var avg = hex([tot[0] / tot[3], tot[1] / tot[3], tot[2] / tot[3]]);
          function col(bn){ return hex([bn[0] / bn[3], bn[1] / bn[3], bn[2] / bn[3]]); }
          var c1 = order[0][3] > 2 ? col(order[0]) : avg, c2 = order[1][3] > 1.2 ? col(order[1]) : V.darken(c1, .45);
          var t = document.createElement('canvas'); t.width = 24; t.height = 16; t.getContext('2d').drawImage(img, 0, 0, 24, 16);
          fin({c1: c1, c2: c2, avg: avg, tiny: t.toDataURL('image/jpeg', .85), url: url});
        } catch(e){ fin({url: url}); }
      };
      img.onerror = function(){ if (cors) go(false); else fin(null); };
      img.src = url;
    }
    go(true);
    setTimeout(function(){ fin(null); }, 15000);
  };
  /* une couleur assez claire pour du texte et des boutons sur fond sombre */
  V.accent = function(c){ var l = rgb(c), y = l[0] * .3 + l[1] * .59 + l[2] * .11; return y < 140 ? mix(c, '#ffffff', (140 - y) / 200) : c; };

  /* ---------- plan 3D de la chambre ---------- */
  V.PLAN = '<svg class="vplan" viewBox="50 -18 558 464" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs> <linearGradient id="vfl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2f52"/><stop offset="1" stop-color="#241d36"/></linearGradient> <linearGradient id="vwa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e3570"/><stop offset="1" stop-color="#1f2450"/></linearGradient> <linearGradient id="vwb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#252b60"/><stop offset="1" stop-color="#191d42"/></linearGradient> <linearGradient id="vsky" x1="0" y1="0" x2="0" y2="1"><stop id="vsk0" offset="0" stop-color="#0a1130"/><stop id="vsk1" offset=".6" stop-color="#1a1f55"/><stop id="vsk2" offset="1" stop-color="#3a2a6a"/></linearGradient> <linearGradient id="vtv" x1="0" y1="0" x2="1" y2="1"><stop id="vtv0" offset="0" stop-color="#107c10"/><stop id="vtv1" offset="1" stop-color="#0b2614"/></linearGradient> <radialGradient id="vgr"><stop id="vgr0" offset="0" stop-color="#a77bff" stop-opacity="1"/><stop id="vgr2" offset=".55" stop-color="#a77bff" stop-opacity=".45"/><stop id="vgr1" offset="1" stop-color="#a77bff" stop-opacity="0"/></radialGradient> <radialGradient id="vgc"><stop id="vgc0" offset="0" stop-color="#ffcf8a" stop-opacity=".8"/><stop id="vgc1" offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient> <radialGradient id="vgb"><stop id="vgb0" offset="0" stop-color="#f4f6ff" stop-opacity=".75"/><stop id="vgb1" offset="1" stop-color="#f4f6ff" stop-opacity="0"/></radialGradient> <radialGradient id="vgt"><stop id="vgt0" offset="0" stop-color="#3fdc8a" stop-opacity=".55"/><stop id="vgt1" offset="1" stop-color="#3fdc8a" stop-opacity="0"/></radialGradient> <linearGradient id="vtvsh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="vtvc"><path d="M409.8 143.3 L483.4 185.8 L483.4 138.2 L409.8 95.7Z"/></clipPath> </defs><path d="M56.2 264.8 L358.9 439.6 L358.9 426 L56.2 251.2Z" fill="#141127"/><path d="M602.7 298.8 L358.9 439.6 L358.9 426 L602.7 285.2Z" fill="#0d0b1c"/><path d="M300 120 L594.4 290 L358.9 426 L64.4 256Z" fill="url(#vfl)"/><path d="M329.4 137L93.9 273" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/><path d="M358.9 154L123.3 290" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/><path d="M388.3 171L152.8 307" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/><path d="M417.8 188L182.2 324" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/><path d="M447.2 205L211.7 341" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/><path d="M476.7 222L241.1 358" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/><path d="M506.1 239L270.6 375" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/><path d="M535.6 256L300 392" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/><path d="M565 273L329.4 409" stroke="#ffffff" stroke-opacity=".035" stroke-width="1"/><path d="M300 120 L594.4 290 L594.4 167.6 L300 -2.4Z" fill="url(#vwa)"/><path d="M300 120 L64.4 256 L64.4 133.6 L300 -2.4Z" fill="url(#vwb)"/><path d="M300 -11.9 L602.7 162.8 L594.4 167.6 L300 -2.4 L64.4 133.6 L56.2 128.8Z" fill="#3a4280"/><path d="M602.7 285.2 L594.4 290 L594.4 167.6 L602.7 162.8Z" fill="#141836"/><path d="M56.2 251.2 L64.4 256 L64.4 133.6 L56.2 128.8Z" fill="#20264f"/><path d="M300 120 L594.4 290 L594.4 283.9 L300 113.9Z" fill="#30376a"/><path d="M300 120 L64.4 256 L64.4 249.9 L300 113.9Z" fill="#262c58"/><path d="M300 120 L594.4 290 L576.8 300.2 L300 140.4 L82.1 266.2 L64.4 256Z" fill="#000" opacity=".18"/><path d="M300 120L300 -2.4" stroke="#ffffff" stroke-opacity=".08" stroke-width="1"/><path d="M326.5 91.1 L385.4 125.1 L385.4 63.9 L326.5 29.9Z" fill="url(#vsky)" stroke="#8a93c8" stroke-opacity=".5" stroke-width="2"/><g id="vstars" fill="#fff"><circle cx="335.3" cy="45.2" r="1"/><circle cx="350.1" cy="63.9" r=".8"/><circle cx="367.7" cy="60.5" r="1.1"/><circle cx="376.6" cy="86" r=".7"/><circle cx="341.2" cy="72.4" r=".7"/><circle cx="361.8" cy="92.8" r=".9"/></g><path d="M355.9 108.1L355.9 46.9M326.5 60.5L385.4 94.5" stroke="#8a93c8" stroke-opacity=".5" stroke-width="2"/><path d="M335.3 208.4 L464.9 283.2 L388.3 327.4 L258.8 252.6Z" fill="#3a2f5c" opacity=".7"/><path d="M336.8 216.1 L451.6 282.4 L386.9 319.8 L272 253.5Z" fill="none" stroke="#8b7bd8" stroke-opacity=".35" stroke-width="1.2"/><ellipse class="vglow" id="vg-ruban" cx="311.8" cy="317.2" rx="185" ry="82" fill="url(#vgr)"/><ellipse class="vglow" id="vg-chevet" cx="288.2" cy="89.4" rx="70" ry="60" fill="url(#vgc)"/><ellipse class="vglow" id="vg-bureau" cx="544.4" cy="230.5" rx="70" ry="58" fill="url(#vgb)"/><ellipse class="vglow" id="vg-tv" cx="441.3" cy="133.6" rx="105" ry="70" fill="url(#vgt)"/><path d="M235.2 103 L194 126.8 L194 79.2 L235.2 55.4Z" fill="#ff6fa8" opacity=".55"/><path d="M230.8 100.5 L198.4 119.2 L198.4 81.8 L230.8 63Z" fill="#5b3fb0" opacity=".7"/><g class="vo" data-o="chevet"><path d="M294.1 96.2 L320.6 111.5 L294.1 126.8 L267.6 111.5Z" fill="#856e5d"/><path d="M267.6 138.7 L294.1 154 L294.1 126.8 L267.6 111.5Z" fill="#57402f"/><path d="M320.6 138.7 L294.1 154 L294.1 126.8 L320.6 111.5Z" fill="#423023"/><path d="M294.1 103 L302.9 108.1 L294.1 113.2 L285.3 108.1Z" fill="#dfdace"/><path d="M285.3 111.5 L294.1 116.6 L294.1 113.2 L285.3 108.1Z" fill="#b1aca0"/><path d="M302.9 111.5 L294.1 116.6 L294.1 113.2 L302.9 108.1Z" fill="#868279"/><path d="M283.1 101.8L305.1 101.8L301.1 86.8L287.1 86.8Z" fill="#ffe2b0" class="vbulb" id="vb-chevet"/><path d="M294.1 101.8L294.1 108.1" stroke="#d9d2c4" stroke-width="2"/></g><g class="vo" data-o="lit"><path d="M261.7 123.4 L335.3 165.9 L220.5 232.2 L146.9 189.7Z" fill="#5e597c"/><path d="M146.9 208.4 L220.5 250.9 L220.5 232.2 L146.9 189.7Z" fill="#302b4e"/><path d="M335.3 184.6 L220.5 250.9 L220.5 232.2 L335.3 165.9Z" fill="#24203b"/><path d="M261.7 87.7 L269.1 91.9 L154.2 158.2 L146.9 154Z" fill="#6a6191"/><path d="M146.9 189.7 L154.2 193.9 L154.2 158.2 L146.9 154Z" fill="#3c3364"/><path d="M269.1 127.7 L154.2 193.9 L154.2 158.2 L269.1 91.9Z" fill="#2d274b"/><path d="M266.1 119.2 L330.9 156.6 L222 219.4 L157.2 182Z" fill="#eceaf4"/><path d="M157.2 192.2 L222 229.6 L222 219.4 L157.2 182Z" fill="#bebcc6"/><path d="M330.9 166.8 L222 229.6 L222 219.4 L330.9 156.6Z" fill="#8f8e96"/><path d="M288.2 126.8 L333.9 153.2 L222 217.8 L176.3 191.4Z" fill="#8679eb"/><path d="M176.3 194.8 L222 221.2 L222 217.8 L176.3 191.4Z" fill="#584bbd"/><path d="M333.9 156.6 L222 221.2 L222 217.8 L333.9 153.2Z" fill="#42398f"/><path d="M263.2 117.5 L279.4 126.8 L238.2 150.6 L222 141.2Z" fill="#f5f4ff"/><path d="M222 148.1 L238.2 157.4 L238.2 150.6 L222 141.2Z" fill="#c8c6d1"/><path d="M279.4 133.6 L238.2 157.4 L238.2 150.6 L279.4 126.8Z" fill="#97969e"/><path d="M207.2 149.8 L223.4 159.1 L182.2 182.9 L166 173.6Z" fill="#f5f4ff"/><path d="M166 180.3 L182.2 189.7 L182.2 182.9 L166 173.6Z" fill="#c8c6d1"/><path d="M223.4 165.9 L182.2 189.7 L182.2 182.9 L223.4 159.1Z" fill="#97969e"/></g><g class="vo" data-o="tv"><path d="M403.1 159.1 L491.4 210.1 L467.8 223.7 L379.5 172.7Z" fill="#515466"/><path d="M379.5 196.5 L467.8 247.5 L467.8 223.7 L379.5 172.7Z" fill="#242638"/><path d="M491.4 233.9 L467.8 247.5 L467.8 223.7 L491.4 210.1Z" fill="#1b1d2a"/><path d="M410.4 88.6 L489.9 134.5 L486.4 136.5 L406.9 90.6Z" fill="#3b3d48"/><path d="M406.9 145 L486.4 190.9 L486.4 136.5 L406.9 90.6Z" fill="#0d0f1a"/><path d="M489.9 188.9 L486.4 190.9 L486.4 136.5 L489.9 134.5Z" fill="#0a0b13"/><path d="M409.8 143.3 L483.4 185.8 L483.4 138.2 L409.8 95.7Z" fill="#0a0c16" id="vtv-off"/><g id="vtv-on" opacity="0"><path d="M409.8 143.3 L483.4 185.8 L483.4 138.2 L409.8 95.7Z" fill="url(#vtv)"/><g clip-path="url(#vtvc)"><image id="vtv-img" x="0" y="0" width="1.785" height="1" preserveAspectRatio="xMidYMid slice" transform="matrix(41.2211 23.8029 0 47.6 409.8 95.7)" style="display:none"/></g><path d="M409.8 143.3 L483.4 185.8 L483.4 138.2 L409.8 95.7Z" fill="url(#vtvsh)"/></g><path d="M409.8 143.3 L483.4 185.8 L461.4 125.4 L423.1 103.3Z" fill="#ffffff" opacity=".05"/></g><g class="vo" data-o="xbox"><path d="M466.4 156.6 L481.1 165.1 L466.4 173.6 L451.6 165.1Z" fill="#22252c"/><path d="M451.6 207.6 L466.4 216.1 L466.4 173.6 L451.6 165.1Z" fill="#121317"/><path d="M481.1 207.6 L466.4 216.1 L466.4 173.6 L481.1 165.1Z" fill="#0d0e11"/><path d="M466.4 159.9 L475.2 165.1 L466.4 170.1 L457.5 165.1Z" fill="#0b0c0f"/><circle id="vxb-led" cx="478.1" cy="173.6" r="2.2" fill="#3a3d44"/></g><g class="vo" data-o="bureau"><path d="M532.6 230.5 L588.6 262.8 L553.2 283.2 L497.3 250.9Z" fill="#9f846f"/><path d="M497.3 253.6 L553.2 285.9 L553.2 283.2 L497.3 250.9Z" fill="#715641"/><path d="M588.6 265.5 L553.2 285.9 L553.2 283.2 L588.6 262.8Z" fill="#554131"/><path d="M532.6 234.9 L537 237.5 L504.6 256.2 L500.2 253.6Z" fill="#77675a"/><path d="M500.2 278.1 L504.6 280.6 L504.6 256.2 L500.2 253.6Z" fill="#49392c"/><path d="M537 261.9 L504.6 280.6 L504.6 256.2 L537 237.5Z" fill="#372b21"/><path d="M582.7 263.8 L587.1 266.4 L554.7 285.1 L550.3 282.5Z" fill="#77675a"/><path d="M550.3 307 L554.7 309.6 L554.7 285.1 L550.3 282.5Z" fill="#49392c"/><path d="M587.1 290.9 L554.7 309.6 L554.7 285.1 L587.1 266.4Z" fill="#372b21"/><path d="M545.9 217.8 L575.3 234.8 L572.4 236.4 L542.9 219.4Z" fill="#2a2d3a"/><path d="M542.9 243.2 L572.4 260.2 L572.4 236.4 L542.9 219.4Z" fill="#111219"/><path d="M575.3 258.5 L572.4 260.2 L572.4 236.4 L575.3 234.8Z" fill="#0d0e13"/><path d="M544.4 242.4 L570.9 257.7 L570.9 237.3 L544.4 222Z" fill="#2b3a7a" id="vpc"/><path d="M554.7 248.3 L563.5 253.5 L557.6 256.9 L548.8 251.7Z" fill="#50525d"/><path d="M548.8 253.4 L557.6 258.6 L557.6 256.9 L548.8 251.7Z" fill="#22242f"/><path d="M563.5 255.2 L557.6 258.6 L557.6 256.9 L563.5 253.5Z" fill="#1a1b23"/><path d="M529.7 240.7L529.7 218.6" stroke="#c9c3d8" stroke-width="2"/><path d="M520.7 224.6L538.7 224.6L529.7 212.6Z" fill="#f4f6ff" class="vbulb" id="vb-bureau"/><path d="M506.1 274.7 L529.7 288.3 L506.1 301.9 L482.6 288.3Z" fill="#5e6179"/><path d="M482.6 291.7 L506.1 305.3 L506.1 301.9 L482.6 288.3Z" fill="#30334b"/><path d="M529.7 291.7 L506.1 305.3 L506.1 301.9 L529.7 288.3Z" fill="#242739"/><path d="M485.5 257.7 L509.1 271.3 L504.6 273.9 L481.1 260.2Z" fill="#5e6179"/><path d="M481.1 289.2 L504.6 302.8 L504.6 273.9 L481.1 260.2Z" fill="#30334b"/><path d="M509.1 300.2 L504.6 302.8 L504.6 273.9 L509.1 271.3Z" fill="#242739"/></g><g class="vo" data-o="canape"><path d="M447.2 290 L494.3 317.2 L394.2 375 L347.1 347.8Z" fill="#786b9f"/><path d="M347.1 364.8 L394.2 392 L394.2 375 L347.1 347.8Z" fill="#4a3d71"/><path d="M494.3 334.2 L394.2 392 L394.2 375 L494.3 317.2Z" fill="#382e55"/><path d="M476.7 279.8 L494.3 290 L394.2 347.8 L376.6 337.6Z" fill="#786b9f"/><path d="M376.6 364.8 L394.2 375 L394.2 347.8 L376.6 337.6Z" fill="#4a3d71"/><path d="M494.3 317.2 L394.2 375 L394.2 347.8 L494.3 290Z" fill="#382e55"/><path d="M241.1 239 L388.3 324 L347.1 347.8 L199.9 262.8Z" fill="#786b9f"/><path d="M199.9 279.8 L347.1 364.8 L347.1 347.8 L199.9 262.8Z" fill="#4a3d71"/><path d="M388.3 341 L347.1 364.8 L347.1 347.8 L388.3 324Z" fill="#382e55"/><path d="M217.6 225.4 L411.9 337.6 L394.2 347.8 L199.9 235.6Z" fill="#786b9f"/><path d="M199.9 262.8 L394.2 375 L394.2 347.8 L199.9 235.6Z" fill="#4a3d71"/><path d="M411.9 364.8 L394.2 375 L394.2 347.8 L411.9 337.6Z" fill="#382e55"/><path d="M241.1 223.7 L255.8 232.2 L232.3 245.8 L217.6 237.3Z" fill="#786b9f"/><path d="M217.6 252.6 L232.3 261.1 L232.3 245.8 L217.6 237.3Z" fill="#4a3d71"/><path d="M255.8 247.5 L232.3 261.1 L232.3 245.8 L255.8 232.2Z" fill="#382e55"/><path d="M447.2 274.7 L476.7 291.7 L464.9 298.5 L435.4 281.5Z" fill="#786b9f"/><path d="M435.4 296.8 L464.9 313.8 L464.9 298.5 L435.4 281.5Z" fill="#4a3d71"/><path d="M476.7 307 L464.9 313.8 L464.9 298.5 L476.7 291.7Z" fill="#382e55"/><path d="M255.8 244.1 L295.6 267.1 L276.4 278.1 L236.7 255.1Z" fill="#8779b3"/><path d="M236.7 261.9 L276.4 284.9 L276.4 278.1 L236.7 255.1Z" fill="#594b85"/><path d="M295.6 273.9 L276.4 284.9 L276.4 278.1 L295.6 267.1Z" fill="#433965"/><path d="M300 269.6 L339.8 292.6 L320.6 303.6 L280.9 280.6Z" fill="#8779b3"/><path d="M280.9 287.4 L320.6 310.4 L320.6 303.6 L280.9 280.6Z" fill="#594b85"/><path d="M339.8 299.4 L320.6 310.4 L320.6 303.6 L339.8 292.6Z" fill="#433965"/><path d="M344.2 295.1 L383.9 318.1 L364.8 329.1 L325 306.1Z" fill="#8779b3"/><path d="M325 312.9 L364.8 335.9 L364.8 329.1 L325 306.1Z" fill="#594b85"/><path d="M383.9 324.9 L364.8 335.9 L364.8 329.1 L383.9 318.1Z" fill="#433965"/><path d="M435.4 293.4 L460.5 307.8 L416.3 333.3 L391.3 318.9Z" fill="#8779b3"/><path d="M391.3 325.7 L416.3 340.1 L416.3 333.3 L391.3 318.9Z" fill="#594b85"/><path d="M460.5 314.6 L416.3 340.1 L416.3 333.3 L460.5 307.8Z" fill="#433965"/><path d="M258.8 247.5 L270.6 254.3 L263.2 258.6 L251.4 251.8Z" fill="#df9fbe"/><path d="M251.4 263.6 L263.2 270.4 L263.2 258.6 L251.4 251.8Z" fill="#b17190"/><path d="M270.6 266.2 L263.2 270.4 L263.2 258.6 L270.6 254.3Z" fill="#86566d"/><path d="M386.9 316.4 L398.6 323.1 L386.9 329.9 L375.1 323.2Z" fill="#9fc4df"/><path d="M375.1 335.1 L386.9 341.8 L386.9 329.9 L375.1 323.2Z" fill="#7196b1"/><path d="M398.6 335.1 L386.9 341.8 L386.9 329.9 L398.6 323.1Z" fill="#567286"/></g><path d="M113 217.8 L127.7 226.2 L113 234.8 L98.3 226.2Z" fill="#ce916a"/><path d="M98.3 244.9 L113 253.4 L113 234.8 L98.3 226.2Z" fill="#a0643c"/><path d="M127.7 244.9 L113 253.4 L113 234.8 L127.7 226.2Z" fill="#794b2d"/><g fill="#3fae6a"><ellipse cx="104" cy="206.9" rx="10" ry="5" transform="rotate(-35 104 206.9)"/><ellipse cx="122" cy="204.9" rx="11" ry="5" transform="rotate(30 122 204.9)"/><ellipse cx="113" cy="196.9" rx="5" ry="12" transform="rotate(0 113 196.9)"/><ellipse cx="108" cy="198.9" rx="4" ry="10" transform="rotate(-20 108 198.9)"/><ellipse cx="119" cy="198.9" rx="4" ry="10" transform="rotate(25 119 198.9)"/></g><path d="M358.9 228.8 L417.8 262.8 L382.4 283.2 L323.6 249.2Z" fill="#4a4468"/><path d="M323.6 262.8 L382.4 296.8 L382.4 283.2 L323.6 249.2Z" fill="#262237"/><path d="M417.8 276.4 L382.4 296.8 L382.4 283.2 L417.8 262.8Z" fill="#1d1a2a"/><path d="M364.8 243.1 L376.6 249.9 L367.7 255 L355.9 248.2Z" fill="#eceaf4"/><path d="M355.9 250.9 L367.7 257.7 L367.7 255 L355.9 248.2Z" fill="#bebcc6"/><path d="M376.6 252.6 L367.7 257.7 L367.7 255 L376.6 249.9Z" fill="#8f8e96"/></svg>';
  V.ANCHOR = {"chevet": [43.7, 22.0], "lit": [35.3, 37.8], "tv": [71.1, 27.6], "xbox": [74.6, 37.6], "bureau": [88.6, 52.1], "canape": [46.9, 61.2]};
  function $q(root, id){ return root.querySelector('#' + id); }
  function op(el, v){ if (el) el.style.opacity = v; }
  function stop(root, id, c){ var s = $q(root, id); if (s) s.setAttribute('stop-color', c); }
  /* st : {tv, xbox, art:[c1,c2], pic, lights:{chevet,bureau,ruban:{on,color,lvl}}, sky:{top,mid,hor,stars}} */
  V.planPaint = function(root, st){
    var L = st.lights || {};
    each(['chevet', 'bureau', 'ruban'], function(k){
      var l = L[k] || {}, c = l.color || '#ffcf8a', on = !!l.on, gid = {chevet:'vgc', bureau:'vgb', ruban:'vgr'}[k];
      stop(root, gid + '0', c); stop(root, gid + '1', c); stop(root, gid + '2', c);
      op($q(root, 'vg-' + k), on ? (.45 + .55 * ((l.lvl || 70) / 100)).toFixed(2) : 0);
      var b = $q(root, 'vb-' + k); if (b) b.setAttribute('fill', on ? V.lighten(c, .5) : '#5b5f75');
    });
    var tv = !!st.tv;
    op($q(root, 'vtv-on'), tv ? 1 : 0); op($q(root, 'vg-tv'), tv ? .9 : 0);
    var a = st.art || ['#107c10', '#0b2614'];
    stop(root, 'vtv0', a[0]); stop(root, 'vtv1', a[1]); stop(root, 'vgt0', V.accent(a[0])); stop(root, 'vgt1', V.accent(a[0]));
    var im = $q(root, 'vtv-img');
    if (im){ var u = st.pic || ''; if (im._u !== u){ im._u = u; if (u) im.setAttributeNS('http://www.w3.org/1999/xlink', 'href', u); im.style.display = u ? '' : 'none'; } }
    var led = $q(root, 'vxb-led'); if (led) led.setAttribute('fill', st.xbox ? '#7dff9a' : '#3a3d44');
    var pc = $q(root, 'vpc'); if (pc) pc.setAttribute('fill', st.xbox ? '#3d5bd8' : '#1c2346');
    if (st.sky){ stop(root, 'vsk0', st.sky.top); stop(root, 'vsk1', st.sky.mid); stop(root, 'vsk2', st.sky.hor); op($q(root, 'vstars'), st.sky.stars.toFixed(2)); }
  };
  /* petit rebond quand on touche un meuble */
  V.bounce = function(g){
    var t0 = Date.now(), raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame || function(f){ setTimeout(f, 16); };
    function f(){ var t = (Date.now() - t0) / 500; if (t >= 1){ g.setAttribute('transform', ''); return; }
      g.setAttribute('transform', 'translate(0 ' + (-Math.sin(t * Math.PI) * 9 * (1 - t * .5)).toFixed(2) + ')'); raf(f); }
    f();
  };
  /* bulle de commandes posée sur un meuble ; html : boutons avec data-va="action" */
  V.planPop = function(wrap, o, title, html, onAct){
    var old = wrap.querySelector('.vpop'); if (old) old.parentNode.removeChild(old);
    if (!o) return;
    var a = V.ANCHOR[o] || [50, 50], d = document.createElement('div');
    d.className = 'vpop' + (a[1] < 35 ? ' below' : '');
    d.style.left = clamp(a[0], 28, 72) + '%'; d.style.top = a[1] + '%';
    d.innerHTML = '<b>' + title + '</b><div class="vpb">' + html + '</div>';
    wrap.appendChild(d);
    /* la bulle reste entière dans le cadre */
    var W = wrap.offsetWidth, pw = d.offsetWidth;
    if (W && pw){ d.style.left = clamp(a[0] / 100 * W, pw / 2 + 6, Math.max(pw / 2 + 6, W - pw / 2 - 6)) + 'px'; }
    d.onclick = function(e){ var t = e.target; while (t && t !== d && !t.getAttribute('data-va')) t = t.parentNode;
      if (t && t !== d){ onAct(t.getAttribute('data-va')); } e.stopPropagation(); };
  };
  /* branche les touchers sur les meubles */
  /* zone de toucher élargie : un rectangle invisible derrière chaque meuble */
  V.planHit = function(wrap){
    if (wrap._hit) return; var gs = wrap.querySelectorAll('.vo'), ok = false;
    each(gs, function(g){ try { var b = g.getBBox(); if (!b.width) return; ok = true;
      var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', b.x - 4); r.setAttribute('y', b.y - 4); r.setAttribute('width', b.width + 8); r.setAttribute('height', b.height + 8); r.setAttribute('fill', 'rgba(0,0,0,0)');
      g.insertBefore(r, g.firstChild); } catch(e){} });
    wrap._hit = ok;
  };
  V.planBind = function(wrap, onTap){
    V.planHit(wrap);
    wrap.onclick = function(e){
      if (!wrap._hit){ V.planHit(wrap); }
      var t = e.target; while (t && t !== wrap && !(t.getAttribute && t.getAttribute('data-o'))) t = t.parentNode;
      if (!t || t === wrap){ V.planPop(wrap, null); return; }
      V.bounce(t); onTap(t.getAttribute('data-o'), t);
    };
  };

  /* ---------- styles communs (préfixés pour Android 4.4) ---------- */
  var css = [
    '.vsky{position:fixed;left:0;top:0;right:0;bottom:0;z-index:0;overflow:hidden;pointer-events:none}',
    '.vsl{position:absolute;left:0;top:0;right:0;bottom:0;opacity:0;-webkit-transition:opacity 4s ease;transition:opacity 4s ease}',
    '.vsl.on{opacity:1}',
    '.vstars{position:absolute;left:0;top:0;right:0;bottom:0;-webkit-transition:opacity 4s;transition:opacity 4s}',
    '.vstars i{position:absolute;border-radius:50%;background:#fff;box-shadow:0 0 4px rgba(255,255,255,.8);-webkit-animation:vtw 3s ease-in-out infinite alternate;animation:vtw 3s ease-in-out infinite alternate}',
    '@-webkit-keyframes vtw{from{opacity:.25}to{opacity:1}}@keyframes vtw{from{opacity:.25}to{opacity:1}}',
    '.vshoot{position:absolute;width:120px;height:2px;margin-left:-120px;opacity:0;background:#fff;background-image:-webkit-linear-gradient(left,rgba(255,255,255,0),#fff);background-image:linear-gradient(90deg,rgba(255,255,255,0),#fff);-webkit-transform:rotate(-25deg);transform:rotate(-25deg)}',
    '.vshoot.go{-webkit-animation:vsh 1.3s ease-in;animation:vsh 1.3s ease-in}',
    '@-webkit-keyframes vsh{0%{opacity:0;-webkit-transform:rotate(-25deg) translate3d(0,0,0)}15%{opacity:1}100%{opacity:0;-webkit-transform:rotate(-25deg) translate3d(-260px,0,0)}}',
    '@keyframes vsh{0%{opacity:0;transform:rotate(-25deg) translate3d(0,0,0)}15%{opacity:1}100%{opacity:0;transform:rotate(-25deg) translate3d(-260px,0,0)}}',
    '.vsun,.vmoon{position:absolute;width:160px;height:160px;margin:-80px 0 0 -80px;border-radius:50%;opacity:0;-webkit-transition:opacity 4s,left 60s linear,top 60s linear;transition:opacity 4s,left 60s linear,top 60s linear}',
    '.vsun{background-image:-webkit-radial-gradient(50% 50%,circle,#fffbe8 0,#fff1c4 14%,rgba(255,214,140,.55) 22%,rgba(255,190,110,0) 62%);background-image:radial-gradient(circle,#fffbe8 0,#fff1c4 14%,rgba(255,214,140,.55) 22%,rgba(255,190,110,0) 62%)}',
    '.vmoon{background-image:-webkit-radial-gradient(50% 50%,circle,#f4f2ff 0,#e6e4f6 11%,rgba(200,205,255,.22) 16%,rgba(160,170,255,0) 50%);background-image:radial-gradient(circle,#f4f2ff 0,#e6e4f6 11%,rgba(200,205,255,.22) 16%,rgba(160,170,255,0) 50%)}',
    '.vclouds{position:absolute;left:0;top:0;right:0;bottom:0;-webkit-transition:opacity 4s;transition:opacity 4s}',
    '.vcl{position:absolute;left:0;width:300px;height:110px;-webkit-animation:vcl 160s linear infinite;animation:vcl 160s linear infinite;',
    'background-image:-webkit-radial-gradient(30% 60%,circle,rgba(255,255,255,.75) 0,rgba(255,255,255,0) 40%),-webkit-radial-gradient(55% 45%,circle,rgba(255,255,255,.8) 0,rgba(255,255,255,0) 45%),-webkit-radial-gradient(75% 65%,circle,rgba(255,255,255,.7) 0,rgba(255,255,255,0) 38%);',
    'background-image:radial-gradient(circle at 30% 60%,rgba(255,255,255,.75) 0,rgba(255,255,255,0) 40%),radial-gradient(circle at 55% 45%,rgba(255,255,255,.8) 0,rgba(255,255,255,0) 45%),radial-gradient(circle at 75% 65%,rgba(255,255,255,.7) 0,rgba(255,255,255,0) 38%)}',
    '@-webkit-keyframes vcl{from{-webkit-transform:translate3d(-320px,0,0)}to{-webkit-transform:translate3d(1400px,0,0)}}@keyframes vcl{from{transform:translate3d(-320px,0,0)}to{transform:translate3d(1400px,0,0)}}',
    '.vrain{position:absolute;left:0;top:0;right:0;bottom:0;display:none}',
    '.vrain i{position:absolute;top:-20%;width:1px;height:60px;background:rgba(190,215,255,.35);-webkit-animation:vrn .9s linear infinite;animation:vrn .9s linear infinite}',
    '@-webkit-keyframes vrn{to{-webkit-transform:translate3d(-30px,130vh,0)}}@keyframes vrn{to{transform:translate3d(-30px,130vh,0)}}',
    '.vshade{position:absolute;left:0;top:0;right:0;bottom:0;background:#050a1e}',
    '.vfoot{position:absolute;left:0;right:0;bottom:0;height:50%;background-image:-webkit-linear-gradient(top,rgba(6,8,26,0),rgba(6,8,26,.5));background-image:linear-gradient(180deg,rgba(6,8,26,0),rgba(6,8,26,.5))}',
    '.vplan{display:block;width:100%;height:auto;overflow:visible}',
    '.vplan .vo{cursor:pointer}',
    '.vplan .vglow{pointer-events:none;opacity:0;-webkit-transition:opacity .8s;transition:opacity .8s}',
    '.vplan #vtv-on{-webkit-transition:opacity .8s;transition:opacity .8s}',
    '.vpop{position:absolute;z-index:3;margin-top:-12px;padding:10px;border-radius:18px;white-space:nowrap;-webkit-transform:translate3d(-50%,-100%,0);transform:translate3d(-50%,-100%,0);',
    'background:rgba(22,26,60,.92);border:1px solid rgba(255,255,255,.25);box-shadow:0 14px 30px rgba(0,0,0,.5);text-align:center;-webkit-animation:vpop .45s cubic-bezier(.2,1.4,.4,1) both;animation:vpop .45s cubic-bezier(.2,1.4,.4,1) both}',
    '.vpop.below{margin-top:16px;-webkit-transform:translate3d(-50%,0,0);transform:translate3d(-50%,0,0)}',
    '.vpop .vsw{min-width:0;width:34px;height:34px;padding:0;border-radius:50%;border:2px solid rgba(255,255,255,.4);vertical-align:middle}',
    '.vpop button svg{vertical-align:middle}',
    '.vpop b{display:block;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#c3c9ee;margin:0 0 8px}',
    '.vpop button{min-width:44px;min-height:40px;margin:0 3px;padding:0 10px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.12);color:#fff;font-weight:600;font-size:15px}',
    '@-webkit-keyframes vpop{from{opacity:0;margin-top:0}}@keyframes vpop{from{opacity:0;margin-top:0}}',
    '.noanim .vstars i,.noanim .vcl,.noanim .vrain i,body.lowfx .vcl,body.lowfx .vstars i{-webkit-animation:none!important;animation:none!important}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);
})();
