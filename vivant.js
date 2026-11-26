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
  V.PLAN = '<svg class="vplan" viewBox="62 -18 547 457" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs> <linearGradient id="vfl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#77738f"/><stop offset="1" stop-color="#5a5674"/></linearGradient> <linearGradient id="vwa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f94bd"/><stop offset="1" stop-color="#a9adcf"/></linearGradient> <linearGradient id="vwb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a7fab"/><stop offset="1" stop-color="#9599c0"/></linearGradient> <linearGradient id="vtv" x1="0" y1="0" x2="1" y2="1"><stop id="vtv0" offset="0" stop-color="#107c10"/><stop id="vtv1" offset="1" stop-color="#0b2614"/></linearGradient> <radialGradient id="vgr"><stop id="vgr0" offset="0" stop-color="#a77bff" stop-opacity="1"/><stop id="vgr2" offset=".55" stop-color="#a77bff" stop-opacity=".45"/><stop id="vgr1" offset="1" stop-color="#a77bff" stop-opacity="0"/></radialGradient> <radialGradient id="vgc"><stop id="vgc0" offset="0" stop-color="#ffcf8a" stop-opacity=".85"/><stop id="vgc1" offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient> <radialGradient id="vgb"><stop id="vgb0" offset="0" stop-color="#f4f6ff" stop-opacity=".8"/><stop id="vgb1" offset="1" stop-color="#f4f6ff" stop-opacity="0"/></radialGradient> <radialGradient id="vgt"><stop id="vgt0" offset="0" stop-color="#3fdc8a" stop-opacity=".6"/><stop id="vgt1" offset="1" stop-color="#3fdc8a" stop-opacity="0"/></radialGradient> <linearGradient id="vtvsh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="vtvc"><path d="M333.6 96.5 L395.4 132.2 L395.4 87 L333.6 51.3Z"/></clipPath> </defs><path d="M68 258 L370.7 432.8 L370.7 419.2 L68 244.4Z" fill="#2a2740"/><path d="M602.7 298.8 L370.7 432.8 L370.7 419.2 L602.7 285.2Z" fill="#1d1b30"/><path d="M300 120 L594.4 290 L370.7 419.2 L76.2 249.2Z" fill="url(#vfl)"/><path d="M329.4 137L105.7 266.2" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M358.9 154L135.1 283.2" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M388.3 171L164.6 300.2" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M417.8 188L194 317.2" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M447.2 205L223.4 334.2" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M476.7 222L252.9 351.2" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M506.1 239L282.3 368.2" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M535.6 256L311.8 385.2" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M565 273L341.2 402.2" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M300 120 L594.4 290 L594.4 167.6 L300 -2.4Z" fill="url(#vwa)"/><path d="M300 120 L76.2 249.2 L76.2 126.8 L300 -2.4Z" fill="url(#vwb)"/><path d="M300 -11.9 L602.7 162.8 L594.4 167.6 L300 -2.4 L76.2 126.8 L68 122Z" fill="#5b3a24"/><path d="M602.7 285.2 L594.4 290 L594.4 167.6 L602.7 162.8Z" fill="#4c4f78"/><path d="M68 244.4 L76.2 249.2 L76.2 126.8 L68 122Z" fill="#5d618d"/><path d="M364.8 35 L375.1 40.9 L360.4 49.4 L350.1 43.5Z" fill="#785d4b"/><path d="M350.1 55.4 L360.4 61.4 L360.4 49.4 L350.1 43.5Z" fill="#4a2f1d"/><path d="M375.1 52.8 L360.4 61.4 L360.4 49.4 L375.1 40.9Z" fill="#382316"/><path d="M447.2 82.6 L457.5 88.5 L442.8 97 L432.5 91.1Z" fill="#785d4b"/><path d="M432.5 103 L442.8 108.9 L442.8 97 L432.5 91.1Z" fill="#4a2f1d"/><path d="M457.5 100.4 L442.8 108.9 L442.8 97 L457.5 88.5Z" fill="#382316"/><path d="M529.7 130.2 L540 136.2 L525.3 144.7 L514.9 138.7Z" fill="#785d4b"/><path d="M514.9 150.6 L525.3 156.6 L525.3 144.7 L514.9 138.7Z" fill="#4a2f1d"/><path d="M540 148.1 L525.3 156.6 L525.3 144.7 L540 136.2Z" fill="#382316"/><path d="M229.3 38.4 L244.1 46.9 L233.7 52.8 L219 44.3Z" fill="#785d4b"/><path d="M219 56.2 L233.7 64.8 L233.7 52.8 L219 44.3Z" fill="#4a2f1d"/><path d="M244.1 58.8 L233.7 64.8 L233.7 52.8 L244.1 46.9Z" fill="#382316"/><path d="M146.9 86 L161.6 94.5 L151.3 100.4 L136.6 91.9Z" fill="#785d4b"/><path d="M136.6 103.8 L151.3 112.3 L151.3 100.4 L136.6 91.9Z" fill="#4a2f1d"/><path d="M161.6 106.4 L151.3 112.3 L151.3 100.4 L161.6 94.5Z" fill="#382316"/><path d="M300 120 L594.4 290 L594.4 284.6 L300 114.6Z" fill="#b9bcd8"/><path d="M300 120 L76.2 249.2 L76.2 243.8 L300 114.6Z" fill="#a7abcc"/><path d="M300 120 L594.4 290 L579.7 298.5 L300 137 L90.9 257.7 L76.2 249.2Z" fill="#000" opacity=".12"/><path d="M426.6 142.1 L594.4 239 L594.4 232.9 L426.6 136Z" fill="#1a8ca3"/><path d="M136.6 214.3 L110.1 229.7 L110.1 107.2 L136.6 91.9Z" fill="#1a8ca3"/><path d="M254.4 146.3 L216.1 168.4 L216.1 58 L254.4 35.8Z" fill="#efe5cc"/><path d="M252 146 L218.4 165.4 L218.4 59.3 L252 39.9Z" fill="none" stroke="#c8bb9c" stroke-width="1"/><circle cx="223.4" cy="109.8" r="2.2" fill="#9a9aa8"/><path d="M108.6 230.5 L79.2 247.5 L79.2 137 L108.6 120Z" fill="#efe5cc"/><path d="M106.3 230.2 L81.5 244.4 L81.5 138.4 L106.3 124.1Z" fill="none" stroke="#c8bb9c" stroke-width="1"/><circle cx="86.5" cy="188.8" r="2.2" fill="#9a9aa8"/><ellipse class="vglow" id="vg-ruban" cx="220.5" cy="298.5" rx="175" ry="78" fill="url(#vgr)"/><ellipse class="vglow" id="vg-chevet" cx="464.9" cy="296.8" rx="80" ry="64" fill="url(#vgc)"/><ellipse class="vglow" id="vg-bureau" cx="453.1" cy="164.2" rx="80" ry="62" fill="url(#vgb)"/><ellipse class="vglow" id="vg-tv" cx="367.7" cy="97.9" rx="110" ry="74" fill="url(#vgt)"/><path d="M300 -2.4 L326.5 12.9 L300 28.2 L273.5 12.9Z" fill="#43a0b3"/><path d="M273.5 135.3 L300 150.6 L300 28.2 L273.5 12.9Z" fill="#157285"/><path d="M326.5 135.3 L300 150.6 L300 28.2 L326.5 12.9Z" fill="#105665"/><path d="M211.7 60.5 L241.1 77.5 L169 119.2 L139.5 102.2Z" fill="#eaebf4"/><path d="M139.5 212.7 L169 229.7 L169 119.2 L139.5 102.2Z" fill="#bcbdc6"/><path d="M241.1 188 L169 229.7 L169 119.2 L241.1 77.5Z" fill="#8e8f96"/><path d="M217 198.5L217 94.8" stroke="#9ea1b8" stroke-opacity="1" stroke-width="1.2"/><path d="M193.1 212.3L193.1 108.6" stroke="#9ea1b8" stroke-opacity="1" stroke-width="1.2"/><path d="M220.5 148.9L220.5 137" stroke="#7d8098" stroke-opacity="1" stroke-width="1.6"/><path d="M213.1 153.2L213.1 141.2" stroke="#7d8098" stroke-opacity="1" stroke-width="1.6"/><path d="M189.3 166.9L189.3 155" stroke="#7d8098" stroke-opacity="1" stroke-width="1.6"/><g class="vo" data-o="lit"><path d="M492.9 225.6 L591.5 282.5 L514.9 326.7 L416.3 269.8Z" fill="#5f6071"/><path d="M416.3 277.2 L514.9 334.2 L514.9 326.7 L416.3 269.8Z" fill="#313243"/><path d="M591.5 290 L514.9 334.2 L514.9 326.7 L591.5 282.5Z" fill="#252632"/><path d="M492.9 216.1 L588.6 271.3 L514.9 313.8 L419.3 258.6Z" fill="#b3b6c7"/><path d="M419.3 269.8 L514.9 325 L514.9 313.8 L419.3 258.6Z" fill="#858899"/><path d="M588.6 282.5 L514.9 325 L514.9 313.8 L588.6 271.3Z" fill="#656673"/><path d="M492.9 212.3 L553.2 247.2 L479.6 289.7 L419.3 254.8Z" fill="#777b9b"/><path d="M419.3 258.6 L479.6 293.4 L479.6 289.7 L419.3 254.8Z" fill="#494d6d"/><path d="M553.2 250.9 L479.6 293.4 L479.6 289.7 L553.2 247.2Z" fill="#373a53"/><path d="M556.2 252.6 L578.3 265.4 L550.3 281.5 L528.2 268.8Z" fill="#ecedf5"/><path d="M528.2 275.6 L550.3 288.3 L550.3 281.5 L528.2 268.8Z" fill="#bfbfc8"/><path d="M578.3 272.2 L550.3 288.3 L550.3 281.5 L578.3 265.4Z" fill="#909197"/><path d="M523.8 271.3 L545.9 284.1 L517.9 300.2 L495.8 287.4Z" fill="#ecedf5"/><path d="M495.8 294.2 L517.9 307 L517.9 300.2 L495.8 287.4Z" fill="#bfbfc8"/><path d="M545.9 290.9 L517.9 307 L517.9 300.2 L545.9 284.1Z" fill="#909197"/></g><g class="vo" data-o="bureau"><path d="M431 169.5 L484 200.1 L451.6 218.8 L398.6 188.2Z" fill="#eaebf4"/><path d="M398.6 190.9 L451.6 221.5 L451.6 218.8 L398.6 188.2Z" fill="#bcbdc6"/><path d="M484 202.8 L451.6 221.5 L451.6 218.8 L484 200.1Z" fill="#8e8f96"/><path d="M431 173.9 L434 175.6 L431 177.3 L428.1 175.6Z" fill="#d2d4e5"/><path d="M428.1 200.8 L431 202.4 L431 177.3 L428.1 175.6Z" fill="#a4a6b7"/><path d="M434 200.8 L431 202.4 L431 177.3 L434 175.6Z" fill="#7c7d8a"/><path d="M404.5 189.2 L407.5 190.9 L404.5 192.6 L401.6 190.9Z" fill="#d2d4e5"/><path d="M401.6 216.1 L404.5 217.8 L404.5 192.6 L401.6 190.9Z" fill="#a4a6b7"/><path d="M407.5 216.1 L404.5 217.8 L404.5 192.6 L407.5 190.9Z" fill="#7c7d8a"/><path d="M478.1 201.1 L481.1 202.8 L478.1 204.5 L475.2 202.8Z" fill="#d2d4e5"/><path d="M475.2 227.9 L478.1 229.7 L478.1 204.5 L475.2 202.8Z" fill="#a4a6b7"/><path d="M481.1 227.9 L478.1 229.7 L478.1 204.5 L481.1 202.8Z" fill="#7c7d8a"/><path d="M451.6 216.4 L454.6 218.1 L451.6 219.8 L448.7 218.1Z" fill="#d2d4e5"/><path d="M448.7 243.2 L451.6 244.9 L451.6 219.8 L448.7 218.1Z" fill="#a4a6b7"/><path d="M454.6 243.2 L451.6 244.9 L451.6 219.8 L454.6 218.1Z" fill="#7c7d8a"/><path d="M460.5 195L454.6 168.4" stroke="#2b2d38" stroke-opacity="1" stroke-width="2"/><path d="M445.6 174.4L463.6 174.4L454.6 162.4Z" fill="#f4f6ff" class="vbulb" id="vb-bureau"/><path d="M407.5 209.2 L431 222.9 L408.9 235.6 L385.4 222Z" fill="#a3d753"/><path d="M385.4 225.4 L408.9 239 L408.9 235.6 L385.4 222Z" fill="#75a925"/><path d="M431 226.2 L408.9 239 L408.9 235.6 L431 222.9Z" fill="#58801c"/><path d="M389.8 185.4 L413.4 199.1 L408.9 201.6 L385.4 188Z" fill="#acdf5d"/><path d="M385.4 222 L408.9 235.6 L408.9 201.6 L385.4 188Z" fill="#7eb12f"/><path d="M413.4 233.1 L408.9 235.6 L408.9 201.6 L413.4 199.1Z" fill="#5f8523"/><path d="M408.9 223.7 L411.9 225.4 L408.9 227.1 L406 225.4Z" fill="#51525b"/><path d="M406 240.7 L408.9 242.4 L408.9 227.1 L406 225.4Z" fill="#23242d"/><path d="M411.9 240.7 L408.9 242.4 L408.9 227.1 L411.9 225.4Z" fill="#1a1b22"/></g><g class="vo" data-o="tv"><path d="M336.8 97 L419.3 144.6 L400.1 155.7 L317.7 108.1Z" fill="#eaebf4"/><path d="M317.7 152.3 L400.1 199.9 L400.1 155.7 L317.7 108.1Z" fill="#bcbdc6"/><path d="M419.3 188.8 L400.1 199.9 L400.1 155.7 L419.3 144.6Z" fill="#8e8f96"/><path d="M319.7 151.1 L336.2 160.6 L336.2 142.6 L319.7 133.1Z" fill="#3a3b4c" opacity=".85"/><path d="M340.3 163 L356.8 172.5 L356.8 154.5 L340.3 145Z" fill="#3a3b4c" opacity=".85"/><path d="M361 174.9 L377.4 184.4 L377.4 166.4 L361 156.9Z" fill="#3a3b4c" opacity=".85"/><path d="M381.6 186.8 L398.1 196.3 L398.1 178.3 L381.6 168.8Z" fill="#3a3b4c" opacity=".85"/><path d="M319.7 129 L336.2 138.5 L336.2 120.5 L319.7 111Z" fill="#c43a3a" opacity=".85"/><path d="M340.3 140.9 L356.8 150.4 L356.8 132.4 L340.3 122.9Z" fill="#3a3b4c" opacity=".85"/><path d="M361 152.8 L377.4 162.3 L377.4 144.3 L361 134.8Z" fill="#3a3b4c" opacity=".85"/><path d="M381.6 164.7 L398.1 174.2 L398.1 156.2 L381.6 146.7Z" fill="#3a3b4c" opacity=".85"/><path d="M360.4 113.4 L378 123.6 L370.7 127.8 L353 117.6Z" fill="#3b3d48"/><path d="M353 121.7 L370.7 131.9 L370.7 127.8 L353 117.6Z" fill="#0d0f1a"/><path d="M378 127.7 L370.7 131.9 L370.7 127.8 L378 123.6Z" fill="#0a0b13"/><path d="M335.3 44.9 L401.9 83.3 L397.8 85.7 L331.2 47.2Z" fill="#3b3d48"/><path d="M331.2 97.6 L397.8 136 L397.8 85.7 L331.2 47.2Z" fill="#0d0f1a"/><path d="M401.9 133.6 L397.8 136 L397.8 85.7 L401.9 83.3Z" fill="#0a0b13"/><path d="M333.6 96.5 L395.4 132.2 L395.4 87 L333.6 51.3Z" fill="#0a0c16" id="vtv-off"/><g id="vtv-on" opacity="0"><path d="M333.6 96.5 L395.4 132.2 L395.4 87 L333.6 51.3Z" fill="url(#vtv)"/><g clip-path="url(#vtvc)"><image id="vtv-img" x="0" y="0" width="1.579" height="1" preserveAspectRatio="xMidYMid slice" transform="matrix(39.1389 22.6094 0 45.2 333.6 51.3)" style="display:none"/></g><path d="M333.6 96.5 L395.4 132.2 L395.4 87 L333.6 51.3Z" fill="url(#vtvsh)"/></g></g><g class="vo" data-o="xbox"><path d="M406 120 L414.2 124.8 L406 129.5 L397.8 124.8Z" fill="#22252c"/><path d="M397.8 145.8 L406 150.6 L406 129.5 L397.8 124.8Z" fill="#121317"/><path d="M414.2 145.8 L406 150.6 L406 129.5 L414.2 124.8Z" fill="#0d0e11"/><path d="M406 121.4 L411.9 124.8 L406 128.2 L400.1 124.8Z" fill="#0b0c0f"/><circle id="vxb-led" cx="401.9" cy="131.2" r="2.2" fill="#3a3d44"/></g><path d="M241.1 205 L244.6 207 L241.1 209.1 L237.6 207Z" fill="#444449"/><path d="M237.6 220.6 L241.1 222.7 L241.1 209.1 L237.6 207Z" fill="#16161b"/><path d="M244.6 220.6 L241.1 222.7 L241.1 209.1 L244.6 207Z" fill="#101015"/><path d="M280.9 228 L284.4 230 L280.9 232 L277.3 230Z" fill="#444449"/><path d="M277.3 243.6 L280.9 245.6 L280.9 232 L277.3 230Z" fill="#16161b"/><path d="M284.4 243.6 L280.9 245.6 L280.9 232 L284.4 230Z" fill="#101015"/><path d="M213.1 221.2 L216.7 223.2 L213.1 225.2 L209.6 223.2Z" fill="#444449"/><path d="M209.6 236.8 L213.1 238.8 L213.1 225.2 L209.6 223.2Z" fill="#16161b"/><path d="M216.7 236.8 L213.1 238.8 L213.1 225.2 L216.7 223.2Z" fill="#101015"/><path d="M252.9 244.1 L256.4 246.1 L252.9 248.2 L249.4 246.1Z" fill="#444449"/><path d="M249.4 259.7 L252.9 261.8 L252.9 248.2 L249.4 246.1Z" fill="#16161b"/><path d="M256.4 259.7 L252.9 261.8 L252.9 248.2 L256.4 246.1Z" fill="#101015"/><path d="M241.1 199.9 L286.7 226.2 L252.9 245.8 L207.2 219.4Z" fill="#3b3b48"/><path d="M207.2 222.8 L252.9 249.2 L252.9 245.8 L207.2 219.4Z" fill="#19191f"/><path d="M286.7 229.7 L252.9 249.2 L252.9 245.8 L286.7 226.2Z" fill="#131318"/><path d="M244.1 210.8 L257.3 218.4 L248.5 223.5 L235.2 215.9Z" fill="#eceaf4"/><path d="M235.2 218.6 L248.5 226.2 L248.5 223.5 L235.2 215.9Z" fill="#bebcc6"/><path d="M257.3 221.2 L248.5 226.2 L248.5 223.5 L257.3 218.4Z" fill="#8f8e96"/><g class="vo" data-o="chevet"><path d="M470.8 300.2 L497.3 315.5 L464.9 334.2 L438.4 318.9Z" fill="#eaebf4"/><path d="M438.4 347.8 L464.9 363.1 L464.9 334.2 L438.4 318.9Z" fill="#bcbdc6"/><path d="M497.3 344.4 L464.9 363.1 L464.9 334.2 L497.3 315.5Z" fill="#8e8f96"/><path d="M438.4 332.5L464.9 347.8" stroke="#9ea1b8" stroke-opacity="1" stroke-width="1.2"/><path d="M470.8 305.3 L476.7 308.7 L470.8 312.1 L464.9 308.7Z" fill="#45464d"/><path d="M464.9 310.4 L470.8 313.8 L470.8 312.1 L464.9 308.7Z" fill="#17181f"/><path d="M476.7 310.4 L470.8 313.8 L470.8 312.1 L476.7 308.7Z" fill="#111217"/><path d="M470.8 308.7L473.7 300.2" stroke="#1d1e26" stroke-opacity="1" stroke-width="2.2"/><path d="M473.7 300.2L470.8 283.2" stroke="#1d1e26" stroke-opacity="1" stroke-width="2.2"/><path d="M460.8 291.2L480.8 291.2L476.8 278.2L464.8 278.2Z" fill="#ffe2b0" class="vbulb" id="vb-chevet"/><path d="M466.4 302.8 L469.3 304.4 L457.5 311.2 L454.6 309.6Z" fill="#3f4047"/><path d="M454.6 324.9 L457.5 326.5 L457.5 311.2 L454.6 309.6Z" fill="#111219"/><path d="M469.3 319.8 L457.5 326.5 L457.5 311.2 L469.3 304.4Z" fill="#0d0e13"/><path d="M468.4 318.6 L458.4 324.3 L458.4 312.1 L468.4 306.3Z" fill="#5b7cff" opacity=".9"/></g><g class="vo" data-o="canape"><path d="M320.6 261.8 L364.8 287.3 L285.3 333.2 L241.1 307.7Z" fill="#53535d"/><path d="M241.1 324 L285.3 349.5 L285.3 333.2 L241.1 307.7Z" fill="#25252f"/><path d="M364.8 303.6 L285.3 349.5 L285.3 333.2 L364.8 287.3Z" fill="#1c1c23"/><path d="M161.6 227.8 L314.7 316.2 L285.3 333.2 L132.2 244.8Z" fill="#53535d"/><path d="M132.2 261.1 L285.3 349.5 L285.3 333.2 L132.2 244.8Z" fill="#25252f"/><path d="M314.7 332.5 L285.3 349.5 L285.3 333.2 L314.7 316.2Z" fill="#1c1c23"/><path d="M132.2 218.6 L285.3 307 L269.1 316.4 L116 227.9Z" fill="#53535d"/><path d="M116 270.4 L269.1 358.9 L269.1 316.4 L116 227.9Z" fill="#25252f"/><path d="M285.3 349.5 L269.1 358.9 L269.1 316.4 L285.3 307Z" fill="#1c1c23"/><path d="M364.8 271.3 L379.5 279.8 L283.8 335.1 L269.1 326.6Z" fill="#53535d"/><path d="M269.1 358.9 L283.8 367.4 L283.8 335.1 L269.1 326.6Z" fill="#25252f"/><path d="M379.5 312.1 L283.8 367.4 L283.8 335.1 L379.5 279.8Z" fill="#1c1c23"/><path d="M161.6 211.8 L176.3 220.3 L146.9 237.3 L132.2 228.8Z" fill="#53535d"/><path d="M132.2 244.8 L146.9 253.3 L146.9 237.3 L132.2 228.8Z" fill="#25252f"/><path d="M176.3 236.3 L146.9 253.3 L146.9 237.3 L176.3 220.3Z" fill="#1c1c23"/><path d="M174.9 234.1 L219 259.6 L194 274 L149.8 248.5Z" fill="#5d5d68"/><path d="M149.8 253.3 L194 278.8 L194 274 L149.8 248.5Z" fill="#2f2f3b"/><path d="M219 264.3 L194 278.8 L194 274 L219 259.6Z" fill="#23232c"/><path d="M220.5 260.4 L264.7 285.9 L239.6 300.4 L195.5 274.9Z" fill="#5d5d68"/><path d="M195.5 279.6 L239.6 305.1 L239.6 300.4 L195.5 274.9Z" fill="#2f2f3b"/><path d="M264.7 290.7 L239.6 305.1 L239.6 300.4 L264.7 285.9Z" fill="#23232c"/><path d="M320.6 258.7 L361.8 282.5 L316.2 308.9 L275 285.1Z" fill="#5d5d68"/><path d="M275 289.8 L316.2 313.6 L316.2 308.9 L275 285.1Z" fill="#2f2f3b"/><path d="M361.8 287.3 L316.2 313.6 L316.2 308.9 L361.8 282.5Z" fill="#23232c"/><path d="M148.4 226.9 L189.6 250.7 L176.3 258.4 L135.1 234.6Z" fill="#5d5d68"/><path d="M135.1 237.3 L176.3 261.1 L176.3 258.4 L135.1 234.6Z" fill="#2f2f3b"/><path d="M189.6 253.4 L176.3 261.1 L176.3 258.4 L189.6 250.7Z" fill="#23232c"/><path d="M192.5 252.4 L236.7 277.9 L223.4 285.6 L179.3 260.1Z" fill="#5d5d68"/><path d="M179.3 262.8 L223.4 288.3 L223.4 285.6 L179.3 260.1Z" fill="#2f2f3b"/><path d="M236.7 280.6 L223.4 288.3 L223.4 285.6 L236.7 277.9Z" fill="#23232c"/><path d="M239.6 279.6 L282.3 304.3 L269.1 311.9 L226.4 287.3Z" fill="#5d5d68"/><path d="M226.4 290 L269.1 314.6 L269.1 311.9 L226.4 287.3Z" fill="#2f2f3b"/><path d="M282.3 307 L269.1 314.6 L269.1 311.9 L282.3 304.3Z" fill="#23232c"/></g></svg>';
  V.ANCHOR = {"lit": [80.7, 57.4], "bureau": [69.3, 38.4], "tv": [55.3, 17.6], "xbox": [62.9, 29.1], "chevet": [74.7, 65.2], "canape": [31.1, 58.1]};
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
    '.vpop button{vertical-align:middle;min-width:44px;min-height:40px;margin:0 3px;padding:0 10px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.12);color:#fff;font-weight:600;font-size:15px}',
    '@-webkit-keyframes vpop{from{opacity:0;margin-top:0}}@keyframes vpop{from{opacity:0;margin-top:0}}',
    '.noanim .vstars i,.noanim .vcl,.noanim .vrain i,body.lowfx .vcl,body.lowfx .vstars i{-webkit-animation:none!important;animation:none!important}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);
})();
