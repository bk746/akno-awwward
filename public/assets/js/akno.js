/* AKNO — moteur « interrupteur de lumière ». Vanilla, sans dépendance. */
(() => {
  const d = document, html = d.documentElement, W = window;
  const RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- 1. Rideau : allumer la page ---------- */
  const cur = $('.curtain'), csw = cur && $('.sw', cur);
  const first = !sessionStorage.getItem('akno-seen');
  async function openCurtain() {
    if (!cur) return ready();
    if (RM) { cur.classList.add('is-open', 'is-gone'); return ready(); }
    await wait(first ? 380 : 120);
    csw.classList.add('is-on');
    await wait(first ? 420 : 260);
    cur.classList.add('is-line');
    await wait(first ? 380 : 220);
    cur.classList.add('is-open');
    ready();
    await wait(950);
    cur.classList.add('is-gone');
    sessionStorage.setItem('akno-seen', '1');
  }
  function ready() { html.classList.add('is-ready'); }
  const internal = a => {
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-contact')) return false;
    const h = a.getAttribute('href') || '';
    if (!h || h.startsWith('#') || /^(mailto|tel|javascript):/.test(h)) return false;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return false;
    if (u.pathname === location.pathname && u.hash) return false;
    return true;
  };
  d.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!internal(a) || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || RM || !cur) return;
    e.preventDefault();
    cur.classList.remove('is-gone', 'is-open', 'is-line'); cur.classList.add('is-closing');
    csw.classList.add('is-on');
    setTimeout(() => csw.classList.remove('is-on'), 520);
    setTimeout(() => { location.href = a.href; }, 860);
  });
  W.addEventListener('pageshow', e => { if (e.persisted && cur) { cur.classList.add('is-open', 'is-gone'); cur.classList.remove('is-closing'); } });

  /* ---------- 2. Interrupteur global « Lumière » ---------- */
  const syncLights = () => $$('[data-lights]').forEach(b => {
    const on = html.classList.contains('lights-on');
    b.setAttribute('aria-pressed', on); const t = $('.lights__t', b); if (t) t.textContent = on ? 'Lumière ON' : 'Lumière OFF';
  });
  syncLights();
  $$('[data-lights]').forEach(b => b.addEventListener('click', e => {
    const flip = () => { html.classList.toggle('lights-on'); localStorage.setItem('akno-lights', html.classList.contains('lights-on') ? '1' : '0'); syncLights(); tone(); };
    if (!d.startViewTransition || RM) return flip();
    const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    d.startViewTransition(flip).ready.then(() => {
      html.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] }, { duration: 900, easing: 'cubic-bezier(.77,0,.18,1)', pseudoElement: '::view-transition-new(root)' });
    });
  }));

  /* ---------- 3. Header : ton auto + masquage ---------- */
  const hdr = $('.hdr'); const toned = $$('[data-tone]').filter(el => !el.closest('.hdr,.sheet,.mmenu,.smart'));
  function tone() {
    const y = 40; let t = 'night';
    for (const el of toned) { const r = el.getBoundingClientRect(); if (r.top <= y && r.bottom > y) t = el.dataset.tone; }
        html.dataset.hdr = t;
  }
  let lastY = scrollY, smDown = false;

  /* ---------- 4. Split des titres ---------- */
  $$('.split').forEach(el => {
    let i = 0;
    const walk = n => [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const frag = d.createDocumentFragment();
        c.textContent.split(/([ \t\n\r]+)/).forEach(p => {
          if (!p) return;
          if (/^[ \t\n\r]+$/.test(p)) { frag.appendChild(d.createTextNode(' ')); return; }
          const w = d.createElement('span'); w.className = 'w'; const s = d.createElement('span'); s.textContent = p; s.style.setProperty('--i', i++); w.appendChild(s); frag.appendChild(w);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && !c.classList.contains('w')) walk(c);
    });
    walk(el);
  });

  /* ---------- 5. Révélations + marqueurs ON ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; el.classList.add('is-in', 'is-on');
    if (el.classList.contains('split')) setTimeout(() => el.classList.add('is-done'), 1700);
    const st = $('.mark__state', el); if (st) st.textContent = 'ON';
    io.unobserve(el);
  }), { rootMargin: '0px 0px -12% 0px', threshold: .12 });
  const later = () => $$('[data-reveal],[data-flick],.split,[data-on],.mark').forEach(el => {
    if (el.closest('.hero') && !html.classList.contains('is-ready')) return;
    io.observe(el);
  });
  const heroIn = () => $$('.hero [data-reveal],.hero [data-flick],.hero .split,.hero .mark,.phero .split,.phero [data-reveal],.phero .mark,.cs-hero .split,.cs-hero [data-reveal]').forEach(el => io.observe(el));

  /* ---------- 6. Lampe torche (spot) ---------- */
  $$('[data-spot]').forEach(s => s.addEventListener('pointermove', e => {
    const r = s.getBoundingClientRect(); s.style.setProperty('--mx', (e.clientX - r.left) + 'px'); s.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true }));

  /* ---------- 7. Poussière dans le faisceau ---------- */
  const cv = $('.dust');
  if (cv && !RM) {
    const ctx = cv.getContext('2d'); let w, h, dpr = Math.min(2, devicePixelRatio || 1), parts = [], run = true;
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    const N = innerWidth < 700 ? 34 : 70;
    for (let i = 0; i < N; i++) parts.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .3, s: Math.random() * .00025 + .00006, o: Math.random() * .6 + .2, p: Math.random() * 6.28 });
    new IntersectionObserver(([e]) => { run = e.isIntersecting; if (run) requestAnimationFrame(draw); }).observe(cv);
    function draw(t) {
      if (!run) return; ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.s * 16; p.x += Math.sin(t / 2400 + p.p) * .00018; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        const cx = .62 + (p.y) * .12, inBeam = Math.abs(p.x - cx) < .08 + p.y * .2;
        ctx.globalAlpha = p.o * (inBeam ? 1 : .18) * (.6 + .4 * Math.sin(t / 700 + p.p));
        ctx.fillStyle = inBeam ? '#c9c9ff' : '#8a8acc'; ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(draw);
    }
  }

  /* ---------- 8. Curseur-interrupteur ---------- */
  if (FINE && !RM) {
    html.classList.add('has-cursor');
    const c = d.createElement('div'); c.className = 'cur'; c.innerHTML = '<span class="cur__t"></span>'; d.body.appendChild(c);
    let x = -100, y = -100, cx = x, cy = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; c.classList.add('is-moved'); }, { passive: true });
    d.addEventListener('pointerleave', () => c.classList.remove('is-moved'));
    d.documentElement.addEventListener('mouseleave', () => c.classList.remove('is-moved'));
    (function loop() { cx += (x - cx) * .22; cy += (y - cy) * .22; c.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
    d.addEventListener('pointerover', e => {
      const v = e.target.closest('[data-view]'), l = e.target.closest('a,button,summary,label,input,select,textarea');
      c.classList.toggle('is-view', !!v); c.classList.toggle('is-link', !v && !!l);
      $('.cur__t', c).textContent = v ? v.dataset.view : '';
    });
  }

  /* ---------- 9. Scroll : textes qui s'allument, scène, cas, méthode ---------- */
  const probs = $$('.prob'), scene = $('.switch-scene'), cases = $$('.case,.cs-hero'), wires = $$('.steps'), steps = $$('.step'), fbig = $('.ftr__big');
  const ssw = scene && $('.ss__sw', scene), sl = scene && $('.ss__light', scene), sk = scene && $('.ss__sw i', scene), sdk = scene && $('.ss__dark', scene);
  function onScroll() {
    const vh = innerHeight, y = scrollY;
    tone();
    smDown = y > lastY + 1 ? true : (y < lastY - 1 ? false : smDown);
    if (hdr) { hdr.classList.toggle('is-scrolled', y > 40); const dn = y > lastY && y > 500 && !html.classList.contains('menu-open'); hdr.classList.toggle('is-hidden', dn); lastY = y; }
    probs.forEach(p => { const r = p.getBoundingClientRect(), c = r.top + r.height / 2; p.classList.toggle('is-lit', c > vh * .25 && c < vh * .72); });
    if (scene) {
      const r = scene.getBoundingClientRect(), p = clamp(-r.top / (r.height - vh));
      const k = clamp((p - .08) / .3); sk.style.setProperty('--k', RM ? (p > .4 ? 1 : 0) : k);
      ssw.classList.toggle('is-on', k >= 1);
      const sr = ssw.getBoundingClientRect(), cx = sr.left + sr.width * .78, cy = sr.top + sr.height / 2;
      const f = clamp((p - .42) / .36), R = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, vh - cy)) * 1.05;
      sl.style.setProperty('--cx', cx + 'px'); sl.style.setProperty('--cy', cy + 'px'); sl.style.setProperty('--r', (f * f * R) + 'px');
      sdk.style.opacity = 1 - clamp((p - .38) / .07);
    }
    cases.forEach(c => { const r = c.getBoundingClientRect(); const p = clamp(1 - (r.top / vh)); c.style.setProperty('--p', c.classList.contains('cs-hero') ? 1 : p.toFixed(3)); });
    wires.forEach(wi => { const r = wi.getBoundingClientRect(); const p = clamp((vh * .75 - r.top) / (r.height + vh * .2)); wi.style.setProperty('--p', p.toFixed(3)); });
    steps.forEach((s, i) => { const r = s.getBoundingClientRect(); s.classList.toggle('is-on', r.top < vh * .7); });
    if (fbig) { const r = fbig.getBoundingClientRect(); fbig.classList.toggle('is-on', r.top < vh * .82); }
    smart();
  }
  let tick = false;
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(() => { onScroll(); tick = false; }); } }, { passive: true });
  addEventListener('resize', onScroll);

  /* ---------- 10. CTA intelligent ---------- */
  const sm = $('.smart'), smT = sm && $('.smart__txt b', sm);
  const ctaZones = $$('[data-cta]');
  function smart() {
    if (!sm) return;
    const vh = innerHeight; let label = null, hide = scrollY < vh * .7;
    for (const z of ctaZones) { const r = z.getBoundingClientRect(); if (z.dataset.cta === 'hide') { if (r.top < vh - 30 && r.bottom > vh * .45) hide = true; } else if (r.top < vh * .6 && r.bottom > vh * .6) label = z.dataset.cta; }
    if (smDown) hide = true;
    if ($('.sheet.is-open') || html.classList.contains('menu-open')) hide = true;
    sm.classList.toggle('is-on', !hide);
    const l = label || sm.dataset.default;
    if (smT.textContent !== l) { smT.style.opacity = 0; setTimeout(() => { smT.textContent = l; smT.style.opacity = 1; }, 200); }
  }

  /* ---------- 11. Index projets : image qui suit ---------- */
  const pimg = $('.prow__img');
  if (pimg && FINE) {
    const im = $('img', pimg);
    $$('.prow').forEach(r => {
      r.addEventListener('pointerenter', () => { im.src = r.dataset.img; pimg.classList.add('is-on'); });
      r.addEventListener('pointerleave', () => pimg.classList.remove('is-on'));
    });
    addEventListener('pointermove', e => { pimg.style.left = e.clientX + 'px'; pimg.style.top = e.clientY + 'px'; }, { passive: true });
  }

  /* ---------- 12. Copilot ---------- */
  $$('[data-tabs]').forEach(g => {
    const tabs = $$('[role=tab]', g), imgs = $$('.device__screens img', g);
    const sel = i => { tabs.forEach((t, j) => { t.setAttribute('aria-selected', i === j); t.tabIndex = i === j ? 0 : -1; }); imgs.forEach((m, j) => m.classList.toggle('is-on', i === j)); };
    tabs.forEach((t, i) => { t.addEventListener('click', () => sel(i)); t.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); sel((i + 1) % tabs.length); tabs[(i + 1) % tabs.length].focus(); } if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); const n = (i + tabs.length - 1) % tabs.length; sel(n); tabs[n].focus(); } }); });
  });

  /* ---------- 13. Vidéos : lecture/pause + hors-écran ---------- */
  const primeVideo = v => {
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.loop = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.setAttribute('autoplay', '');
  };
  const playVideo = v => {
    primeVideo(v);
    const p = v.play();
    return p ? p.catch(() => false) : Promise.resolve(false);
  };
  const unlockVideo = v => {
    const kick = () => { if (!v.paused) return; playVideo(v); };
    ['pointerdown', 'touchstart', 'keydown', 'scroll', 'wheel', 'click'].forEach(ev => {
      W.addEventListener(ev, kick, { once: true, passive: true });
    });
  };
  $$('video[data-auto]').forEach(v => {
    const b = v.parentElement.querySelector('.reel__play'); let user = false; let visible = true;
    const setIco = () => { if (b) b.innerHTML = v.paused ? '<svg><use href="#i-play"/></svg>' : '<svg><use href="#i-pause"/></svg>'; if (b) b.setAttribute('aria-label', v.paused ? 'Lire le showreel' : 'Mettre le showreel en pause'); };
    primeVideo(v);
    if (RM) { v.removeAttribute('autoplay'); v.pause(); setIco(); return; }
    const start = () => {
      if (user || RM || !visible) return;
      playVideo(v).then(() => {
        if (!v.paused) return;
        let n = 0;
        const retry = () => {
          if (user || RM || !visible || !v.paused) return;
          playVideo(v).then(() => { if (v.paused && ++n < 10) setTimeout(retry, 280); else if (v.paused) unlockVideo(v); });
        };
        setTimeout(retry, 120);
      });
    };
    if (v.readyState >= 2) start();
    else {
      v.addEventListener('loadeddata', start, { once: true });
      v.addEventListener('canplay', start, { once: true });
      try { v.load(); } catch (e) {}
    }
    start();
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (user || RM) return;
      visible ? start() : v.pause();
    }, { threshold: 0.01 }).observe(v);
    v.addEventListener('play', setIco); v.addEventListener('pause', setIco);
    b && b.addEventListener('click', () => { user = true; v.paused ? playVideo(v) : v.pause(); });
    setIco();
  });

  /* ---------- 13b. Captures pleine page : défilement auto dans le cadre ---------- */
  $$('[data-autoscroll]').forEach(m => {
    const img = m.querySelector('img'); if (!img) return;
    if (RM) { img.style.transform = 'translate3d(0,0,0)'; return; }
    const P = 1500, ease = x => -(Math.cos(Math.PI * x) - 1) / 2;
    let dist = 0, D = 0, U = 0, T = 0, t = 0, last = 0, raf = 0, vis = false, hover = false;
    const measure = () => {
      dist = Math.max(0, img.offsetHeight - m.clientHeight);
      D = Math.min(25000, Math.max(12000, dist / 0.09)); U = Math.min(7000, Math.max(3500, D * .32)); T = P + D + P + U;
    };
    const pos = tt => { tt %= T; if (tt < P) return 0; tt -= P; if (tt < D) return ease(tt / D) * dist; tt -= D; if (tt < P) return dist; tt -= P; return (1 - ease(tt / U)) * dist; };
    const frame = now => {
      const dt = Math.min(64, now - (last || now)); last = now;
      if (vis && !hover && dist > 0) { t += dt; img.style.transform = `translate3d(0,${-pos(t).toFixed(1)}px,0)`; }
      raf = (vis && !hover) ? requestAnimationFrame(frame) : 0; if (!raf) last = 0;
    };
    const kick = () => { if (!raf && vis && !hover) { last = 0; raf = requestAnimationFrame(frame); } };
    const ready = () => { measure(); kick(); };
    const onResize = () => { const r = dist ? pos(t) / dist : 0; measure(); if (dist) img.style.transform = `translate3d(0,${-(r * dist).toFixed(1)}px,0)`; };
    const onEnter = () => { hover = true; };
    const onLeave = () => { hover = false; kick(); };
    img.complete && img.naturalHeight ? measure() : img.addEventListener('load', ready, { once: true });
    addEventListener('resize', onResize);
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting && e.intersectionRatio >= .45; if (vis) { if (!dist) measure(); kick(); } }, { threshold: [0, .45, .6, 1] });
    io.observe(m);
    const fig = m.closest('.case__frame') || m;
    if (FINE) { fig.addEventListener('pointerenter', onEnter); fig.addEventListener('pointerleave', onLeave); }
    addEventListener('pagehide', () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      removeEventListener('resize', onResize);
      fig.removeEventListener('pointerenter', onEnter);
      fig.removeEventListener('pointerleave', onLeave);
    }, { once: true });
  });

  /* ---------- 14. Menu mobile ---------- */
  const bg = $('.burger');
  bg && bg.addEventListener('click', () => { const o = html.classList.toggle('menu-open'); bg.setAttribute('aria-expanded', o); d.body.style.overflow = o ? 'hidden' : ''; smart(); });
  $$('.mmenu a').forEach(a => a.addEventListener('click', () => { html.classList.remove('menu-open'); d.body.style.overflow = ''; }));

  /* ---------- 15. Formulaire premium (overlay + page contact) ---------- */
  const sheet = $('.sheet'); let lastFocus = null;
  function openSheet(e, preset) {
    if (!sheet) return false;
    lastFocus = d.activeElement;
    const x = e && e.clientX ? e.clientX : innerWidth - 80, y = e && e.clientY ? e.clientY : innerHeight - 60;
    sheet.style.setProperty('--ox', x + 'px'); sheet.style.setProperty('--oy', y + 'px');
    sheet.classList.add('is-open'); sheet.setAttribute('aria-hidden', 'false'); d.body.style.overflow = 'hidden'; html.classList.remove('menu-open');
    if (preset) { const f = $(`input[value="${preset}"]`, sheet); if (f) f.checked = true; }
    setTimeout(() => { const f = $('fieldset.is-cur input, fieldset.is-cur button', sheet); f && f.focus(); }, 500);
    smart(); return true;
  }
  function closeSheet() { if (!sheet) return; sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true'); d.body.style.overflow = ''; lastFocus && lastFocus.focus(); smart(); }
  d.addEventListener('click', e => { const a = e.target.closest('[data-contact]'); if (!a) return; if (openSheet(e, a.dataset.contact)) e.preventDefault(); });
  sheet && $('.sheet__close', sheet).addEventListener('click', closeSheet);
  d.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheet && sheet.classList.contains('is-open')) closeSheet();
    if (e.key === 'Tab' && sheet && sheet.classList.contains('is-open')) {
      const f = $$('a,button,input,textarea,select', sheet).filter(n => n.offsetParent !== null); if (!f.length) return;
      if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  $$('form.form').forEach(form => {
    const sets = $$('fieldset', form), track = $('.form__track', form), stepN = $('.form__step', form);
    let i = 0;
    const go = n => { i = clamp(n, 0, sets.length - 1); sets.forEach((s, j) => s.classList.toggle('is-cur', j === i)); track && track.style.setProperty('--fp', (i + 1) / sets.length); if (stepN) stepN.textContent = `Étape ${i + 1} / ${sets.length}`; $('.form__back', form).hidden = i === 0; $('.form__next', form).hidden = i === sets.length - 1; $('.form__send', form).hidden = i !== sets.length - 1; };
    const err = (name, msg) => { const f = form.elements[name]; const w = f.closest('.fld'); w.classList.toggle('is-bad', !!msg); $('.fld__err', w).textContent = msg || ''; if (msg) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid'); return !msg; };
    const vName = () => err('name', form.elements.name.value.trim() ? '' : 'Indique ton nom.');
    const vMail = () => err('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.elements.email.value.trim()) ? '' : 'Email invalide.');
    const vSubj = () => err('subject', form.elements.subject.value.trim() ? '' : "Indique l'objet de ton message.");
    form.elements.name.addEventListener('blur', vName); form.elements.email.addEventListener('blur', vMail); form.elements.subject.addEventListener('blur', vSubj);
    $('.form__next', form).addEventListener('click', () => {
      if (i === 0) { const ch = $$('input[name=service]:checked', form).map(c => c.closest('label').textContent.trim()); const s = form.elements.subject; if (ch.length && !s.dataset.touched) s.value = ch.join(' + '); }
      go(i + 1); const f = $('fieldset.is-cur input', form); f && f.focus();
    });
    form.elements.subject.addEventListener('input', e => e.target.dataset.touched = 1);
    $('.form__back', form).addEventListener('click', () => go(i - 1));
    go(0);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (i !== sets.length - 1) { $('.form__next', form).click(); return; }
      if (![vName(), vMail(), vSubj()].every(Boolean)) return;
      const btn = $('.form__send', form), lab = $('.btn__l', btn), out = $('.form__err', form); out.textContent = ''; out.classList.remove('is-info');
      const data = { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), subject: form.elements.subject.value.trim(), budget: (($('input[name=budget]:checked', form) || {}).value || ''), message: form.elements.message.value.trim(), service: $$('input[name=service]:checked', form).map(c => c.value).join(', '), companyWebsite: form.elements.companyWebsite.value };
      btn.disabled = true; lab.textContent = 'Envoi…';
      try {
        const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (r.status === 429) throw new Error('rate');
        if (!r.ok) throw new Error('http');
        form.classList.add('is-done');
      } catch (x) {
        btn.disabled = false; lab.textContent = 'Envoyer ma demande';
        if (x.message === 'rate') { out.textContent = 'Trop de tentatives. Réessaie dans une minute.'; return; }
        const bl = $('input[name=budget]:checked', form);
        const body = `Nom : ${data.name}\nE-mail : ${data.email}\nService : ${data.service || '—'}\nBudget : ${bl ? bl.dataset.label : '—'}\n\n${data.message}`;
        const href = `mailto:aknoweb.contact@gmail.com?subject=${encodeURIComponent('[AKNO] ' + data.subject)}&body=${encodeURIComponent(body)}`;
        out.classList.add('is-info'); out.innerHTML = `Envoi direct indisponible sur cette version. <a href="${href}">Ouvrir ma messagerie avec ma demande pré-remplie</a> ou écris à aknoweb.contact@gmail.com.`;
      }
    });
  });

  /* ---------- Go ---------- */
  later(); tone(); onScroll();
  openCurtain().then(() => {});
  const chk = setInterval(() => { if (html.classList.contains('is-ready')) { clearInterval(chk); heroIn(); } }, 50);
  console.log('%c akn%c● %c Le site est un interrupteur. Bonne visite.', 'font:900 22px sans-serif;color:#fff;background:#06060a;padding:6px 0 6px 10px', 'font:900 22px sans-serif;color:#5b5bef;background:#06060a;padding:6px 10px 6px 0', 'color:#888');
})();
