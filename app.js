(() => {
  const $ = s => document.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  // back-cover order; f = Apple preview file number (Apple swaps 9 and 10)
  const COL = ['#d8343a', '#e8a58c', '#6fc7c2', '#d8343a', '#5fb4d9', '#c9c9e8', '#e8a58c', '#d8343a', '#6fc7c2', '#e8a58c', '#d8343a', '#5fb4d9', '#e9e4dc', '#e8a58c', '#6fc7c2'];
  const T = [
    ['Too Deep', 1], ['Girl of Your Dreams', 2], ['Get Back', 3], ['Miss Anonymous', 4], ['True Colors', 5],
    ['Rather Get Money', 6], ['Yearning For Us', 7], ['LHS', 8], ['Into You', 10], ["You're Mine (Interlude)", 9],
    ['Stay By My Side', 11], ['Got It Bad', 12], ["Couldn't Get Far", 13], ['Heaven Can Wait', 14], ['Out of Sight, Out of Mind', 15]
  ];
  // real Detroit: the map image is drawn from Census + OpenStreetMap data (see img/map.json for the frame)
  const MW = 3000, MH = 2455, MC = [MW / 2, MH / 2];
  const LON0 = -83.315, LON1 = -82.885, LAT1 = 42.495, R = Math.PI / 180;
  const my = lat => Math.log(Math.tan(Math.PI / 4 + lat * R / 2)), SC = MW / ((LON1 - LON0) * R);
  const proj = (lat, lon) => [(lon - LON0) * R * SC, (my(LAT1) - my(lat)) * SC];
  // one stop per song, east side → riverfront → downtown → west side
  const PLACES = [[42.4115, -82.9910, 'Gratiot & Conner'], [42.4005, -82.9330, 'East English Village'], [42.3735, -82.9480, 'Jefferson-Chalmers'],
    [42.3405, -82.9800, 'Belle Isle'], [42.3480, -83.0405, 'Eastern Market'], [42.3315, -83.0465, 'Campus Martius'], [42.3310, -83.0720, 'Corktown'],
    [42.3200, -83.0930, 'Mexicantown'], [42.3560, -83.0650, 'Midtown'], [42.3690, -83.0760, 'New Center'], [42.3930, -83.0490, 'Hamtramck'],
    [42.4280, -83.0560, 'Conant Gardens'], [42.4465, -83.1080, '8 Mile & Woodward'], [42.4260, -83.1180, 'Palmer Park'], [42.3980, -83.2350, 'Rouge Park']];
  const STOPS = PLACES.map(([la, lo]) => proj(la, lo)), PIN = STOPS[0];
  // her position in each picture, so every layer lines up on her
  // the 15 painted titles cut from the back cover: [cx, cy, w, h] as a fraction of the artwork
  const TT = [[0.1355, 0.8635, 0.141, 0.062], [0.1652, 0.7755, 0.1835, 0.12], [0.186, 0.6708, 0.18, 0.0845], [0.2228, 0.5688, 0.2195, 0.0765], [0.2325, 0.4822, 0.194, 0.0825], [0.2782, 0.3738, 0.1755, 0.1025], [0.348, 0.2502, 0.193, 0.1195], [0.511, 0.1548, 0.12, 0.0495], [0.654, 0.2265, 0.148, 0.062], [0.7415, 0.3208, 0.206, 0.0975], [0.7448, 0.42, 0.1425, 0.086], [0.7735, 0.5055, 0.185, 0.049], [0.792, 0.5942, 0.163, 0.0885], [0.819, 0.688, 0.152, 0.076], [0.835, 0.7952, 0.165, 0.0835]];
  const titleImg = (i, w) => `<img class="ttl" src="img/titles/${i + 1}.webp?v=2" alt="${i + 1}. ${T[i][0]}" width="${Math.round(TT[i][2] * 2000 * w)}" draggable="false">`;
  const COVER_A = [850, 850], CROWD_A = [995, 370], ART_A = [850 - 524, 850 - 606];   // her cutout sits at (524,606) on the cover
  const COVER_TO_CROWD = 617 / 245, CROWD_SPAN = 110;   // the crowd covers a few blocks of her neighborhood

  // ---------- build stops, route, list ----------
  const stopsEl = $('#stops');
  STOPS.forEach(([x, y], i) => {
    const b = document.createElement('button'); b.className = 'stop'; b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.setProperty('--c', COL[i]);
    b.innerHTML = `<u class="beam"></u><s class="wave"></s><s class="wave w2"></s><s class="wave w3"></s><i></i><span>${titleImg(i, 1)}<em>${PLACES[i][2]}</em></span>`; b.setAttribute('aria-label', 'Play ' + T[i][0]);
    b.onclick = e => { e.stopPropagation(); play(i); };
    stopsEl.appendChild(b);
  });
  const stopEls = [...stopsEl.children];
  // smooth path through the stops
  let d = `M${STOPS[0][0]},${STOPS[0][1]}`;
  for (let i = 0; i < STOPS.length - 1; i++) {
    const p0 = STOPS[Math.max(0, i - 1)], p1 = STOPS[i], p2 = STOPS[i + 1], p3 = STOPS[Math.min(STOPS.length - 1, i + 2)];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  const route = $('#route'); route.setAttribute('d', d);
  const routeGlow = $('#routeGlow'); routeGlow.setAttribute('d', d);
  const RL = route.getTotalLength(); [route, routeGlow].forEach(r => { r.style.strokeDasharray = RL; r.style.strokeDashoffset = RL; });
  $('#pin').style.setProperty('--x', PIN[0] + 'px'); $('#pin').style.setProperty('--y', PIN[1] + 'px');

  const ol = $('#tracklist');
  T.forEach(([t], i) => {
    const li = document.createElement('li'); li.style.setProperty('--c', COL[i]);
    li.innerHTML = `<button><small>${String(i + 1).padStart(2, '0')}</small><span>${titleImg(i, .5)}</span></button>`; li.firstChild.onclick = () => play(i);
    ol.appendChild(li);
  });

  // ---------- the trip ----------
  const bgFront = $('#bgFront'), bgBack = $('#bgBack'), stage = $('.stage'), cityName = $('#city'), trip = $('#trip'), world = $('#world'), crowd = $('#crowd'), cover = $('#cover'), artist = $('#artist'), back = $('#back');
  const win = $('#win'), fog = $('#fog'), pin = $('#pin'), now = $('#now'), fanbox = $('#fanbox'), c1 = $('.c1'), c2 = $('.c2'), c3 = $('.c3'), progbar = $('#progbar');
  [crowd, cover, artist, back].forEach(e => (e.style.pointerEvents = 'none'));
  let G = {}; const measure = () => { G = { t: trip.offsetTop, h: trip.offsetHeight, vw: innerWidth, vh: innerHeight }; };
  const place = (el, ax, ay, s, sx, sy) => { el.style.transform = `translate3d(${(sx - ax * s).toFixed(1)}px,${(sy - ay * s).toFixed(1)}px,0) scale(${s.toFixed(5)})`; };
  // hidden layers are skipped entirely so the browser never paints them
  const show = (el, o) => { const v = o > 0.004; if (el._v !== v) { el.style.visibility = v ? 'visible' : 'hidden'; el._v = v; } if (v) el.style.opacity = o.toFixed(3); return v; };
  let cur = -1, cam = { X: MC[0], Y: MC[1], m: 1 }, fanMode = false;
  // world: point (X,Y) sits at screen centre, tilted back in 3D like the Belly Gang map
  const placeWorld = (X, Y, m, cx, cy, tilt, rz) => { world.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0) rotateX(${tilt.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${m.toFixed(5)}) translate(${(-X).toFixed(1)}px,${(-Y).toFixed(1)}px)`; world.style.setProperty('--tilt', tilt.toFixed(2) + 'deg'); };

  // ---- idle life: drifting warm light + chalk dust while she sits on the front or back cover
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let alive = false;
  const glow = $('#glow'), dust = $('#dust'), backShine = $('#backShine'), dctx = dust.getContext('2d');
  // floating specks cut from the paint sheet (img/specks.png), drawn about as small as the old dots
  const SPECK = [[0, 0, 48, 23], [48, 0, 48, 31], [96, 0, 46, 47], [144, 0, 48, 34], [192, 0, 48, 43], [240, 0, 48, 42], [288, 0, 48, 43], [336, 0, 37, 48], [0, 48, 48, 45], [48, 48, 48, 29], [96, 48, 48, 35], [144, 48, 48, 22], [192, 48, 40, 48], [240, 48, 48, 44], [288, 48, 42, 48], [336, 48, 48, 45], [0, 96, 44, 48], [48, 96, 38, 48], [96, 96, 48, 42], [144, 96, 48, 33], [192, 96, 48, 27], [240, 96, 48, 45], [288, 96, 48, 26], [336, 96, 33, 48], [0, 144, 48, 42], [48, 144, 48, 27], [96, 144, 48, 37], [144, 144, 36, 48], [192, 144, 48, 25], [240, 144, 48, 36], [288, 144, 28, 48], [336, 144, 34, 48], [0, 192, 48, 39], [48, 192, 48, 46], [96, 192, 48, 31], [144, 192, 37, 48], [192, 192, 48, 39], [240, 192, 48, 20], [288, 192, 46, 48], [336, 192, 40, 48]], speckImg = new Image(); speckImg.src = 'img/specks.png?v=2';
  const motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, v: .004 + Math.random() * .012, ph: Math.random() * 6.3, s: Math.random() * SPECK.length | 0, rot: Math.random() * 6.3, spin: (Math.random() - .5) * .6 }));
  const fBaseB = $('#fBaseB'), fRingB = $('#fRingB'), fBase = $('#fBase'), fRing = $('#fRing'), fHer = $('#fHer'), fTitle = $('#fTitle'), fSig = $('#fSig'), ftilt = $('#ftilt');
  const PV = [851, 875];                                   // her centre on the cover: the crowd turns around this
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; });
  const rot = (px, py, deg, s, dx = 0, dy = 0) => `translate(${px + dx}px,${py + dy}px) rotate(${deg.toFixed(3)}deg) scale(${s.toFixed(4)}) translate(${-px}px,${-py}px)`;
  function front(t, a) {
    mouse.x += (mouse.tx - mouse.x) * .06; mouse.y += (mouse.ty - mouse.y) * .06;
    const now = performance.now() / 1000, dt = Math.min(.1, now - clock.t); clock.t = now;
    const sg = surge(t); clock.front += dt * (1 + 7 * sg); const ph = clock.front;
    const sw = Math.sin(ph * .22), sw2 = Math.sin(ph * .31 + 1.3), br = .5 + .5 * Math.sin(t * .9);
    const bo = (a * sg).toFixed(3);
    // outer crowd and inner crowd turn opposite ways around her, like a crowd moving around someone standing still
    fBase.style.transform = fBaseB.style.transform = rot(PV[0], PV[1], a * (5 * sw + 1.5 * sw2), 1 + a * .16);
    if (fBaseB._o !== bo) { fBaseB.style.opacity = fRingB.style.opacity = fBaseB._o = bo; }
    fRing.style.transform = fRingB.style.transform = rot(PV[0] - 55, PV[1] - 79, -a * (8 * sw + 2.5 * Math.sin(ph * .47)), 1 + a * (.05 + .02 * br));
    fHer.style.transform = rot(PV[0] - 524, PV[1] - 606, a * .6 * sw2, 1 + a * (.035 * br), 0, -a * 10 * br);
    fTitle.style.transform = `translate3d(${(a * 10 * Math.sin(t * .4)).toFixed(1)}px,${(a * 12 * Math.sin(t * .53)).toFixed(1)}px,${(a * 160).toFixed(0)}px) rotate(${(a * 2 * Math.sin(t * .35)).toFixed(2)}deg)`;
    fSig.style.transform = `translate3d(${(a * -8 * Math.sin(t * .45)).toFixed(1)}px,${(a * 10 * Math.sin(t * .6)).toFixed(1)}px,${(a * 120).toFixed(0)}px)`;
    const ry = a * (mouse.x * 14 + 3 * Math.sin(t * .27)), rx = a * (-mouse.y * 12 + 2.5 * Math.sin(t * .33));
    ftilt.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }
  function idle(t, a0, a1, backO) {
    if (a0 > 0 || fBase._a) { front(t, a0); fBase._a = a0 > 0; }
    const a = Math.max(a0, a1), { vw, vh } = G;
    if (show(glow, a * (.75 + .25 * Math.sin(t * 1.7) * Math.sin(t * 2.9)))) glow.style.transform = `translate3d(${(Math.sin(t * .21) * vw * .12).toFixed(1)}px,${(Math.cos(t * .17) * vh * .1).toFixed(1)}px,0) scale(${(1 + .15 * Math.sin(t * .5)).toFixed(3)})`;
    if (show(backShine, a1 * backO * .35)) { const k = (t * .07) % 1; backShine.style.webkitMaskPosition = backShine.style.maskPosition = `${(150 - k * 200).toFixed(1)}% 0`; }
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (dust.width !== Math.round(vw * dpr)) { dust.width = Math.round(vw * dpr); dust.height = Math.round(vh * dpr); }
    dctx.globalAlpha = 1; dctx.setTransform(dpr, 0, 0, dpr, 0, 0); dctx.clearRect(0, 0, vw, vh);
    if (a <= .004) return;
    const S = Math.min(vw * .86, vh * .74, 640), x0 = (vw - S) / 2, y0 = (vh - S) / 2;
    for (const d of motes) {
      const y = ((d.y - t * d.v) % 1 + 1) % 1, x = d.x + .02 * Math.sin(t * .6 + d.ph);
      if (!speckImg.complete) continue;
      const q = SPECK[d.s], sz = d.r * 3.2, k = sz / Math.max(q[2], q[3]);
      dctx.globalAlpha = a * (.45 + .55 * (.5 + .5 * Math.sin(t * 1.3 + d.ph)));
      dctx.setTransform(dpr, 0, 0, dpr, 0, 0); dctx.translate(x0 + x * S, y0 + y * S); dctx.rotate(d.rot + t * d.spin);
      dctx.drawImage(speckImg, q[0], q[1], q[2], q[3], -q[2] * k / 2, -q[3] * k / 2, q[2] * k, q[3] * k);
    }
  }

  // ---- the back cover: her 15 painted song titles (cut from the artwork) circle her.
  // halo  = they travel along their original horseshoe, then slip behind her to start again
  // spiral = they wind around her in 3D
  const orbit = $('#orbit'), o3d = $('#o3d'), modeBtn = $('#orbitMode');
  const cards = T.map((t, i) => {
    const b = document.createElement('button'); b.className = 'otitle'; b.setAttribute('aria-label', 'Play ' + t[0]);
    b.innerHTML = `<img src="img/titles/${i + 1}.webp?v=2" alt="${i + 1}. ${t[0]}" draggable="false">`;
    b.onclick = () => { if (!car.moved) play(i); }; o3d.appendChild(b); return b;
  });
  const car = { a: 0, v: 0, drag: false, moved: false, x: 0, mode: 0, mix: 0, bs: 0 };
  function sizeCards() {}
  modeBtn.onclick = () => { car.pick = true; car.mode = 1 - car.mode; modeBtn.textContent = car.mode ? 'Halo' : 'Spiral'; };
  orbit.addEventListener('pointerdown', e => { car.drag = true; car.moved = false; car.x = e.clientX; car.v = 0; orbit.classList.add('drag'); });
  addEventListener('pointermove', e => { if (!car.drag) return; const dx = e.clientX - car.x; car.x = e.clientX; if (Math.abs(dx) > 2) car.moved = true; car.v = dx * .3; car.a += car.v; });
  addEventListener('pointerup', () => { if (!car.drag) return; car.drag = false; orbit.classList.remove('drag'); setTimeout(() => (car.moved = false), 0); });
  const cr = (p0, p1, p2, p3, t) => .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  // halo path: the original horseshoe, then out through the bottom edge and back in on the other side
  const PATH = TT.map(t => [t[0], t[1]]).concat([[.86, 1.02], [.8, 1.22], [.5, 1.3], [.2, 1.22], [.13, 1.02]]);
  const N = TT.length, LOOP = PATH.length;
  function halo(u) {
    const k = Math.floor(u), f = u - k, P = j => PATH[((j % LOOP) + LOOP) % LOOP];
    return [cr(P(k - 1)[0], P(k)[0], P(k + 1)[0], P(k + 2)[0], f), cr(P(k - 1)[1], P(k)[1], P(k + 1)[1], P(k + 2)[1], f), 0];
  }
  // every so often both covers surge: a quick rush of speed with motion blur, then settle back
  const surge = t => { const ph = (t + 4) % 11, ph2 = (t + 9.5) % 17; const b1 = ph < 1.9 ? Math.sin(Math.PI * ph / 1.9) ** 2 : 0, b2 = ph2 < 1.4 ? Math.sin(Math.PI * ph2 / 1.4) ** 2 * .7 : 0; return Math.max(b1, b2); };
  let clock = { t: performance.now() / 1000, front: 0 };
  function spin() {
    const sg = surge(performance.now() / 1000);
    if (!car.drag) { car.v *= .94; car.a += car.v + (Math.abs(car.v) < .25 ? (car.mode ? .1 : .05) * (1 + 9 * sg) : 0); }
    if (!car.pick) { const lap = Math.floor(car.a / (30 * LOOP)); const md = ((lap % 2) + 2) % 2; if (md !== car.mode) { car.mode = md; modeBtn.textContent = md ? 'Halo' : 'Spiral'; } }
    car.mix += (car.mode - car.mix) * .04;
    for (const k of ['left', 'top', 'width', 'height', 'transform']) orbit.style[k] = back.style[k];
    const bs = parseFloat(back.style.width) || 600, R = bs * .3, cx = bs * .52, m = car.mix * car.mix * (3 - 2 * car.mix);
    if (Math.abs(bs - car.bs) > .5) { car.bs = bs; cards.forEach((c, i) => (c.firstChild.style.width = (TT[i][2] * bs).toFixed(1) + 'px')); }
    const h = car.a / 30;
    cards.forEach((c, i) => {
      const u = (((i + h) % LOOP) + LOOP) % LOOP, H = halo(u);
      const hx = H[0] * bs, hy = H[1] * bs, hz = H[2] * bs, hd = 1 + H[2] * 1.2;
      const ang = (car.a + i * 48) * Math.PI / 180, sz = Math.cos(ang) * R, sd = (sz / R + 1) / 2;
      const sx = cx + Math.sin(ang) * R, sy = bs * (.14 + .74 * i / 14), ss = .55 + .35 * sd;
      const x = hx + (sx - hx) * m, y = hy + (sy - hy) * m, z = hz + (sz - hz) * m, s = 1 + (ss - 1) * m, d = hd + (sd - hd) * m;
      c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) translate(-50%,-50%) scale(${s.toFixed(3)})`;
      c.style.opacity = Math.max(.25, Math.min(1, .35 + .65 * d)).toFixed(2);
      const fb = sg > .05 ? `blur(${(sg * 3.5).toFixed(1)}px)` : ''; if (c._fb !== fb) { c.firstChild.style.filter = c._fb = fb; }
    });
  }

  // ---- left alone (or hovered) on the album, it flips over and keeps turning between front and back
  const flip = { face: -1, anim: false, t0: 0, swapped: false, last: performance.now(), hover: 0, next: 0, on: false };
  const poke = () => { flip.last = performance.now(); };
  addEventListener('scroll', () => { poke(); flip.face = -1; flip.anim = false; flip.hover = 0; }, { passive: true });
  ['keydown', 'touchstart', 'wheel'].forEach(ev => addEventListener(ev, poke, { passive: true }));
  addEventListener('pointermove', e => {
    poke(); const S = Math.min(G.vw * .86, G.vh * .74, 640);
    const inside = Math.abs(e.clientX - G.vw / 2) < S / 2 && Math.abs(e.clientY - G.vh / 2) < S / 2;
    flip.hover = inside ? (flip.hover || performance.now()) : 0;
  });
  document.addEventListener('pointerleave', () => (flip.hover = 0));
  function flipFace(p, vw, vh) {
    const nat = p < .5 ? 0 : 1, closed = p < .012 || (p > .993 && p <= 1);
    if (!closed || RM) { flip.endAt = 0; flip.face = -1; flip.anim = false; flip.on = false; win.style.transform = ''; return p; }
    if (flip.face < 0) flip.face = nat;
    const now = performance.now();
    // at the end it shows the back for a moment, then starts flipping on its own; at the start it waits for you to sit still
    if (nat === 1 && !flip.endAt) flip.endAt = now;
    if (nat === 0) flip.endAt = 0;
    const ready = (nat === 1 && now - flip.endAt > 1200) || now - flip.last > 4000 || (flip.hover && now - flip.hover > 2500);
    if (!flip.anim && ready && now > flip.next) { flip.anim = true; flip.t0 = now; flip.swapped = false; }
    let ang = 0;
    if (flip.anim) {
      const k = Math.min(1, (now - flip.t0) / 1200), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      if (k >= .5 && !flip.swapped) { flip.face = 1 - flip.face; flip.swapped = true; }
      ang = e < .5 ? e * 180 : e * 180 - 180;                // edge-on at the halfway point, then the other side turns in
      if (k >= 1) { flip.anim = false; flip.next = now + 4500; ang = 0; }
    }
    flip.on = ready || flip.anim || flip.face !== nat;
    win.style.transform = ang ? `perspective(1600px) rotateY(${ang.toFixed(2)}deg)` : '';
    return flip.face === nat ? p : (flip.face ? .9995 : 0);
  }

  function render() {
    const { vw, vh } = G; let p = clamp((scrollY - G.t) / (G.h - vh));
    p = flipFace(p, vw, vh);
    // album-size window: starts as the record, opens to full screen, closes back to the record at the end
    const S = Math.min(vw * .86, vh * .74, 640), open = smooth(p, .015, .07) * (1 - smooth(p, .93, .99));
    const ix = (vw - S) / 2 * (1 - open), iy = (vh - S) / 2 * (1 - open);
    const closed = 1 - open;
    if (G._S !== S) { G._S = S; stage.style.setProperty('--S', S + 'px'); }
    show(bgFront, p < .5 ? closed : 0); show(bgBack, p >= .5 ? closed : 0);
    win.style.clipPath = `inset(${iy.toFixed(1)}px ${ix.toFixed(1)}px round ${(6 * (1 - open)).toFixed(1)}px)`;
    const bs = lerp(S, Math.max(vw, vh), open); back.style.width = back.style.height = bs + 'px';
    back.style.left = ((vw - bs) / 2) + 'px'; back.style.top = ((vh - bs) / 2) + 'px';
    const sv0 = lerp(S, Math.max(vw, vh) * 1.02, smooth(p, .015, .07)) / 1704;
    const m0 = sv0 * COVER_TO_CROWD * 2000 / CROWD_SPAN, m1 = Math.max(vw / MW, vh / MH) * 1.06;
    const T0 = performance.now() / 1000, a0 = RM ? 0 : 1 - smooth(p, 0, .04), a1 = RM ? 0 : smooth(p, .965, .995); alive = a0 > 0 || a1 > 0;
    const br = .5 + .5 * Math.sin(T0 * .9), br2 = .5 + .5 * Math.sin(T0 * .9 + .9);
    let X, Y, m, A = 1, mapO = 1, backO = 0, tilt = 0, rz = 0;
    const z = clamp(p / 0.3);                                  // A: rise out of the crowd
    if (p < 0.3) {
      const ez = z < .5 ? 4 * z * z * z : 1 - Math.pow(-2 * z + 2, 3) / 2;
      m = m0 * Math.pow(m1 / m0, ez);
      const c = smooth(z, .55, 1); X = lerp(PIN[0], MC[0], c); Y = lerp(PIN[1], MC[1], c);
    } else if (p < 0.78) {                                     // B: one song at a time across the city
      const q = (p - 0.3) / 0.48, k = q * (STOPS.length - 1), i = Math.floor(k), f = k - i;
      const hold = smooth(f, .35, 1), a = STOPS[i], b = STOPS[Math.min(i + 1, STOPS.length - 1)];
      const bl = smooth(q, 0, .06);
      X = lerp(MC[0], lerp(a[0], b[0], hold), bl); Y = lerp(MC[1], lerp(a[1], b[1], hold), bl); m = m1 * lerp(1, 2.2, bl);
      tilt = 52 * bl; rz = bl * (-10 + 14 * Math.sin(k * .45));
      setStop(Math.round(k));
      route.style.strokeDashoffset = routeGlow.style.strokeDashoffset = RL * (1 - clamp(k / (STOPS.length - 1)));
    } else if (p < 0.86) {                                     // C: the whole city, drop your pin
      const c = smooth(p, .78, .82), last = STOPS[STOPS.length - 1];
      X = lerp(last[0], MC[0], c); Y = lerp(last[1], MC[1], c); m = m1 * lerp(2.2, 1, c);
      tilt = 52 * (1 - c); rz = (-10 + 14 * Math.sin(14 * .45)) * (1 - c);
      route.style.strokeDashoffset = routeGlow.style.strokeDashoffset = 0;
    } else {                                                   // D: back down to her
      const dd = (p - 0.86) / 0.14, e = smooth(dd, 0, .8);
      X = lerp(MC[0], PIN[0], smooth(dd, 0, .4)); Y = lerp(MC[1], PIN[1], smooth(dd, 0, .4)); m = m1 * Math.pow(14, e);
      mapO = 1 - smooth(dd, .35, .75); backO = smooth(dd, .45, .85);
      back.style.transform = `scale(${lerp(1.18, 1, smooth(dd, .45, .9)) * (1 + .022 * a1 * br)}) translate(${(a1 * 4 * Math.sin(T0 * .31)).toFixed(2)}px,${(a1 * 3 * Math.cos(T0 * .23)).toFixed(2)}px)`;
      for (const k of ['left', 'top', 'width', 'height', 'transform']) backShine.style[k] = back.style[k];
    }
    cam = { X, Y, m };
    const cx = vw / 2, cy = vh / 2;
    const wO = p < 0.3 ? smooth(z, .12, .32) : mapO;
    if (show(world, m > 40 ? 0 : wO)) placeWorld(X, Y, m, cx, cy, tilt, rz);
    fog.style.opacity = (tilt / 52).toFixed(3);
    show(cityName, (p < .3 ? smooth(z, .6, .85) : p < .78 ? 1 - smooth(p, .3, .34) * .75 : p < .86 ? .25 + .75 * smooth(p, .78, .82) : 1 - smooth(p, .86, .92)) * Math.max(0, Math.min(1, 1.8 - m / m1)));
    // crowd + cover + artist all hang off her pin
    const sx = cx + (PIN[0] - X) * m, sy = cy + (PIN[1] - Y) * m;
    const sc = m * CROWD_SPAN / 2000, sv = sc / COVER_TO_CROWD;
    const on = p < 0.3;
    const cb = 1 + .016 * a0 * br, sw = a0 * 5 * Math.sin(T0 * .37);
    if (show(crowd, on ? 1 - smooth(z, .3, .5) : 0)) place(crowd, CROWD_A[0], CROWD_A[1], sc, sx, sy);
    if (show(cover, on ? 1 - smooth(z, .16, .36) : 0)) place(cover, COVER_A[0], COVER_A[1], sv * cb, sx - sw, sy);
    const cf = document.getElementById('coverFull'); cf.style.pointerEvents = 'none';
    if (show(cf, on ? 1 - smooth(p, .02, .07) : 0)) place(cf, COVER_A[0], COVER_A[1], sv * cb, sx - sw, sy);
    if (show(artist, on ? (1 - smooth(z, .22, .4)) * smooth(p, .02, .07) : 0)) place(artist, ART_A[0], ART_A[1], sv * (1 + .04 * (1 - z)) * (1 + .028 * a0 * br2), sx + sw * .6, sy - 8 * (1 - z) - a0 * 6 * br2);
    idle(T0, a0, a1, backO);
    const carO = backO * smooth(p, .94, .975);
    if (show(orbit, carO)) { orbit.style.pointerEvents = carO > .5 ? 'auto' : 'none'; spin(); }
    if (show(modeBtn, carO)) { modeBtn.style.top = (vh / 2 - S / 2 + 12) + 'px'; modeBtn.style.left = (vw / 2 + S / 2 - 12) + 'px'; modeBtn.style.transform = 'translateX(-100%)'; }
    pin.style.opacity = p < 0.3 ? smooth(z, .55, .75) : 1 - smooth(p, .9, .94);
    pin.style.transform = `scale(${Math.min(2.2, m1 / m * 1.3)})`;   // stays the same size on screen
    stopsEl.style.opacity = p < 0.3 ? 0 : p < 0.86 ? smooth(p, .3, .34) : 1 - smooth(p, .86, .9);
    show(back, backO);
    // words
    c1.style.opacity = 1 - smooth(p, 0, .03);
    c2.style.opacity = smooth(p, .16, .2) * (1 - smooth(p, .27, .31));
    now.style.opacity = smooth(p, .32, .35) * (1 - smooth(p, .76, .79)); now.style.pointerEvents = p > .32 && p < .78 ? 'auto' : 'none';
    fanbox.style.opacity = smooth(p, .79, .81) * (1 - smooth(p, .85, .87)); fanMode = p > .79 && p < .86;
    c3.style.opacity = smooth(p, .94, .97); document.body.classList.toggle('end', p > .93 && p < 1.001 && scrollY < G.t + G.h);
    progbar.style.width = p * 100 + '%';
  }
  function setStop(i) {
    if (i === cur) return; cur = i;
    stopEls.forEach((s, k) => s.classList.toggle('on', k === i));
    $('#nowN').textContent = String(i + 1).padStart(2, '0') + ' / 15'; $('#nowT').textContent = T[i][0]; now.style.setProperty('--c', COL[i]);
    const cv = stopEls[i].querySelector('canvas'); if (cv) gsap.fromTo(cv, { opacity: 0 }, { opacity: 1, duration: .5, ease: 'power2.out' });
  }
  $('#nowPlay').onclick = () => play(Math.max(0, cur));

  let lastY = -1, dirty = true;
  addEventListener('resize', () => { measure(); sizeCards(); dirty = true; });
  (function loop() { if (dirty || alive || flip.on || scrollY !== lastY) { lastY = scrollY; dirty = false; render(); } requestAnimationFrame(loop); })();
  // DeJ Loaf signature in the header: back to the front cover
  $('#home').addEventListener('click', e => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); });
  // ---- merch: flip cards in two rows; tap one for its product page
  const M = (f, b) => [f, b].map(n => 'img/merch/' + (n.includes('?') ? n.replace('?', '.webp?') : n + '.webp'));
  const PIECES = [
    { n: 'Black Tee', i: M('black-tee-front', 'black-tee-back'), d: 'Washed black heavyweight tee. The crowd on the front, the handwritten tracklist on the back.', s: 1, row: 'b', l: 'Tee' },
    { n: 'Black Tote + Cap', i: M('black-tote', 'black-cap?v=3'), d: 'Black canvas tote with the cover and the cursive title, and a washed black dad cap with cursive embroidery.', row: 'b', l: 'Tote + Cap' },
    { n: 'Cream Tee', i: M('tee-front', 'tee-back'), d: 'Cream heavyweight tee. The crowd on the front, the handwritten tracklist on the back.', s: 1, row: 'c', l: 'Tee' },
    { n: 'Cream Hoodie', i: M('hoodie-front', 'hoodie-back'), d: 'Cream hoodie. Cursive chest hit, the full cover across the back, painted sleeves.', s: 1, row: 'c', l: 'Hoodie' },
    { n: 'Cream Crewneck', i: M('crew-front?v=4', 'crew-back?v=2'), d: 'Cream crewneck. Her portrait from the back cover up front, all 15 songs on the back.', s: 1, row: 'c', l: 'Crewneck' },
    { n: 'Cream Tote + Cap', i: M('tote?v=5', 'cap?v=3'), d: 'Cream canvas tote with the cover and the cursive title, and a cream dad cap with cursive embroidery.', row: 'c', l: 'Tote + Cap' },
  ];
  // two rows of cards, black then cream; each flips front/back on its own in turn or on hover, tap opens the product page
  const mcards = PIECES.map((p, k) => {
    const b = document.createElement('button'); b.className = 'mcard'; b.setAttribute('aria-label', p.n + ': open');
    b.innerHTML = `<div class="mflip"><img class="mf" src="${p.i[0]}" alt="${p.n}, front" loading="lazy"><img class="mb" src="${p.i[1]}" alt="${p.n}, back" loading="lazy"></div><span>${p.l}</span>`;
    b.onclick = () => openProd(k, b);
    b.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) { b.classList.toggle('flipped'); b._hold = Date.now() + 6000; } });
    $(p.row === 'b' ? '#mBlack' : '#mCream').appendChild(b); return b;
  });
  let mi = 0;
  if (!RM) setInterval(() => { const c = mcards[mi++ % mcards.length]; if ((c._hold || 0) > Date.now()) return; c.classList.toggle('flipped'); }, 1600);

  // product page
  const prod = $('#prod'), pitem = $('#pitem'); let pk = 0;
  function fillProd(k) {
    const p = PIECES[k]; pk = k;
    pitem.querySelector('.pf').src = p.i[0]; pitem.querySelector('.pb').src = p.i[1];
    pitem.querySelector('.pf').alt = p.n + ', front'; pitem.querySelector('.pb').alt = p.n + ', back';
    $('#prodName').textContent = p.n; $('#prodDesc').textContent = p.d;
    $('#psizes').innerHTML = p.s ? ['S', 'M', 'L', 'XL', '2XL'].map(z => `<span>${z}</span>`).join('') : '<span>One size</span>';
    prod.classList.toggle('single', p.i[0] === p.i[1]);
    pitem.className = 'pitem'; void pitem.offsetWidth; pitem.classList.add('enter');
    prod.querySelectorAll('.pthumbs button').forEach(x => x.classList.toggle('on', x.dataset.s === 'spin'));
  }
  function openProd(k, from) {
    fillProd(k);
    const r = from.getBoundingClientRect();
    prod.style.setProperty('--fx', (r.left + r.width / 2 - innerWidth / 2) + 'px'); prod.style.setProperty('--fy', (r.top + r.height / 2 - innerHeight / 2) + 'px');
    prod.hidden = false; requestAnimationFrame(() => prod.classList.add('open'));
    document.documentElement.style.overflow = 'hidden'; $('#pclose').focus({ preventScroll: true });
  }
  function closeProd() { prod.classList.remove('open'); document.documentElement.style.overflow = ''; setTimeout(() => (prod.hidden = true), 450); }
  $('#pclose').onclick = closeProd;
  prod.addEventListener('click', e => { if (e.target === prod) closeProd(); });
  addEventListener('keydown', e => { if (prod.hidden) return; if (e.key === 'Escape') closeProd(); if (e.key === 'ArrowRight') fillProd((pk + 1) % PIECES.length); if (e.key === 'ArrowLeft') fillProd((pk + PIECES.length - 1) % PIECES.length); });
  $('#pnext').onclick = () => fillProd((pk + 1) % PIECES.length);
  $('#pprev').onclick = () => fillProd((pk + PIECES.length - 1) % PIECES.length);
  prod.querySelectorAll('.pthumbs button').forEach(b => b.onclick = () => {
    prod.querySelectorAll('.pthumbs button').forEach(x => x.classList.toggle('on', x === b));
    pitem.className = 'pitem ' + (b.dataset.s === 'spin' ? '' : 'show-' + b.dataset.s);
  });

  // bake glows once so the moving 3D map never repaints CSS filters or text-shadows
  function bakeLabel(img, color) {
    const go = () => {
      const pad = 40, w = img.naturalWidth, h = img.naturalHeight, c = document.createElement('canvas');
      c.width = w + pad * 2; c.height = h + pad * 2; c.className = 'ttl baked';
      c.style.width = (img.width + pad * 2 * img.width / w) + 'px'; c.style.margin = (-pad * img.width / w) + 'px auto';
      const x = c.getContext('2d');
      x.shadowColor = color; x.shadowBlur = 22; x.drawImage(img, pad, pad);
      x.shadowColor = 'rgba(8,5,5,.95)'; x.shadowBlur = 3; for (let k = 0; k < 3; k++) x.drawImage(img, pad, pad);
      x.shadowColor = 'transparent'; x.globalCompositeOperation = 'lighter'; x.globalAlpha = .35; x.drawImage(img, pad, pad);
      c.setAttribute('role', 'img'); c.setAttribute('aria-label', img.alt); img.replaceWith(c);
    };
    img.complete && img.naturalWidth ? go() : img.addEventListener('load', go, { once: true });
  }
  document.querySelectorAll('.stop').forEach((b, i) => bakeLabel(b.querySelector('.ttl'), COL[i]));
  (async () => {
    try { await document.fonts.load("600 330px 'Space Grotesk'"); } catch (e) {}
    const c = $('#city'), x = c.getContext('2d'), F = "600 330px 'Space Grotesk', sans-serif", txt = 'DETROIT', sp = 105;
    x.font = F; const w = [...txt].reduce((a, ch) => a + x.measureText(ch).width + sp, 0) + 600;
    c.width = Math.ceil(w); c.height = 900; c.style.width = c.width + 'px'; c.style.height = c.height + 'px';
    x.font = F; x.textBaseline = 'middle'; x.fillStyle = '#ffe3d2';
    const draw = (blur, col) => { x.shadowBlur = blur; x.shadowColor = col; let px = 300; for (const ch of txt) { x.fillText(ch, px, 450); px += x.measureText(ch).width + sp; } };
    draw(260, 'rgba(230,70,60,.45)'); draw(140, 'rgba(230,70,60,.6)'); draw(60, 'rgba(255,120,90,.75)'); draw(18, 'rgba(255,190,160,.9)');
  })();
  measure(); sizeCards(); render();

  // ---------- fan pins (kept on this device) ----------
  const fans = $('#fans'), KEY = 'dejloaf-pin';
  const drawFan = () => { fans.innerHTML = ''; let p; try { p = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (p) { const f = document.createElement('span'); f.className = 'fan'; f.style.left = p.x + 'px'; f.style.top = p.y + 'px'; f.textContent = 'you'; fans.appendChild(f); }
    $('#clearFans').hidden = !p; };
  $('.stage').addEventListener('click', e => {
    if (!fanMode) return;
    const x = cam.X + (e.clientX - G.vw / 2) / cam.m, y = cam.Y + (e.clientY - G.vh / 2) / cam.m;
    if (x < 0 || y < 0 || x > MW || y > MH) return;
    try { localStorage.setItem(KEY, JSON.stringify({ x: Math.round(x), y: Math.round(y) })); } catch (err) {}
    drawFan(); gsap.from('.fan', { y: -40, opacity: 0, duration: .5, ease: 'bounce.out' });
  });
  $('#clearFans').onclick = e => { e.stopPropagation(); try { localStorage.removeItem(KEY); } catch (err) {} drawFan(); };
  $('#clearFans').style.pointerEvents = 'auto';
  drawFan();

  // ---------- player ----------
  const aud = $('#aud'), pl = $('#player'); let pi = -1;
  function ui() {
    pl.classList.toggle('playing', !aud.paused);
    stopEls.forEach((s, k) => s.classList.toggle('playing', k === pi && !aud.paused));
    [...ol.children].forEach((li, k) => li.classList.toggle('on', k === pi));
  }
  function play(i) {
    if (i === pi) { aud.paused ? aud.play() : aud.pause(); return; }
    const go = () => { pi = i; cards.forEach((c, j) => c.classList.toggle('playing', j === i)); aud.src = `audio/${T[i][1]}.m4a`; aud.volume = 0; aud.play().catch(() => {}); gsap.to(aud, { volume: 1, duration: .6 });
      $('#pt').innerHTML = titleImg(i, .3); $('#pn').textContent = String(i + 1).padStart(2, '0'); pl.style.setProperty('--c', COL[i]); ui(); };
    if (!aud.paused) gsap.to(aud, { volume: 0, duration: .3, onComplete: go }); else go();
  }
  aud.addEventListener('play', ui); aud.addEventListener('pause', ui);
  aud.addEventListener('timeupdate', () => { $('#pbar').style.width = aud.currentTime / (aud.duration || 30) * 100 + '%'; });
  aud.addEventListener('ended', () => play((pi + 1) % 15));
  $('#pp').onclick = () => play(pi < 0 ? 0 : pi);
  $('#nx').onclick = () => play((pi + 1) % 15);

  // intro: she rises into focus
  gsap.from('.stage', { opacity: 0, duration: 1.2, ease: 'power2.out' });
  gsap.from('.top', { y: -30, opacity: 0, duration: .8, delay: .3 });
})();
