// Writes text in the back-cover chalk lettering (font/chalk.png + chalk.json). Each letter keeps its own chalk color.
// Any element with class "chalk" and data-text gets a canvas. data-size = cap height in px (or a fraction of width if < 1).
window.Chalk = (() => {
  let M, img;
  const ready = Promise.all([
    fetch('font/chalk.json?v=1').then(r => r.json()).then(j => (M = j)),
    new Promise(r => { img = new Image(); img.onload = r; img.src = 'font/chalk.png?v=2'; })
  ]);
  const MAP = { '’': "'", '‘': "'", '"': '“', '—': '-', '–': '-', '·': '.' };
  const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const glyph = ch => M.g[MAP[ch] || ch] || M.g[(MAP[ch] || ch).toUpperCase()];

  function layout(text, size, maxW) {
    const s = size / M.cap, tr = M.cap * 0.04, sp = M.cap * 0.32;
    const ww = w => [...w].reduce((a, ch) => { const g = glyph(ch); return a + (g ? g[2] + tr : sp); }, 0) - tr;
    const lines = [];
    for (const para of String(text).split('\n')) {
      let line = [], lw = 0;
      for (const w of para.split(/ +/).filter(Boolean)) {
        const wl = ww(w) * s, add = (line.length ? sp * s : 0) + wl;
        if (line.length && lw + add > maxW) { lines.push({ words: line, w: lw }); line = []; lw = 0; }
        lw += (line.length ? sp * s : 0) + wl; line.push(w);
      }
      lines.push({ words: line, w: lw });
    }
    return { lines, s, tr, sp, lineH: size * 1.35 };
  }
  // o: {x, y, w, size, align, p (0..1 write-on), seed, alpha}
  function paint(ctx, text, o) {
    const L = layout(text, o.size, o.w), r = rnd(o.seed || 9);
    let total = 0; L.lines.forEach(l => l.words.forEach(w => (total += [...w].length)));
    const shown = (o.p ?? 1) * total; let i = 0;
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.imageSmoothingQuality = 'high';
    // dark halo baked into the letters so they read over the busy map
    ctx.shadowColor = 'rgba(8,5,5,.9)'; ctx.shadowBlur = Math.max(4, o.size * .22);
    L.lines.forEach((l, li) => {
      let x = o.x + (o.align === 'center' ? (o.w - l.w) / 2 : o.align === 'right' ? o.w - l.w : 0);
      const base = o.y + o.size * 1.15 + li * L.lineH;
      l.words.forEach((w, wi) => {
        if (wi) x += L.sp * L.s;
        for (const ch of w) {
          const g = glyph(ch), jy = (r() - .5) * o.size * .03;
          if (!g) { x += L.sp * L.s; i++; continue; }
          const f = Math.max(0, Math.min(1, shown - i));
          if (f > 0) ctx.drawImage(img, g[0], g[1], Math.max(1, g[2] * f), g[3], x, base - g[4] * L.s + jy, g[2] * L.s * f, g[3] * L.s);
          x += (g[2] + L.tr) * L.s; i++;
        }
      });
    });
    ctx.restore();
    return L.lines.length * L.lineH + o.size * .5;
  }
  function mount(el) {
    const c = el.querySelector('canvas') || el.appendChild(document.createElement('canvas'));
    const st = el._ch || { p: 1 };
    st.draw = () => {
      const text = el.dataset.text, ds = +el.dataset.size || 40;
      const w = el.dataset.fit ? Math.ceil(layout(text, ds < 1 ? 40 : ds, 1e9).lines.reduce((a, l) => Math.max(a, l.w), 0)) + 8 : el.clientWidth;
      if (!w) return;
      const size = ds < 1 ? w * ds : ds, dpr = Math.min(2, devicePixelRatio || 1);
      const L = layout(text, size, w), H = L.lines.length * L.lineH + size * .5;
      c.width = Math.ceil(w * dpr); c.height = Math.ceil(H * dpr); c.style.width = w + 'px'; c.style.height = H + 'px';
      const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(x, text, { x: 0, y: 0, w, size, align: el.dataset.align || 'left', p: st.p, seed: text.length * 13 });
    };
    st.set = t => { el.dataset.text = t; el.setAttribute('aria-label', t); st.draw(); };
    el._ch = st; el.setAttribute('role', 'img'); el.setAttribute('aria-label', el.dataset.text); st.draw();
    return st;
  }
  ready.then(() => {
    document.querySelectorAll('.chalk').forEach(mount);
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => document.querySelectorAll('.chalk').forEach(e => e._ch && e._ch.draw()), 150); });
    document.dispatchEvent(new Event('chalk:ready'));
  });
  return { ready, paint, layout, mount };
})();
