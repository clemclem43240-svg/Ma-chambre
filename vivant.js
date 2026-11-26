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
  V.PLAN = '<svg class="vplan" viewBox="-17 -18 575 473" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs> <linearGradient id="vfl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#77738f"/><stop offset="1" stop-color="#5a5674"/></linearGradient> <linearGradient id="vwa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f94bd"/><stop offset="1" stop-color="#a9adcf"/></linearGradient> <linearGradient id="vwb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a7fab"/><stop offset="1" stop-color="#9599c0"/></linearGradient> <linearGradient id="vwt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16788c"/><stop offset="1" stop-color="#2398ad"/></linearGradient> <linearGradient id="vtv" x1="0" y1="0" x2="1" y2="1"><stop id="vtv0" offset="0" stop-color="#107c10"/><stop id="vtv1" offset="1" stop-color="#0b2614"/></linearGradient> <radialGradient id="vgr"><stop id="vgr0" offset="0" stop-color="#a77bff" stop-opacity="1"/><stop id="vgr2" offset=".55" stop-color="#a77bff" stop-opacity=".45"/><stop id="vgr1" offset="1" stop-color="#a77bff" stop-opacity="0"/></radialGradient> <radialGradient id="vgc"><stop id="vgc0" offset="0" stop-color="#ffcf8a" stop-opacity=".85"/><stop id="vgc1" offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient> <radialGradient id="vgb"><stop id="vgb0" offset="0" stop-color="#f4f6ff" stop-opacity=".8"/><stop id="vgb1" offset="1" stop-color="#f4f6ff" stop-opacity="0"/></radialGradient> <radialGradient id="vgt"><stop id="vgt0" offset="0" stop-color="#3fdc8a" stop-opacity=".6"/><stop id="vgt1" offset="1" stop-color="#3fdc8a" stop-opacity="0"/></radialGradient> <linearGradient id="vtvsh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="vtvc"><path d="M391 129.7 L452.8 165.4 L452.8 120.2 L391 84.5Z"/></clipPath> </defs><path d="M-2.7 298.8 L241.1 439.6 L241.1 426 L-2.7 285.2Z" fill="#2a2740"/><path d="M543.8 264.8 L241.1 439.6 L241.1 426 L543.8 251.2Z" fill="#1d1b30"/><path d="M300 120 L535.6 256 L241.1 426 L5.6 290Z" fill="url(#vfl)"/><path d="M329.4 137L35 307" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M358.9 154L64.4 324" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M388.3 171L93.9 341" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M417.8 188L123.3 358" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M447.2 205L152.8 375" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M476.7 222L182.2 392" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M506.1 239L211.7 409" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M535.6 256L241.1 426" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M565 273L270.6 443" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/><path d="M300 120 L535.6 256 L535.6 133.6 L300 -2.4Z" fill="url(#vwa)"/><path d="M300 120 L5.6 290 L5.6 167.6 L300 -2.4Z" fill="url(#vwt)"/><path d="M300 -11.9 L543.8 128.8 L535.6 133.6 L300 -2.4 L5.6 167.6 L-2.7 162.8Z" fill="#5b3a24"/><path d="M543.8 251.2 L535.6 256 L535.6 133.6 L543.8 128.8Z" fill="#4c4f78"/><path d="M-2.7 285.2 L5.6 290 L5.6 167.6 L-2.7 162.8Z" fill="#5d618d"/><path d="M370.7 38.4 L381 44.3 L366.3 52.8 L355.9 46.9Z" fill="#785d4b"/><path d="M355.9 58.8 L366.3 64.8 L366.3 52.8 L355.9 46.9Z" fill="#4a2f1d"/><path d="M381 56.2 L366.3 64.8 L366.3 52.8 L381 44.3Z" fill="#382316"/><path d="M459 89.4 L469.3 95.3 L454.6 103.8 L444.3 97.9Z" fill="#785d4b"/><path d="M444.3 109.8 L454.6 115.8 L454.6 103.8 L444.3 97.9Z" fill="#4a2f1d"/><path d="M469.3 107.2 L454.6 115.8 L454.6 103.8 L469.3 95.3Z" fill="#382316"/><path d="M211.7 48.6 L226.4 57.1 L216.1 63 L201.4 54.5Z" fill="#785d4b"/><path d="M201.4 66.5 L216.1 75 L216.1 63 L201.4 54.5Z" fill="#4a2f1d"/><path d="M226.4 69 L216.1 75 L216.1 63 L226.4 57.1Z" fill="#382316"/><path d="M117.4 103 L132.2 111.5 L121.9 117.4 L107.1 108.9Z" fill="#785d4b"/><path d="M107.1 120.8 L121.9 129.3 L121.9 117.4 L107.1 108.9Z" fill="#4a2f1d"/><path d="M132.2 123.4 L121.9 129.3 L121.9 117.4 L132.2 111.5Z" fill="#382316"/><path d="M40.9 147.2 L55.6 155.7 L45.3 161.7 L30.6 153.2Z" fill="#785d4b"/><path d="M30.6 165.1 L45.3 173.6 L45.3 161.7 L30.6 153.2Z" fill="#4a2f1d"/><path d="M55.6 167.6 L45.3 173.6 L45.3 161.7 L55.6 155.7Z" fill="#382316"/><path d="M300 120 L535.6 256 L535.6 250.6 L300 114.6Z" fill="#b9bcd8"/><path d="M300 120 L535.6 256 L520.8 264.5 L300 137 L20.3 298.5 L5.6 290Z" fill="#000" opacity=".12"/><path d="M314.7 128.5 L354.5 151.4 L354.5 41 L314.7 18Z" fill="#efe5cc"/><path d="M317.1 128.2 L352.1 148.4 L352.1 42.3 L317.1 22.1Z" fill="none" stroke="#c8bb9c" stroke-width="1"/><circle cx="347.1" cy="92.8" r="2.2" fill="#9a9aa8"/><ellipse class="vglow" id="vg-ruban" cx="105.7" cy="313.8" rx="175" ry="78" fill="url(#vgr)"/><ellipse class="vglow" id="vg-chevet" cx="182.2" cy="322.3" rx="80" ry="64" fill="url(#vgc)"/><ellipse class="vglow" id="vg-bureau" cx="382.4" cy="266.2" rx="80" ry="62" fill="url(#vgb)"/><ellipse class="vglow" id="vg-tv" cx="426.6" cy="131.9" rx="110" ry="74" fill="url(#vgt)"/><path d="M507.6 117.4 L534.1 132.8 L507.6 148 L481.1 132.8Z" fill="#43a0b3"/><path d="M481.1 255.2 L507.6 270.4 L507.6 148 L481.1 132.8Z" fill="#157285"/><path d="M534.1 255.2 L507.6 270.4 L507.6 148 L534.1 132.8Z" fill="#105665"/><path d="M264.7 29.9 L294.1 46.9 L220.5 89.4 L191.1 72.4Z" fill="#eaebf4"/><path d="M191.1 182.9 L220.5 199.9 L220.5 89.4 L191.1 72.4Z" fill="#bcbdc6"/><path d="M294.1 157.4 L220.5 199.9 L220.5 89.4 L294.1 46.9Z" fill="#8e8f96"/><path d="M269.7 168.1L269.7 64.4" stroke="#9ea1b8" stroke-opacity="1" stroke-width="1.2"/><path d="M244.9 182.4L244.9 78.7" stroke="#9ea1b8" stroke-opacity="1" stroke-width="1.2"/><path d="M273.5 118.3L273.5 106.4" stroke="#7d8098" stroke-opacity="1" stroke-width="1.6"/><path d="M266.1 122.5L266.1 110.6" stroke="#7d8098" stroke-opacity="1" stroke-width="1.6"/><path d="M241.1 137L241.1 125.1" stroke="#7d8098" stroke-opacity="1" stroke-width="1.6"/><g class="vo" data-o="tv"><path d="M394.2 130.2 L476.7 177.8 L457.5 188.9 L375.1 141.2Z" fill="#eaebf4"/><path d="M375.1 185.4 L457.5 233.1 L457.5 188.9 L375.1 141.2Z" fill="#bcbdc6"/><path d="M476.7 222 L457.5 233.1 L457.5 188.9 L476.7 177.8Z" fill="#8e8f96"/><path d="M377.1 184.3 L393.6 193.8 L393.6 175.8 L377.1 166.2Z" fill="#3a3b4c" opacity=".85"/><path d="M397.8 196.2 L414.2 205.7 L414.2 187.7 L397.8 178.1Z" fill="#3a3b4c" opacity=".85"/><path d="M418.4 208.1 L434.9 217.6 L434.9 199.6 L418.4 190Z" fill="#3a3b4c" opacity=".85"/><path d="M439 220 L455.5 229.5 L455.5 211.5 L439 201.9Z" fill="#3a3b4c" opacity=".85"/><path d="M377.1 162.2 L393.6 171.7 L393.6 153.7 L377.1 144.1Z" fill="#c43a3a" opacity=".85"/><path d="M397.8 174.1 L414.2 183.6 L414.2 165.6 L397.8 156Z" fill="#3a3b4c" opacity=".85"/><path d="M418.4 186 L434.9 195.5 L434.9 177.5 L418.4 167.9Z" fill="#3a3b4c" opacity=".85"/><path d="M439 197.9 L455.5 207.4 L455.5 189.4 L439 179.8Z" fill="#3a3b4c" opacity=".85"/><path d="M419.3 147.4 L436.9 157.6 L429.6 161.8 L411.9 151.6Z" fill="#3b3d48"/><path d="M411.9 155.7 L429.6 165.9 L429.6 161.8 L411.9 151.6Z" fill="#0d0f1a"/><path d="M436.9 161.6 L429.6 165.9 L429.6 161.8 L436.9 157.6Z" fill="#0a0b13"/><path d="M392.8 78 L459.3 116.4 L455.2 118.8 L388.6 80.4Z" fill="#3b3d48"/><path d="M388.6 130.7 L455.2 169.1 L455.2 118.8 L388.6 80.4Z" fill="#0d0f1a"/><path d="M459.3 166.8 L455.2 169.1 L455.2 118.8 L459.3 116.4Z" fill="#0a0b13"/><path d="M391 129.7 L452.8 165.4 L452.8 120.2 L391 84.5Z" fill="#0a0c16" id="vtv-off"/><g id="vtv-on" opacity="0"><path d="M391 129.7 L452.8 165.4 L452.8 120.2 L391 84.5Z" fill="url(#vtv)"/><g clip-path="url(#vtvc)"><image id="vtv-img" x="0" y="0" width="1.579" height="1" preserveAspectRatio="xMidYMid slice" transform="matrix(39.1389 22.6094 0 45.2 391 84.5)" style="display:none"/></g><path d="M391 129.7 L452.8 165.4 L452.8 120.2 L391 84.5Z" fill="url(#vtvsh)"/></g></g><g class="vo" data-o="xbox"><path d="M463.7 153.3 L472 158.1 L463.7 162.8 L455.5 158.1Z" fill="#22252c"/><path d="M455.5 179.2 L463.7 183.9 L463.7 162.8 L455.5 158.1Z" fill="#121317"/><path d="M472 179.2 L463.7 183.9 L463.7 162.8 L472 158.1Z" fill="#0d0e11"/><path d="M463.7 154.7 L469.6 158.1 L463.7 161.5 L457.8 158.1Z" fill="#0b0c0f"/><circle id="vxb-led" cx="459.6" cy="164.5" r="2.2" fill="#3a3d44"/></g><path d="M185.2 170.3 L188.7 172.4 L185.2 174.4 L181.6 172.4Z" fill="#444449"/><path d="M181.6 193.4 L185.2 195.5 L185.2 174.4 L181.6 172.4Z" fill="#16161b"/><path d="M188.7 193.4 L185.2 195.5 L185.2 174.4 L188.7 172.4Z" fill="#101015"/><path d="M210.2 184.8 L213.7 186.8 L210.2 188.9 L206.7 186.8Z" fill="#444449"/><path d="M206.7 207.9 L210.2 209.9 L210.2 188.9 L206.7 186.8Z" fill="#16161b"/><path d="M213.7 207.9 L210.2 209.9 L210.2 188.9 L213.7 186.8Z" fill="#101015"/><path d="M155.7 187.3 L159.3 189.4 L155.7 191.4 L152.2 189.4Z" fill="#444449"/><path d="M152.2 210.4 L155.7 212.5 L155.7 191.4 L152.2 189.4Z" fill="#16161b"/><path d="M159.3 210.4 L155.7 212.5 L155.7 191.4 L159.3 189.4Z" fill="#101015"/><path d="M180.7 201.8 L184.3 203.8 L180.7 205.9 L177.2 203.8Z" fill="#444449"/><path d="M177.2 224.9 L180.7 226.9 L180.7 205.9 L177.2 203.8Z" fill="#16161b"/><path d="M184.3 224.9 L180.7 226.9 L180.7 205.9 L184.3 203.8Z" fill="#101015"/><path d="M185.2 165.2 L216.7 183.4 L181.3 203.8 L149.8 185.6Z" fill="#3b3b48"/><path d="M149.8 189 L181.3 207.2 L181.3 203.8 L149.8 185.6Z" fill="#19191f"/><path d="M216.7 186.8 L181.3 207.2 L181.3 203.8 L216.7 183.4Z" fill="#131318"/><g class="vo" data-o="bureau"><path d="M395.7 269.8 L428.1 288.5 L373.6 319.9 L341.2 301.2Z" fill="#eaebf4"/><path d="M341.2 303.9 L373.6 322.6 L373.6 319.9 L341.2 301.2Z" fill="#bcbdc6"/><path d="M428.1 291.2 L373.6 322.6 L373.6 319.9 L428.1 288.5Z" fill="#8e8f96"/><path d="M395.7 274.2 L398.6 275.9 L395.7 277.6 L392.8 275.9Z" fill="#d2d4e5"/><path d="M392.8 301.1 L395.7 302.8 L395.7 277.6 L392.8 275.9Z" fill="#a4a6b7"/><path d="M398.6 301.1 L395.7 302.8 L395.7 277.6 L398.6 275.9Z" fill="#7c7d8a"/><path d="M347.1 302.2 L350.1 303.9 L347.1 305.6 L344.2 303.9Z" fill="#d2d4e5"/><path d="M344.2 329.1 L347.1 330.8 L347.1 305.6 L344.2 303.9Z" fill="#a4a6b7"/><path d="M350.1 329.1 L347.1 330.8 L347.1 305.6 L350.1 303.9Z" fill="#7c7d8a"/><path d="M422.2 289.5 L425.1 291.2 L422.2 292.9 L419.3 291.2Z" fill="#d2d4e5"/><path d="M419.3 316.4 L422.2 318 L422.2 292.9 L419.3 291.2Z" fill="#a4a6b7"/><path d="M425.1 316.4 L422.2 318 L422.2 292.9 L425.1 291.2Z" fill="#7c7d8a"/><path d="M373.6 317.5 L376.6 319.2 L373.6 320.9 L370.7 319.2Z" fill="#d2d4e5"/><path d="M370.7 344.4 L373.6 346.1 L373.6 320.9 L370.7 319.2Z" fill="#a4a6b7"/><path d="M376.6 344.4 L373.6 346.1 L373.6 320.9 L376.6 319.2Z" fill="#7c7d8a"/><path d="M413.4 288.5L406 262.8" stroke="#2b2d38" stroke-opacity="1" stroke-width="2"/><path d="M397 268.8L415 268.8L406 256.8Z" fill="#f4f6ff" class="vbulb" id="vb-bureau"/><path d="M357.4 273.8 L379.5 286.6 L355.9 300.2 L333.9 287.4Z" fill="#a3d753"/><path d="M333.9 290.8 L355.9 303.6 L355.9 300.2 L333.9 287.4Z" fill="#75a925"/><path d="M379.5 290 L355.9 303.6 L355.9 300.2 L379.5 286.6Z" fill="#58801c"/><path d="M353 237.3 L357.4 239.8 L333.9 253.4 L329.4 250.9Z" fill="#acdf5d"/><path d="M329.4 284.9 L333.9 287.4 L333.9 253.4 L329.4 250.9Z" fill="#7eb12f"/><path d="M357.4 273.8 L333.9 287.4 L333.9 253.4 L357.4 239.8Z" fill="#5f8523"/><path d="M356.5 288.6 L359.5 290.3 L356.5 292 L353.6 290.3Z" fill="#51525b"/><path d="M353.6 305.6 L356.5 307.3 L356.5 292 L353.6 290.3Z" fill="#23242d"/><path d="M359.5 305.6 L356.5 307.3 L356.5 292 L359.5 290.3Z" fill="#1a1b22"/></g><g class="vo" data-o="lit"><path d="M297.1 318.2 L354.5 351.4 L241.1 416.8 L183.7 383.7Z" fill="#5f6071"/><path d="M183.7 391.1 L241.1 424.3 L241.1 416.8 L183.7 383.7Z" fill="#313243"/><path d="M354.5 358.9 L241.1 424.3 L241.1 416.8 L354.5 351.4Z" fill="#252632"/><path d="M297.1 308.7 L351.5 340.2 L241.1 403.9 L186.6 372.4Z" fill="#b3b6c7"/><path d="M186.6 383.7 L241.1 415.1 L241.1 403.9 L186.6 372.4Z" fill="#858899"/><path d="M351.5 351.4 L241.1 415.1 L241.1 403.9 L351.5 340.2Z" fill="#656673"/><path d="M297.1 305 L351.5 336.4 L285.3 374.7 L230.8 343.2Z" fill="#777b9b"/><path d="M230.8 346.9 L285.3 378.4 L285.3 374.7 L230.8 343.2Z" fill="#494d6d"/><path d="M351.5 340.2 L285.3 378.4 L285.3 374.7 L351.5 336.4Z" fill="#373a53"/><path d="M220.5 352.9 L263.2 377.5 L239.6 391.1 L196.9 366.5Z" fill="#ecedf5"/><path d="M196.9 373.3 L239.6 397.9 L239.6 391.1 L196.9 366.5Z" fill="#bfbfc8"/><path d="M263.2 384.3 L239.6 397.9 L239.6 391.1 L263.2 377.5Z" fill="#909197"/></g><g class="vo" data-o="chevet"><path d="M180.7 328.2 L208.7 344.4 L180.7 360.5 L152.8 344.4Z" fill="#eaebf4"/><path d="M152.8 373.3 L180.7 389.4 L180.7 360.5 L152.8 344.4Z" fill="#bcbdc6"/><path d="M208.7 373.3 L180.7 389.4 L180.7 360.5 L208.7 344.4Z" fill="#8e8f96"/><path d="M152.8 358L180.7 374.1" stroke="#9ea1b8" stroke-opacity="1" stroke-width="1.2"/><path d="M177.8 338.5 L183.7 341.9 L177.8 345.2 L171.9 341.9Z" fill="#45464d"/><path d="M171.9 343.5 L177.8 347 L177.8 345.2 L171.9 341.9Z" fill="#17181f"/><path d="M183.7 343.6 L177.8 347 L177.8 345.2 L183.7 341.9Z" fill="#111217"/><path d="M177.8 341.9L182.2 332.5" stroke="#1d1e26" stroke-opacity="1" stroke-width="2.2"/><path d="M182.2 332.5L183.7 311.2" stroke="#1d1e26" stroke-opacity="1" stroke-width="2.2"/><path d="M173.7 319.2L193.7 319.2L189.7 306.2L177.7 306.2Z" fill="#ffe2b0" class="vbulb" id="vb-chevet"/></g><g class="vo" data-o="canape"><path d="M196.9 261.8 L241.1 287.3 L152.8 338.3 L108.6 312.8Z" fill="#53535d"/><path d="M108.6 329.1 L152.8 354.6 L152.8 338.3 L108.6 312.8Z" fill="#25252f"/><path d="M241.1 303.6 L152.8 354.6 L152.8 338.3 L241.1 287.3Z" fill="#1c1c23"/><path d="M88 266.9 L182.2 321.3 L152.8 338.3 L58.6 283.9Z" fill="#53535d"/><path d="M58.6 300.2 L152.8 354.6 L152.8 338.3 L58.6 283.9Z" fill="#25252f"/><path d="M182.2 337.6 L152.8 354.6 L152.8 338.3 L182.2 321.3Z" fill="#1c1c23"/><path d="M58.6 257.7 L167.5 320.6 L151.3 329.9 L42.4 267Z" fill="#53535d"/><path d="M42.4 309.5 L151.3 372.4 L151.3 329.9 L42.4 267Z" fill="#25252f"/><path d="M167.5 363.1 L151.3 372.4 L151.3 329.9 L167.5 320.6Z" fill="#1c1c23"/><path d="M241.1 271.3 L255.8 279.8 L151.3 340.1 L136.6 331.6Z" fill="#53535d"/><path d="M136.6 363.9 L151.3 372.4 L151.3 340.1 L136.6 331.6Z" fill="#25252f"/><path d="M255.8 312.1 L151.3 372.4 L151.3 340.1 L255.8 279.8Z" fill="#1c1c23"/><path d="M88 250.9 L102.7 259.4 L73.3 276.4 L58.6 267.9Z" fill="#53535d"/><path d="M58.6 283.9 L73.3 292.4 L73.3 276.4 L58.6 267.9Z" fill="#25252f"/><path d="M102.7 275.4 L73.3 292.4 L73.3 276.4 L102.7 259.4Z" fill="#1c1c23"/><path d="M101.2 273.2 L132.2 291 L107.1 305.5 L76.2 287.6Z" fill="#5d5d68"/><path d="M76.2 292.4 L107.1 310.2 L107.1 305.5 L76.2 287.6Z" fill="#2f2f3b"/><path d="M132.2 295.8 L107.1 310.2 L107.1 305.5 L132.2 291Z" fill="#23232c"/><path d="M135.1 292.7 L166 310.6 L141 325 L110.1 307.2Z" fill="#5d5d68"/><path d="M110.1 311.9 L141 329.8 L141 325 L110.1 307.2Z" fill="#2f2f3b"/><path d="M166 315.3 L141 329.8 L141 325 L166 310.6Z" fill="#23232c"/><path d="M196.9 258.7 L238.2 282.5 L179.3 316.5 L138.1 292.7Z" fill="#5d5d68"/><path d="M138.1 297.5 L179.3 321.3 L179.3 316.5 L138.1 292.7Z" fill="#2f2f3b"/><path d="M238.2 287.3 L179.3 321.3 L179.3 316.5 L238.2 282.5Z" fill="#23232c"/><path d="M74.7 266 L110.1 286.4 L96.8 294.1 L61.5 273.7Z" fill="#5d5d68"/><path d="M61.5 276.4 L96.8 296.8 L96.8 294.1 L61.5 273.7Z" fill="#2f2f3b"/><path d="M110.1 289.1 L96.8 296.8 L96.8 294.1 L110.1 286.4Z" fill="#23232c"/><path d="M113 288.1 L149.8 309.4 L136.6 317 L99.8 295.8Z" fill="#5d5d68"/><path d="M99.8 298.5 L136.6 319.8 L136.6 317 L99.8 295.8Z" fill="#2f2f3b"/><path d="M149.8 312.1 L136.6 319.8 L136.6 317 L149.8 309.4Z" fill="#23232c"/></g><path d="M-2.7 268.2 L241.1 409 L232.9 413.8 L-10.9 273Z" fill="#b7bad6"/><path d="M-10.9 290 L232.9 430.8 L232.9 413.8 L-10.9 273Z" fill="#666989"/><path d="M241.1 426 L232.9 430.8 L232.9 413.8 L241.1 409Z" fill="#4d4f68"/><path d="M543.8 234.2 L552 239 L241.1 418.5 L232.9 413.8Z" fill="#b7bad6"/><path d="M232.9 430.8 L241.1 435.5 L241.1 418.5 L232.9 413.8Z" fill="#666989"/><path d="M552 256 L241.1 435.5 L241.1 418.5 L552 239Z" fill="#4d4f68"/><path d="M9.1 294.1 L162.2 382.5 L162.2 376.4 L9.1 288Z" fill="#bfe3ff" opacity=".75"/><path d="M543.8 250.6 L249.4 420.6 L249.4 416.5 L543.8 246.5Z" fill="#1a8ca3"/></svg>';
  V.ANCHOR = {"tv": [76.3, 24.0], "xbox": [83.6, 35.2], "bureau": [70.0, 58.3], "lit": [52.1, 73.7], "chevet": [34.6, 69.4], "canape": [23.9, 59.7]};
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
