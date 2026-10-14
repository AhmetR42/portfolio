import { STRINGS } from './i18n.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const PREFS_KEY = 'portfolio:prefs';
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;

const prefs = (() => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
})();
const save = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode */ } };
const t = (key) => (STRINGS[prefs.lang] ?? STRINGS.en)[key];

/* ---------- language ---------- */

/** Wraps every letter of a heading in a span so the letters can rise one after another. */
function splitLetters(el) {
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  el.textContent = '';
  [...text].forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'ch';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--i', i + (el.classList.contains('accent') ? 8 : 0));
    span.textContent = char === ' ' ? ' ' : char;
    el.append(span);
  });
}

function moveThumb(lang) {
  const button = $(`.lang [data-lang="${lang}"]`);
  const thumb = $('.lang-thumb');
  $$('.lang button').forEach((b) => b.classList.toggle('is-active', b === button));
  thumb.style.width = `${button.offsetWidth}px`;
  thumb.style.transform = `translateX(${button.offsetLeft}px)`;
}

function applyLanguage(lang) {
  const strings = STRINGS[lang] ?? STRINGS.en;
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach((el) => {
    const text = strings[el.dataset.i18n];
    if (text === undefined) return;
    el.textContent = text;
    if (el.classList.contains('split')) splitLetters(el);
  });
  typer.restart();
  moveThumb(lang);
}

function switchLanguage(lang) {
  if (lang === prefs.lang) return;
  prefs.lang = lang;
  save();
  if (calm) return applyLanguage(lang);
  // An orange panel sweeps over the page; the text changes while it covers the screen.
  const wipe = $('.wipe');
  wipe.classList.remove('is-running');
  void wipe.offsetWidth;
  wipe.classList.add('is-running');
  setTimeout(() => applyLanguage(lang), 400);
}

/* ---------- typed roles in the hero ---------- */

const typer = (() => {
  const el = $('[data-roles]');
  let timer;
  let run = 0;

  function restart() {
    clearTimeout(timer);
    const roles = t('hero.roles').split('|');
    const id = ++run;
    if (calm) { el.textContent = roles[0]; return; }
    let role = 0;
    let length = 0;
    let deleting = false;
    const step = () => {
      if (id !== run) return;
      const word = roles[role];
      length += deleting ? -1 : 1;
      el.textContent = word.slice(0, length);
      let wait = deleting ? 35 : 75;
      if (!deleting && length === word.length) { deleting = true; wait = 1900; }
      if (deleting && length === 0) { deleting = false; role = (role + 1) % roles.length; wait = 350; }
      timer = setTimeout(step, wait);
    };
    el.textContent = '';
    timer = setTimeout(step, document.body.classList.contains('is-ready') ? 300 : 1700);
  }

  return { restart };
})();

/* ---------- loader ---------- */

function loader() {
  const count = $('.loader-count');
  const done = () => {
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
  };
  if (calm) { count.textContent = '100'; return done(); }
  const start = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - start) / 1100);
    count.textContent = Math.round(100 * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(tick);
    else setTimeout(done, 150);
  };
  requestAnimationFrame(tick);
}

/* ---------- menu ---------- */

function menu() {
  const burger = $('#burger');
  const panel = $('#menu');
  const setOpen = (open) => {
    const box = burger.getBoundingClientRect();
    panel.style.setProperty('--cx', `${box.left + box.width / 2}px`);
    panel.style.setProperty('--cy', `${box.top + box.height / 2}px`);
    panel.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
    panel.inert = !open;
  };
  panel.inert = true;
  burger.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));
  $$('a', panel).forEach((link) => link.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) { setOpen(false); burger.focus(); }
  });
}

/* ---------- hero background: a field of dots that moves like water and moves away from the mouse ---------- */

function field() {
  const canvas = $('.field');
  const ctx = canvas.getContext('2d');
  const hero = $('.hero');
  const GAP = 30;
  const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999 };
  let width = 0;
  let height = 0;
  let scale = Math.min(devicePixelRatio || 1, 1.5);
  let visible = true;
  let frame = 0;
  let slowFrames = 0;
  let last = performance.now();

  const resize = () => {
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
  };

  const draw = (now) => {
    frame = requestAnimationFrame(draw);
    // Drop to a lower resolution when the device can't keep up.
    if (now - last > 30 && ++slowFrames > 40 && scale > 0.75) { scale -= 0.25; slowFrames = 0; resize(); }
    last = now;

    mouse.sx += (mouse.x - mouse.sx) * 0.12;
    mouse.sy += (mouse.y - mouse.sy) * 0.12;
    const time = now / 1000;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height * 0.45;

    for (let y = GAP / 2; y < height; y += GAP) {
      for (let x = GAP / 2; x < width; x += GAP) {
        const wave = Math.sin(time * 0.9 + x * 0.012 + y * 0.008) + Math.sin(time * 0.6 - y * 0.015);
        let px = x;
        let py = y + wave * 3.2;
        const dx = px - mouse.sx;
        const dy = py - mouse.sy;
        const dist = Math.hypot(dx, dy);
        let heat = 0;
        if (dist < 170) {
          heat = 1 - dist / 170;
          const push = heat * heat * 26;
          px += (dx / (dist || 1)) * push;
          py += (dy / (dist || 1)) * push;
        }
        // Dots fade out towards the centre, so the text stays easy to read.
        const fromCentre = Math.min(1, Math.hypot((x - cx) / (width * 0.42), (y - cy) / (height * 0.36)));
        const alpha = 0.05 + fromCentre * 0.17 + (wave + 2) * 0.02;
        const r = 1.1 + heat * 1.7 + (wave + 2) * 0.15;
        ctx.fillStyle = heat > 0.05
          ? `rgba(255, ${Math.round(166 + (1 - heat) * 60)}, 43, ${Math.min(1, alpha + heat * 0.8)})`
          : `rgba(244, 241, 236, ${alpha})`;
        ctx.fillRect(px - r / 2, py - r / 2, r, r);
      }
    }
  };

  const start = () => { if (!frame && visible) { last = performance.now(); frame = requestAnimationFrame(draw); } };
  const stop = () => { cancelAnimationFrame(frame); frame = 0; };

  resize();
  addEventListener('resize', resize);
  if (calm) { draw(0); stop(); return; }
  hero.addEventListener('pointermove', (event) => {
    const box = hero.getBoundingClientRect();
    mouse.x = event.clientX - box.left;
    mouse.y = event.clientY - box.top;
    if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
  });
  hero.addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visible ? start() : stop(); }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
}

/* ---------- scroll effects ---------- */

function countUp(el) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix ?? '';
  if (calm) { el.textContent = target + suffix; return; }
  const start = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - start) / 1600);
    el.textContent = Math.round(target * (1 - (1 - k) ** 4)) + (k === 1 ? suffix : '');
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function reveal() {
  const targets = $$('.reveal');
  if (calm || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    $$('[data-count]').forEach(countUp);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      $$('[data-count]', entry.target).forEach(countUp);
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  targets.forEach((el) => observer.observe(el));
}

/** Each project card shrinks and darkens a little as the next one slides over it. */
function stack() {
  const cards = $$('.project');
  cards.forEach((card, i) => card.style.setProperty('--n', i));
  const bar = $('.bar');
  const update = () => {
    bar.classList.toggle('is-solid', scrollY > innerHeight * 0.6);
    if (calm) return;
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const gap = next.getBoundingClientRect().top - card.getBoundingClientRect().top;
      const covered = Math.min(1, Math.max(0, 1 - gap / card.offsetHeight));
      card.style.setProperty('--depth', covered.toFixed(3));
    });
  };
  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  update();
}

/* ---------- pointer effects ---------- */

function cursor() {
  if (calm || !finePointer) return;
  const ring = $('.cursor');
  let x = -100, y = -100, rx = -100, ry = -100;
  addEventListener('pointermove', (event) => {
    x = event.clientX;
    y = event.clientY;
    ring.classList.add('is-on');
    ring.classList.toggle('is-big', Boolean(event.target.closest('a, button')));
  }, { passive: true });
  document.addEventListener('pointerleave', () => ring.classList.remove('is-on'));
  const follow = () => {
    rx += (x - rx) * 0.2;
    ry += (y - ry) * 0.2;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(follow);
  };
  follow();
}

/** Buttons that lean towards the mouse. */
function magnetic() {
  if (calm || !finePointer) return;
  $$('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (event) => {
      const box = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${(event.clientX - box.left - box.width / 2) * 0.25}px`);
      el.style.setProperty('--my', `${(event.clientY - box.top - box.height / 2) * 0.35}px`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
  });
}

/** Screenshots tilt a little towards the mouse. */
function tilt() {
  if (calm || !finePointer) return;
  $$('.project-media').forEach((media) => {
    media.addEventListener('pointermove', (event) => {
      const box = media.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      media.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
      media.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
    });
    media.addEventListener('pointerleave', () => {
      media.style.setProperty('--rx', '0deg');
      media.style.setProperty('--ry', '0deg');
    });
  });
}

function copyMail() {
  const button = $('#copy-mail');
  button.addEventListener('click', async () => {
    const label = $('[data-i18n]', button);
    try {
      await navigator.clipboard.writeText(button.dataset.mail);
      label.textContent = t('contact.copied');
      button.classList.add('is-copied');
      setTimeout(() => {
        label.textContent = t('contact.copy');
        button.classList.remove('is-copied');
      }, 1800);
    } catch { location.href = `mailto:${button.dataset.mail}`; }
  });
}

/** The site has no server, so the form opens the visitor's mail app with the message filled in. */
function contactForm() {
  const form = $('#contact-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const body = `${data.get('message')}\n\n${data.get('name')}\n${data.get('email')}`;
    location.href = `mailto:ahmet.resul.42@outlook.com?subject=${encodeURIComponent(t('form.subject'))}&body=${encodeURIComponent(body)}`;
  });
}

/* ---------- start ---------- */

prefs.lang ??= navigator.language?.startsWith('nl') ? 'nl' : 'en';
$$('.split:not([data-i18n])').forEach(splitLetters);
applyLanguage(prefs.lang);
$$('.lang button').forEach((button) => button.addEventListener('click', () => switchLanguage(button.dataset.lang)));
$('#year').textContent = new Date().getFullYear();
addEventListener('resize', () => moveThumb(prefs.lang));
document.fonts?.ready.then(() => moveThumb(prefs.lang));
menu();
field();
reveal();
stack();
cursor();
magnetic();
tilt();
copyMail();
contactForm();
loader();
