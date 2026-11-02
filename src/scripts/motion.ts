/**
 * Alle Animationen & Interaktionen der Seite.
 * Läuft bei jedem Seitenwechsel (Astro View Transitions) neu über `astro:page-load`.
 */
import Lenis from 'lenis';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));

let cleanups: (() => void)[] = [];
const onCleanup = (fn: () => void) => cleanups.push(fn);

/* ---------------- Smooth scroll (persistent) ---------------- */
let lenis: Lenis | null = null;
function initLenis() {
  if (lenis || reduced()) return;
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  const raf = (time: number) => {
    lenis!.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}
/** Lenis scrollt nativ, daher genügt ein normaler Scroll-Listener (rAF-gedrosselt). */
function onScroll(fn: () => void) {
  let queued = false;
  const handler = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(); });
  };
  addEventListener('scroll', handler, { passive: true });
  onCleanup(() => removeEventListener('scroll', handler));
  fn();
}

/* ---------------- Preloader (nur erster Besuch pro Sitzung) ---------------- */
function initPreloader() {
  const el = $('[data-preloader]');
  if (!el || document.documentElement.classList.contains('no-preload')) return;
  const count = $('[data-preloader-count]', el)!;
  const start = performance.now();
  const dur = 1400;
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
    if (p < 1) requestAnimationFrame(tick);
    else {
      el.classList.add('is-done');
      try { sessionStorage.setItem('fb-intro', '1'); } catch {}
      setTimeout(() => document.documentElement.classList.add('no-preload'), 1000);
    }
  };
  requestAnimationFrame(tick);
}

/* ---------------- Header ---------------- */
function initHeader() {
  const header = $('[data-header]');
  if (!header) return;
  let last = scrollY;
  onScroll(() => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const down = y > last && y > 300;
    header.classList.toggle('is-hidden', down && !document.body.classList.contains('menu-open'));
    last = y;
  });
}

/* ---------------- Menü ---------------- */
function initMenu() {
  const btn = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  if (!btn || !menu) return;
  const label = $('[data-menu-label]', btn)!;
  const openLabel = label.textContent ?? 'Menu';
  const closeLabel = document.documentElement.lang.startsWith('de') ? 'Schliessen' : 'Close';
  const links = $$('a', menu);
  const set = (open: boolean) => {
    document.body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    links.forEach((a) => (a.tabIndex = open ? 0 : -1));
    label.textContent = open ? closeLabel : openLabel;
    if (open) { lenis?.stop(); links[0]?.focus({ preventScroll: true }); } else lenis?.start();
  };
  const toggle = () => set(!document.body.classList.contains('menu-open'));
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { set(false); btn.focus(); } };
  btn.addEventListener('click', toggle);
  document.addEventListener('keydown', onKey);
  onCleanup(() => { document.removeEventListener('keydown', onKey); set(false); });
}

/* ---------------- Reveal & Split ---------------- */
function initReveal() {
  const els = $$('[data-reveal], [data-split]');
  if (!('IntersectionObserver' in window) || reduced()) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }),
    // threshold 0: Chrome rechnet clip-path in die Sichtbarkeit ein (Ratio bleibt 0 bei inset(100%))
    { rootMargin: '0px 0px -8% 0px', threshold: 0 },
  );
  els.forEach((el) => io.observe(el));
  onCleanup(() => io.disconnect());
}

/* ---------------- Magnetische Buttons ---------------- */
function initMagnetic() {
  if (!finePointer() || reduced()) return;
  $$('[data-magnetic]').forEach((el) => {
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    };
    const leave = () => (el.style.transform = '');
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
  });
}

/* ---------------- Cursor (persistent) ---------------- */
let cursorReady = false;
function initCursor() {
  if (cursorReady || !finePointer()) return;
  const el = $('[data-cursor-el]');
  if (!el) return;
  cursorReady = true;
  document.documentElement.classList.add('has-cursor');
  const text = $('[data-cursor-text]', el)!;
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
  const loop = () => {
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();
  document.addEventListener('pointerover', (e) => {
    const target = e.target as HTMLElement;
    const labelled = target.closest<HTMLElement>('[data-cursor]');
    if (labelled) {
      text.textContent = labelled.dataset.cursor ?? '';
      el.classList.add('is-label');
      el.classList.remove('is-link');
      return;
    }
    el.classList.remove('is-label');
    el.classList.toggle('is-link', Boolean(target.closest('a, button, label, summary, [data-cursor-link]')));
  });
  document.addEventListener('pointerleave', () => el.classList.remove('is-label', 'is-link'));
}

/* ---------------- Parallax ---------------- */
function initParallax() {
  if (reduced()) return;
  const els = $$('[data-parallax]');
  if (!els.length) return;
  onScroll(() => {
    const vh = innerHeight;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const speed = parseFloat(el.dataset.parallax || '0.15');
      const offset = (r.top + r.height / 2 - vh / 2) * speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  });
}

/* ---------------- Hero-Slideshow ---------------- */
function initHero() {
  const hero = $('[data-hero]');
  if (!hero) return;
  const slides = $$('.hero__slide', hero);
  const dots = $$('[data-hero-dot]', hero);
  const meta = $('[data-hero-meta]', hero);
  if (slides.length < 2) return;
  const dur = 6000;
  hero.style.setProperty('--slide-dur', `${dur}ms`);
  let i = 0;
  let timer = 0;
  const show = (n: number) => {
    slides[i].classList.remove('is-active');
    dots[i]?.classList.remove('is-active');
    dots[i]?.setAttribute('aria-current', 'false');
    i = (n + slides.length) % slides.length;
    const img = $('img', slides[i]) as HTMLImageElement | null;
    if (img && img.loading === 'lazy') img.loading = 'eager';
    slides[i].classList.add('is-active');
    // Fortschrittsbalken neu starten
    const dot = dots[i];
    if (dot) { dot.classList.remove('is-active'); void dot.offsetWidth; dot.classList.add('is-active'); dot.setAttribute('aria-current', 'true'); }
    if (meta) meta.textContent = slides[i].dataset.meta ?? '';
    schedule();
  };
  let paused = reduced();
  let hovering = false;
  const pauseBtn = $<HTMLButtonElement>('[data-hero-pause]', hero);
  let started = 0;
  let remaining = dur;
  const schedule = (ms = dur) => {
    clearTimeout(timer);
    remaining = ms;
    if (paused || hovering) return;
    started = performance.now();
    timer = window.setTimeout(() => show(i + 1), ms);
  };
  const hold = () => { clearTimeout(timer); remaining = Math.max(500, remaining - (performance.now() - started)); hero.classList.add('is-paused'); };
  const release = () => { if (paused || hovering) return; hero.classList.remove('is-paused'); schedule(remaining); };
  const setPaused = (v: boolean) => {
    paused = v;
    pauseBtn?.setAttribute('aria-pressed', String(v));
    pauseBtn?.setAttribute('aria-label', (v ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause) ?? '');
    v ? hold() : release();
  };
  pauseBtn?.addEventListener('click', () => setPaused(!paused));
  hero.addEventListener('focusin', () => { hovering = true; hold(); });
  hero.addEventListener('focusout', () => { hovering = false; release(); });
  if (paused) setPaused(true);
  dots.forEach((d, n) => d.addEventListener('click', () => show(n)));
  const vis = () => (document.hidden ? hold() : release());
  document.addEventListener('visibilitychange', vis);
  show(0);
  onCleanup(() => { clearTimeout(timer); document.removeEventListener('visibilitychange', vis); });
}

/* ---------------- Horizontal-Scroll-Sektion ---------------- */
function initHScroll() {
  $$('[data-hscroll]').forEach((section) => {
    const track = $('[data-hscroll-track]', section);
    const counter = $('[data-hscroll-count]', section);
    if (!track) return;
    const mq = matchMedia('(min-width: 800px) and (prefers-reduced-motion: no-preference)');
    let distance = 0;
    const measure = () => {
      if (!mq.matches) { section.style.height = ''; track.style.transform = ''; return; }
      distance = Math.max(0, track.scrollWidth - innerWidth);
      section.style.height = `${distance + innerHeight}px`;
    };
    measure();
    addEventListener('resize', measure);
    $$('img', track).forEach((img) => img.addEventListener('load', measure, { once: true }));
    const cards = $$('.hscroll__card', track);
    onScroll(() => {
      if (!mq.matches) return;
      const r = section.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight || 1)));
      track.style.transform = `translate3d(${(-distance * p).toFixed(1)}px, 0, 0)`;
      if (counter) counter.textContent = String(Math.min(cards.length, Math.floor(p * cards.length) + 1)).padStart(2, '0');
    });
    onCleanup(() => removeEventListener('resize', measure));
  });
}

/* ---------------- Galerie-Filter ---------------- */
function initFilter() {
  const gallery = $('[data-gallery]');
  const buttons = $$<HTMLButtonElement>('[data-filter]');
  if (!gallery || !buttons.length) return;
  const items = $$('[data-category]', gallery);
  const apply = (value: string, push = true) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === value)));
    items.forEach((it, n) => {
      const show = value === 'all' || it.dataset.category === value;
      it.classList.toggle('is-hidden', !show);
      if (show && !reduced()) {
        it.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], {
          duration: 700, delay: Math.min(n, 12) * 30, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards',
        });
        it.classList.add('is-in');
      }
    });
    if (push) {
      const url = new URL(location.href);
      value === 'all' ? url.searchParams.delete('serie') : url.searchParams.set('serie', value);
      history.replaceState(history.state, '', url);
    }
  };
  buttons.forEach((b) => b.addEventListener('click', () => apply(b.dataset.filter!)));
  const initial = new URL(location.href).searchParams.get('serie');
  if (initial && buttons.some((b) => b.dataset.filter === initial)) apply(initial, false);
}

/* ---------------- Lightbox ---------------- */
function initLightbox() {
  const dialog = $<HTMLDialogElement>('[data-lightbox-dialog]');
  const triggers = $$<HTMLAnchorElement>('[data-lightbox]');
  if (!dialog || !triggers.length) return;
  const img = $<HTMLImageElement>('[data-lb-img]', dialog)!;
  const title = $('[data-lb-title]', dialog)!;
  const loc = $('[data-lb-location]', dialog)!;
  const count = $('[data-lb-count]', dialog)!;
  const link = $<HTMLAnchorElement>('[data-lb-link]', dialog)!;
  let list: HTMLAnchorElement[] = [];
  let idx = 0;
  const render = () => {
    const a = list[idx];
    const thumb = a.querySelector('img')!;
    img.src = a.dataset.full!;
    img.alt = thumb.alt;
    img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
    title.textContent = a.dataset.title ?? '';
    loc.textContent = a.dataset.location ?? '';
    count.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    link.href = a.href;
    // Nachbarn vorladen
    [list[idx + 1], list[idx - 1]].forEach((n) => { if (n) new Image().src = n.dataset.full!; });
  };
  const open = (a: HTMLAnchorElement) => {
    list = triggers.filter((t) => !t.classList.contains('is-hidden') && t.offsetParent !== null);
    idx = Math.max(0, list.indexOf(a));
    render();
    dialog.showModal();
    lenis?.stop();
  };
  const close = () => dialog.close();
  const go = (d: number) => { idx = (idx + d + list.length) % list.length; render(); };
  triggers.forEach((a) =>
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      open(a);
    }),
  );
  $('[data-lb-close]', dialog)!.onclick = close;
  $('[data-lb-prev]', dialog)!.onclick = () => go(-1);
  $('[data-lb-next]', dialog)!.onclick = () => go(1);
  dialog.onclose = () => lenis?.start();
  dialog.onkeydown = (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
  const stage = $('[data-lb-stage]', dialog)!;
  stage.onclick = (e) => { if (e.target === stage) close(); };
  let sx = 0;
  stage.ontouchstart = (e) => (sx = e.touches[0].clientX);
  stage.ontouchend = (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); };
  onCleanup(() => dialog.open && dialog.close());
}

/* ---------------- Zähler ---------------- */
function initCounters() {
  const els = $$('[data-count-to]');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target as HTMLElement;
      const to = Number(el.dataset.countTo);
      const suffix = el.dataset.suffix ?? '';
      if (reduced()) { el.textContent = to + suffix; return; }
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / 1600);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.4 });
  els.forEach((el) => io.observe(el));
  onCleanup(() => io.disconnect());
}

/* ---------------- Kontaktformular ---------------- */
function initContactForm() {
  const form = $<HTMLFormElement>('[data-contact-form]');
  if (!form) return;
  const status = $('[data-form-status]', form)!;
  const submit = $<HTMLButtonElement>('button[type=submit]', form)!;
  const params = new URL(location.href).searchParams;
  const typeParam = params.get('anliegen') || params.get('type');
  if (typeParam) { const radio = $<HTMLInputElement>(`input[name=type][value="${CSS.escape(typeParam)}"]`, form); if (radio) radio.checked = true; }
  const photo = params.get('bild') || params.get('photo');
  if (photo) { const msg = $<HTMLTextAreaElement>('textarea[name=message]', form)!; if (!msg.value) msg.value = `${form.dataset.photoPrefix ?? 'Bild'}: ${photo}\n\n`; }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const label = submit.querySelector('span')!;
    const original = label.textContent;
    label.textContent = form.dataset.sending ?? '…';
    submit.disabled = true;
    status.className = 'form__status';
    try {
      const data = Object.fromEntries(new FormData(form));
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      status.textContent = form.dataset.success ?? 'OK';
      status.classList.add('is-ok');
    } catch {
      status.textContent = form.dataset.error ?? 'Error';
      status.classList.add('is-error');
    } finally {
      label.textContent = original;
      submit.disabled = false;
    }
  });
}

/* ---------------- Print-Konfigurator ---------------- */
interface ConfigData { materials: { id: string; description: string; sizes: { id: string; label: string; price: number }[] }[]; lang: string; slug: string }
function initConfigurator() {
  const root = $<HTMLFormElement>('[data-configurator]');
  if (!root) return;
  const data: ConfigData = JSON.parse($('script[type="application/json"]', root)!.textContent!);
  const sizeSelect = $<HTMLSelectElement>('select[name=size]', root)!;
  const desc = $('[data-config-desc]', root)!;
  const price = $('[data-config-price]', root)!;
  const qtyOut = $('[data-qty]', root)!;
  const status = $('[data-config-status]', root)!;
  let qty = 1;
  const fmt = new Intl.NumberFormat(data.lang === 'de' ? 'de-CH' : 'en-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 });
  const material = () => data.materials.find((m) => m.id === ($<HTMLInputElement>('input[name=material]:checked', root)?.value))!;
  const update = (rebuild = false) => {
    const m = material();
    if (rebuild) {
      const prev = sizeSelect.value;
      sizeSelect.innerHTML = m.sizes.map((s) => `<option value="${s.id}">${s.label} – ${fmt.format(s.price)}</option>`).join('');
      if (m.sizes.some((s) => s.id === prev)) sizeSelect.value = prev;
      desc.textContent = m.description;
    }
    const s = m.sizes.find((x) => x.id === sizeSelect.value) ?? m.sizes[0];
    qtyOut.textContent = String(qty);
    const total = s.price * qty;
    price.animate([{ opacity: 0.3, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'ease-out' });
    price.textContent = fmt.format(total);
  };
  $$<HTMLInputElement>('input[name=material]', root).forEach((r) => r.addEventListener('change', () => update(true)));
  sizeSelect.addEventListener('change', () => update());
  $('[data-qty-minus]', root)!.addEventListener('click', () => { qty = Math.max(1, qty - 1); update(); });
  $('[data-qty-plus]', root)!.addEventListener('click', () => { qty = Math.min(10, qty + 1); update(); });
  update(true);
  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $<HTMLButtonElement>('button[type=submit]', root)!;
    btn.disabled = true;
    status.textContent = '';
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: data.slug, material: material().id, size: sizeSelect.value, quantity: qty, lang: data.lang }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'checkout');
      location.href = json.url;
    } catch {
      status.textContent = root.dataset.error ?? 'Error';
      btn.disabled = false;
    }
  });
}

/* ---------------- Boot ---------------- */
function init() {
  initLenis();
  initCursor();
  initHeader();
  initMenu();
  initReveal();
  initMagnetic();
  initParallax();
  initHero();
  initHScroll();
  initFilter();
  initLightbox();
  initCounters();
  initContactForm();
  initConfigurator();
}

let booted = false;
document.addEventListener('astro:page-load', () => {
  if (!booted) { booted = true; initPreloader(); }
  init();
});
document.addEventListener('astro:before-swap', () => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
});
document.addEventListener('astro:after-swap', () => {
  lenis?.scrollTo(0, { immediate: true });
});
