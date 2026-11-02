/**
 * Admin-Oberfläche für fabioberta.com (Firebase: Auth, Firestore, Storage).
 * Bewusst ohne Framework: alles in einer Datei, Ansichten werden als HTML gerendert.
 */
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, signOut,
} from 'firebase/auth';
import {
  connectFirestoreEmulator, getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { connectStorageEmulator, getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { marked } from 'marked';

type Row = Record<string, any>;


/* ======================================================================
   Hilfsfunktionen
   ====================================================================== */
const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const slugify = (s: string) =>
  s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const CATS: [string, string][] = [['street', 'Street'], ['landscape', 'Landschaft'], ['travel', 'Reisen'], ['event', 'Events & Sport'], ['portrait', 'Portrait']];
const catName = (c: string) => CATS.find(([v]) => v === c)?.[1] ?? c;
const TYPES: Record<string, string> = { event: 'Event / Sport', portrait: 'Portrait / Business', print: 'Print / Lizenz', other: 'Sonstiges' };
const STATUS: [string, string][] = [['paid', 'Bezahlt – neu'], ['production', 'In Produktion'], ['shipped', 'Versendet'], ['cancelled', 'Storniert']];
const toDate = (v: any): Date | null => (!v ? null : v instanceof Timestamp ? v.toDate() : v?.toDate ? v.toDate() : new Date(v));
const fmtDate = (v: any, time = false) => {
  const d = toDate(v);
  return d ? d.toLocaleDateString('de-CH', time ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'long', year: 'numeric' }) : '–';
};
const isoDay = (v: any) => { const d = toDate(v); return d ? d.toISOString().slice(0, 10) : ''; };
const chf = (n: number) => `CHF ${Number(n || 0).toLocaleString('de-CH', { maximumFractionDigits: 2 })}`;
const options = (list: [string, string][], current: string) => list.map(([v, l]) => `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(l)}</option>`).join('');
const sw = (name: string, label: string, hint: string, checked: boolean) =>
  `<label class="a-switch"><span><b>${esc(label)}</b><small>${esc(hint)}</small></span><input type="checkbox" name="${name}" ${checked ? 'checked' : ''} /></label>`;
const field = (label: string, input: string, hint = '') => `<label class="a-field"><span>${esc(label)}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
const input = (name: string, value: unknown, attrs = '') => `<input name="${name}" value="${esc(value)}" ${attrs} />`;
const textarea = (name: string, value: unknown, attrs = '') => `<textarea name="${name}" ${attrs}>${esc(value)}</textarea>`;

function toast(msg: string, type: 'ok' | 'error' | 'info' = 'ok') {
  const el = document.createElement('div');
  el.className = `a-toast a-toast--${type}`;
  el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), type === 'error' ? 7000 : 3500);
}

/* ---------- Bild-Optimierung im Browser ---------- */
async function resize(bitmap: ImageBitmap, max: number, quality: number) {
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Konvertierung fehlgeschlagen'))), 'image/webp', quality));
  return { blob, w, h };
}
function dominant(bitmap: ImageBitmap) {
  const c = document.createElement('canvas'); c.width = c.height = 1;
  const ctx = c.getContext('2d')!; ctx.drawImage(bitmap, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* ======================================================================
   App
   ====================================================================== */
function boot(config: Row, defaults: Row) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  if (config.emulator) {
    // Lokaler Test mit `npm run emulators`
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }

  const state = {
    photos: [] as Row[], services: [] as Row[], events: [] as Row[], exhibitions: [] as Row[], posts: [] as Row[],
    inquiries: [] as Row[], orders: [] as Row[], prints: null as Row | null,
    view: 'dashboard',
    photoFilter: { q: '', cat: 'all', status: 'all' },
    selecting: false, selected: new Set<string>(),
    inquiryFilter: 'open', orderFilter: 'open', postLang: 'all',
  };

  /* ---------- Auth ---------- */
  const loginEl = $('#login');
  const appEl = $('#app');
  const loginError = $('#login-error');
  const authError = (e: any) => {
    const code = String(e?.code ?? '');
    return code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')
      ? 'E-Mail oder Passwort ist falsch.'
      : code.includes('too-many-requests') ? 'Zu viele Versuche – bitte kurz warten.'
      : code.includes('popup-closed') ? '' : `Anmeldung fehlgeschlagen (${code || e?.message}).`;
  };
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    try { await signInWithEmailAndPassword(auth, $<HTMLInputElement>('#login-email').value.trim(), $<HTMLInputElement>('#login-pass').value); }
    catch (err) { loginError.textContent = authError(err); }
  });
  $('#login-google').addEventListener('click', async () => {
    loginError.textContent = '';
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (err) { loginError.textContent = authError(err); }
  });
  $('#login-reset').addEventListener('click', async () => {
    const email = $<HTMLInputElement>('#login-email').value.trim();
    if (!email) { loginError.textContent = 'Bitte zuerst deine E-Mail eingeben.'; return; }
    try { await sendPasswordResetEmail(auth, email); toast('E-Mail zum Zurücksetzen wurde gesendet.'); } catch (err) { loginError.textContent = authError(err); }
  });
  $('#logout').addEventListener('click', () => signOut(auth));

  onAuthStateChanged(auth, async (user) => {
    if (!user) { loginEl.hidden = false; appEl.hidden = true; return; }
    const email = (user.email ?? '').toLowerCase();
    let allowed = false;
    try { allowed = (await getDoc(doc(db, 'admins', email))).exists(); } catch { allowed = false; }
    if (!allowed) {
      loginError.textContent = `${email} hat keine Admin-Rechte. In Firestore muss es ein Dokument admins/${email} geben (siehe SETUP.md).`;
      await signOut(auth);
      return;
    }
    loginEl.hidden = true;
    $('#user-email').textContent = email;
    await loadAll();
    appEl.hidden = false;
    go((location.hash.slice(1) || 'dashboard'));
  });

  /* ---------- Daten laden ---------- */
  async function loadCol(name: string) {
    const snap = await getDocs(collection(db, name));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  async function loadAll() {
    try {
      const [photos, services, events, exhibitions, posts, inquiries, orders, prints] = await Promise.all([
        loadCol('photos'), loadCol('services'), loadCol('events'), loadCol('exhibitions'), loadCol('posts'), loadCol('inquiries'), loadCol('orders'),
        getDoc(doc(db, 'settings', 'prints')),
      ]);
      state.photos = photos.sort((a: Row, b: Row) => (a.sort ?? 0) - (b.sort ?? 0));
      state.services = services.sort((a: Row, b: Row) => (a.sort ?? 0) - (b.sort ?? 0));
      state.events = events.sort((a: Row, b: Row) => String(b.date).localeCompare(String(a.date)));
      state.exhibitions = exhibitions.sort((a: Row, b: Row) => String(b.date).localeCompare(String(a.date)));
      state.posts = posts.sort((a: Row, b: Row) => +(toDate(b.date) ?? 0) - +(toDate(a.date) ?? 0));
      const byCreated = (a: Row, b: Row) => +(toDate(b.createdAt) ?? 0) - +(toDate(a.createdAt) ?? 0);
      state.inquiries = inquiries.sort(byCreated);
      state.orders = orders.sort(byCreated);
      state.prints = prints.exists() ? prints.data() : null;
    } catch (err) {
      toast(`Daten konnten nicht geladen werden: ${(err as Error).message}`, 'error');
    }
    updateBadges();
  }
  function updateBadges() {
    const open = state.inquiries.filter((i) => !i.handled).length;
    const newOrders = state.orders.filter((o) => o.status === 'paid').length;
    const b1 = $('#badge-inquiries'), b2 = $('#badge-orders');
    b1.hidden = !open; b1.textContent = String(open);
    b2.hidden = !newOrders; b2.textContent = String(newOrders);
  }

  /* ---------- Navigation ---------- */
  const views: Record<string, () => void> = {
    dashboard: renderDashboard, photos: renderPhotos, services: renderServices, events: renderEvents, exhibitions: renderExhibitions,
    posts: renderPosts, prices: renderPrices, inquiries: renderInquiries, orders: renderOrders,
  };
  function go(view: string) {
    if (!views[view]) view = 'dashboard';
    state.view = view;
    if (location.hash.slice(1) !== view) history.replaceState(null, '', `#${view}`);
    $$('[data-view]').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
    state.selecting = false; state.selected.clear();
    views[view]();
    $('#view').focus({ preventScroll: true });
    scrollTo(0, 0);
  }
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => go(b.dataset.view!)));
  addEventListener('hashchange', () => go(location.hash.slice(1)));
  const view = $('#view');

  /* ---------- Drawer ---------- */
  const drawer = $('#drawer');
  let dirty = false;
  let onSave: (() => Promise<void>) | null = null;
  function openDrawer(title: string, body: string, foot: string, save: (() => Promise<void>) | null) {
    $('#drawer-title').textContent = title;
    $('#drawer-body').innerHTML = body;
    $('#drawer-foot').innerHTML = foot;
    drawer.hidden = false;
    document.body.style.overflow = 'hidden';
    dirty = false; onSave = save;
    $('#drawer-body').addEventListener('input', () => (dirty = true));
    ($('#drawer-body').querySelector<HTMLElement>('input:not([type=checkbox]), textarea, select') ?? $('#drawer-body')).focus({ preventScroll: true });
    return $('#drawer .a-drawer__panel');
  }
  async function closeDrawer(force = false) {
    if (!force && dirty && !(await confirmDialog('Ungespeicherte Änderungen verwerfen?', 'Verwerfen', true))) return;
    drawer.hidden = true; document.body.style.overflow = ''; dirty = false; onSave = null;
  }
  drawer.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-close]')) closeDrawer(); });
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape' && !drawer.hidden && !(modal.open)) closeDrawer();
    if ((e.metaKey || e.ctrlKey) && e.key === 's' && !drawer.hidden && onSave) { e.preventDefault(); await runSave(); }
  });
  async function runSave() {
    if (!onSave) return;
    const btn = $<HTMLButtonElement>('#drawer-foot [data-save]');
    if (btn) { btn.disabled = true; btn.textContent = 'Speichert …'; }
    try { await onSave(); dirty = false; await closeDrawer(true); }
    catch (err) { toast(`Speichern fehlgeschlagen: ${(err as Error).message}`, 'error'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Speichern'; } }
  }
  $('#drawer-foot').addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('[data-save]')) runSave(); });
  const saveFoot = (extra = '') => `<div class="a-foot-group">${extra}</div><div class="a-foot-group"><button class="a-btn" data-close>Abbrechen</button><button class="a-btn a-btn--primary" data-save>Speichern</button></div>`;
  const formData = (root: HTMLElement) => {
    const out: Row = {};
    $$<HTMLInputElement>('[name]', root).forEach((el) => {
      out[el.name] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value.trim();
    });
    return out;
  };

  /* ---------- Modal ---------- */
  const modal = $<HTMLDialogElement>('#modal');
  function openModal(html: string) { $('#modal-body').innerHTML = html; modal.showModal(); return $('#modal-body'); }
  function confirmDialog(text: string, ok = 'OK', danger = false): Promise<boolean> {
    return new Promise((resolve) => {
      const body = openModal(`<div class="a-modal__inner"><h2>${esc(text)}</h2><div class="a-modal__actions"><button class="a-btn" data-no>Abbrechen</button><button class="a-btn ${danger ? 'a-btn--danger' : 'a-btn--primary'}" data-yes>${esc(ok)}</button></div></div>`);
      const done = (v: boolean) => { modal.close(); resolve(v); };
      $('[data-yes]', body).onclick = () => done(true);
      $('[data-no]', body).onclick = () => done(false);
      modal.oncancel = () => resolve(false);
      $<HTMLButtonElement>('[data-yes]', body).focus();
    });
  }
  function pickPhoto(current = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const body = openModal(`<div class="a-modal__inner"><div class="a-head" style="margin:0"><h2>Bild auswählen</h2><input class="a-input" placeholder="Suchen …" data-q style="max-width:240px" /></div>
        <div class="a-picker">${state.photos.map((p) => `<button type="button" data-slug="${esc(p.slug)}" class="${p.slug === current ? 'is-current' : ''}" title="${esc(p.title?.de)}"><img src="${esc(p.thumb || p.src)}" alt="${esc(p.title?.de)}" loading="lazy" /></button>`).join('')}</div>
        <div class="a-modal__actions"><button class="a-btn" data-no>Abbrechen</button></div></div>`);
      body.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('[data-slug]');
        if (b) { modal.close(); resolve(b.dataset.slug!); }
        if ((e.target as HTMLElement).closest('[data-no]')) { modal.close(); resolve(null); }
      });
      $<HTMLInputElement>('[data-q]', body).oninput = (e) => {
        const q = (e.target as HTMLInputElement).value.toLowerCase();
        $$('[data-slug]', body).forEach((b) => (b.hidden = !!q && !b.title.toLowerCase().includes(q) && !b.dataset.slug!.includes(q)));
      };
      modal.oncancel = () => resolve(null);
    });
  }
  const photoBySlug = (slug: string) => state.photos.find((p) => p.slug === slug);
  const coverField = (name: string, slug: string, label = 'Titelbild') => {
    const p = photoBySlug(slug);
    return `<div class="a-field"><span>${label}</span><div class="a-cover-field"><img data-cover-img src="${esc(p?.thumb || p?.src || '')}" alt="" ${p ? '' : 'hidden'} />
      <input type="hidden" name="${name}" value="${esc(slug)}" /><button type="button" class="a-btn a-btn--sm" data-pick="${name}">${p ? 'Ändern' : 'Bild wählen'}</button></div></div>`;
  };
  function bindCoverPickers(root: HTMLElement) {
    $$('[data-pick]', root).forEach((btn) => btn.addEventListener('click', async () => {
      const inputEl = $<HTMLInputElement>(`[name="${btn.dataset.pick}"]`, root);
      const slug = await pickPhoto(inputEl.value);
      if (!slug) return;
      inputEl.value = slug; dirty = true;
      const img = $<HTMLImageElement>('[data-cover-img]', btn.parentElement!);
      img.src = photoBySlug(slug)?.thumb ?? ''; img.hidden = false; btn.textContent = 'Ändern';
    }));
  }
  function autoSlug(root: HTMLElement, from: string, to: string) {
    const src = $<HTMLInputElement>(`[name="${from}"]`, root), dst = $<HTMLInputElement>(`[name="${to}"]`, root);
    let touched = Boolean(dst.value);
    dst.addEventListener('input', () => (touched = true));
    src.addEventListener('input', () => { if (!touched) dst.value = slugify(src.value); });
  }

  /* ---------- Datei-Drop überall ---------- */
  const overlay = $('#drop-overlay');
  let dragDepth = 0;
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
  addEventListener('dragenter', (e) => { if (!hasFiles(e) || modal.open || appEl.hidden) return; dragDepth++; overlay.hidden = false; });
  addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) overlay.hidden = true; });
  addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); dragDepth = 0; overlay.hidden = true;
    if (modal.open || appEl.hidden) return;
    const files = Array.from(e.dataTransfer!.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) openUpload(files);
  });

  /* ======================================================================
     Übersicht
     ====================================================================== */
  function renderDashboard() {
    const h = new Date().getHours();
    const hello = h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend';
    const open = state.inquiries.filter((i) => !i.handled);
    const newOrders = state.orders.filter((o) => o.status === 'paid');
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
    const revenue = state.orders.filter((o) => o.status !== 'cancelled' && (toDate(o.createdAt) ?? 0) >= month).reduce((s, o) => s + Number(o.amountTotal || 0), 0);
    const empty = !state.photos.length;
    view.innerHTML = `
      <div class="a-head"><div><h1>${hello}, Fabio 👋</h1><p>Hier verwaltest du alles auf fabioberta.com. Änderungen sind nach spätestens 5 Minuten live.</p></div></div>
      ${empty ? `<div class="a-card" style="margin-bottom:1.5rem;display:grid;gap:.75rem">
        <h2>Los geht’s: bestehende Inhalte übernehmen</h2>
        <p class="muted">Deine Datenbank ist noch leer. Mit einem Klick übernimmst du alle ${defaults.photos.length} bisherigen Bilder, Leistungen, Events, Ausstellungen, Journal-Beiträge und Print-Preise. Danach kannst du alles hier bearbeiten.</p>
        <div><button class="a-btn a-btn--primary" data-import>Inhalte jetzt übernehmen</button></div></div>` : ''}
      <div class="a-stats">
        <button class="a-stat" data-go="photos"><b>${state.photos.filter((p) => p.published !== false).length}</b><span>Fotos online</span></button>
        <button class="a-stat" data-go="inquiries"><b>${open.length}</b><span>Offene Anfragen</span></button>
        <button class="a-stat" data-go="orders"><b>${newOrders.length}</b><span>Neue Bestellungen</span></button>
        <button class="a-stat" data-go="orders"><b>${chf(revenue).replace('CHF ', '')}</b><span>Umsatz diesen Monat (CHF)</span></button>
      </div>
      <div class="a-quick">
        <button class="a-btn a-btn--primary" data-upload>＋ Bilder hochladen</button>
        <button class="a-btn" data-new="events">＋ Neues Event</button>
        <button class="a-btn" data-new="posts">＋ Neuer Journal-Beitrag</button>
        <button class="a-btn" data-go="services">Leistungen & Pakete</button>
        <button class="a-btn" data-go="prices">Print-Preise</button>
      </div>
      <div class="a-grid2">
        <section class="a-card"><div class="a-head" style="margin-bottom:.5rem"><h2>Neueste Anfragen</h2><button class="a-link" data-go="inquiries">Alle</button></div>
          <div class="a-list">${state.inquiries.slice(0, 5).map((i) => `<div><b>${esc(i.name)}</b> <span class="a-tag">${esc(TYPES[i.type] ?? i.type)}</span>${i.handled ? '' : ' <span class="a-tag a-tag--accent">neu</span>'}<div class="muted" style="font-size:.85rem">${fmtDate(i.createdAt, true)} · ${esc(String(i.message).slice(0, 90))}…</div></div>`).join('') || '<p class="muted">Noch keine Anfragen.</p>'}</div></section>
        <section class="a-card"><div class="a-head" style="margin-bottom:.5rem"><h2>Neueste Bestellungen</h2><button class="a-link" data-go="orders">Alle</button></div>
          <div class="a-list">${state.orders.slice(0, 5).map((o) => `<div><b>${esc(photoBySlug(o.photoSlug)?.title?.de ?? o.photoSlug)}</b> · ${chf(o.amountTotal)} <span class="a-tag">${esc(STATUS.find(([v]) => v === o.status)?.[1] ?? o.status)}</span><div class="muted" style="font-size:.85rem">${fmtDate(o.createdAt, true)} · ${esc(o.name)}</div></div>`).join('') || '<p class="muted">Noch keine Bestellungen.</p>'}</div></section>
      </div>`;
    view.onclick = async (e) => {
      const t = e.target as HTMLElement;
      const goBtn = t.closest<HTMLElement>('[data-go]'); if (goBtn) go(goBtn.dataset.go!);
      if (t.closest('[data-upload]')) openUpload();
      const nb = t.closest<HTMLElement>('[data-new]'); if (nb) { go(nb.dataset.new!); nb.dataset.new === 'events' ? editEvent() : editPost(); }
      if (t.closest('[data-import]')) importDefaults(t.closest('button')!);
    };
  }

  async function importDefaults(btn: HTMLButtonElement) {
    if (!(await confirmDialog('Alle bisherigen Inhalte in Firebase übernehmen?', 'Übernehmen'))) return;
    btn.disabled = true; btn.textContent = 'Übernehme …';
    try {
      const ops: [string, string | null, Row][] = [];
      if (!state.photos.length) defaults.photos.forEach((p: Row) => {
        const { id, ...rest } = p;
        ops.push(['photos', null, { ...rest, published: true, storagePath: null, createdAt: serverTimestamp() }]);
      });
      if (!state.services.length) defaults.services.forEach((sv: Row) => { const { id, ...rest } = sv; ops.push(['services', id, rest]); });
      if (!state.events.length) defaults.events.forEach((e: Row) => ops.push(['events', null, { ...e, published: true }]));
      if (!state.exhibitions.length) defaults.exhibitions.forEach((e: Row) => ops.push(['exhibitions', null, { ...e, published: true }]));
      if (!state.posts.length) defaults.posts.forEach((p: Row) => ops.push(['posts', null, { ...p, date: Timestamp.fromDate(new Date(p.date)), published: true }]));
      if (!state.prints) ops.push(['settings', 'prints', defaults.prints]);
      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        ops.slice(i, i + 400).forEach(([col, id, data]) => batch.set(id ? doc(db, col, id) : doc(collection(db, col)), data));
        await batch.commit();
      }
      await loadAll();
      toast(`${ops.length} Einträge übernommen.`);
      views[state.view]();
    } catch (err) {
      toast(`Import fehlgeschlagen: ${(err as Error).message}`, 'error');
      btn.disabled = false; btn.textContent = 'Inhalte jetzt übernehmen';
    }
  }

  /* ======================================================================
     Fotos
     ====================================================================== */
  function filteredPhotos() {
    const { q, cat, status } = state.photoFilter;
    const ql = q.toLowerCase();
    return state.photos.filter((p) =>
      (cat === 'all' || p.category === cat) &&
      (status === 'all' || (status === 'hidden' ? p.published === false : status === 'shop' ? p.forSale : status === 'featured' ? p.featured : p.published !== false)) &&
      (!ql || [p.title?.de, p.title?.en, p.location, p.slug, p.alt?.de].some((v) => String(v ?? '').toLowerCase().includes(ql))),
    );
  }
  function renderPhotos() {
    const f = state.photoFilter;
    const canDrag = f.q === '' && f.cat === 'all' && f.status === 'all' && !state.selecting;
    view.innerHTML = `
      <div class="a-head"><div><h1>Fotos</h1><p>${state.photos.length} Bilder · Klick auf ein Bild zum Bearbeiten${canDrag ? ' · Ziehen zum Sortieren' : ''}</p></div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="a-btn" data-select>${state.selecting ? 'Fertig' : 'Mehrere auswählen'}</button><button class="a-btn a-btn--primary" data-upload>＋ Bilder hochladen</button></div></div>
      ${!state.photos.length ? '' : `<div class="a-toolbar">
        <input class="a-input" type="search" placeholder="Suchen (Titel, Ort …)" value="${esc(f.q)}" data-q />
        <select class="a-input" data-cat style="max-width:180px">${options([['all', 'Alle Serien'], ...CATS], f.cat)}</select>
        <select class="a-input" data-status style="max-width:200px">${options([['all', 'Alle'], ['visible', 'Sichtbar'], ['hidden', 'Versteckt'], ['featured', 'Auf Startseite'], ['shop', 'Im Print-Shop']], f.status)}</select>
      </div>`}
      <div class="a-photos ${state.selecting ? 'is-selecting' : ''}" data-grid>${photoCards(filteredPhotos(), canDrag)}</div>
      ${state.photos.length ? '' : `<div class="a-empty"><b>Noch keine Bilder</b>Zieh Bilder einfach hierher oder klick auf «Bilder hochladen».<br><br><button class="a-btn a-btn--primary" data-upload>＋ Bilder hochladen</button></div>`}
      <div data-bulk></div>`;
    const grid = $('[data-grid]', view);
    view.onclick = (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-upload]')) return openUpload();
      if (t.closest('[data-select]')) { state.selecting = !state.selecting; state.selected.clear(); return renderPhotos(); }
      const card = t.closest<HTMLElement>('.a-photo');
      if (card) {
        if (state.selecting) {
          const id = card.dataset.id!;
          state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
          card.classList.toggle('is-selected', state.selected.has(id));
          renderBulk();
        } else editPhoto(card.dataset.id!);
      }
    };
    view.onkeydown = (e) => { const card = (e.target as HTMLElement).closest<HTMLElement>('.a-photo'); if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); card.click(); } };
    const q = view.querySelector<HTMLInputElement>('[data-q]');
    if (q) {
      q.oninput = () => { f.q = q.value; grid.innerHTML = photoCards(filteredPhotos(), false); };
      $<HTMLSelectElement>('[data-cat]', view).onchange = (e) => { f.cat = (e.target as HTMLSelectElement).value; renderPhotos(); };
      $<HTMLSelectElement>('[data-status]', view).onchange = (e) => { f.status = (e.target as HTMLSelectElement).value; renderPhotos(); };
    }
    if (canDrag) bindPhotoDrag(grid);
    renderBulk();
  }
  function photoCards(list: Row[], draggable: boolean) {
    return list.map((p) => `
      <div class="a-photo ${p.published === false ? 'is-hidden' : ''} ${state.selected.has(p.id) ? 'is-selected' : ''}" data-id="${p.id}" tabindex="0" role="button" aria-label="${esc(p.title?.de)} bearbeiten" ${draggable ? 'draggable="true"' : ''}>
        <span class="a-photo__check">✓</span>${draggable ? '<span class="a-photo__grip">⠿ ziehen</span>' : ''}
        <img src="${esc(p.thumb || p.src)}" alt="" loading="lazy" />
        <div class="a-photo__meta"><div class="a-photo__title">${esc(p.title?.de || 'Ohne Titel')}</div>
          <div class="a-photo__tags"><span class="a-tag">${esc(catName(p.category))}</span>${p.published === false ? '<span class="a-tag a-tag--warn">versteckt</span>' : ''}${p.featured ? '<span class="a-tag a-tag--accent">Startseite</span>' : ''}${p.forSale ? '<span class="a-tag a-tag--ok">Shop</span>' : ''}${!p.alt?.de || p.alt?.de === p.title?.de ? '<span class="a-tag a-tag--warn" title="Beschreibung fehlt – wichtig für Google">Beschreibung?</span>' : ''}</div></div>
      </div>`).join('') || (state.photos.length ? '<p class="muted">Keine Bilder gefunden.</p>' : '');
  }
  function bindPhotoDrag(grid: HTMLElement) {
    let dragId = '';
    grid.addEventListener('dragstart', (e) => { const c = (e.target as HTMLElement).closest<HTMLElement>('.a-photo'); if (!c) return; dragId = c.dataset.id!; c.classList.add('is-dragging'); e.dataTransfer!.effectAllowed = 'move'; e.dataTransfer!.setData('text/plain', dragId); });
    grid.addEventListener('dragend', () => $$('.a-photo', grid).forEach((c) => c.classList.remove('is-dragging', 'is-drop-target')));
    grid.addEventListener('dragover', (e) => { if (!dragId) return; e.preventDefault(); $$('.a-photo', grid).forEach((c) => c.classList.remove('is-drop-target')); (e.target as HTMLElement).closest('.a-photo')?.classList.add('is-drop-target'); });
    grid.addEventListener('drop', async (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('.a-photo');
      if (!dragId || !target || target.dataset.id === dragId) { dragId = ''; return; }
      e.preventDefault(); e.stopPropagation();
      const from = state.photos.findIndex((p) => p.id === dragId);
      const to = state.photos.findIndex((p) => p.id === target.dataset.id);
      dragId = '';
      const [moved] = state.photos.splice(from, 1);
      state.photos.splice(to, 0, moved);
      renderPhotos();
      await saveOrder();
    });
  }
  async function saveOrder() {
    try {
      const changed = state.photos.map((p, i) => [p, i] as const).filter(([p, i]) => p.sort !== i);
      for (let i = 0; i < changed.length; i += 400) {
        const batch = writeBatch(db);
        changed.slice(i, i + 400).forEach(([p, n]) => { batch.update(doc(db, 'photos', p.id), { sort: n }); p.sort = n; });
        await batch.commit();
      }
      if (changed.length) toast('Reihenfolge gespeichert');
    } catch (err) { toast(`Reihenfolge nicht gespeichert: ${(err as Error).message}`, 'error'); }
  }
  function renderBulk() {
    const bar = view.querySelector<HTMLElement>('[data-bulk]');
    if (!bar) return;
    const n = state.selected.size;
    if (!state.selecting || !n) { bar.innerHTML = ''; return; }
    bar.innerHTML = `<div class="a-bulk"><strong>${n} ausgewählt</strong>
      <button class="a-btn a-btn--sm" data-b="show">Sichtbar</button><button class="a-btn a-btn--sm" data-b="hide">Verstecken</button>
      <button class="a-btn a-btn--sm" data-b="shop">In Shop</button><button class="a-btn a-btn--sm" data-b="noshop">Aus Shop</button>
      <button class="a-btn a-btn--sm" data-b="feat">Auf Startseite</button><button class="a-btn a-btn--sm" data-b="nofeat">Von Startseite</button>
      <select class="a-input a-btn--sm" data-b-cat style="width:auto;min-height:36px"><option value="">Serie ändern …</option>${options(CATS, '')}</select>
      <button class="a-btn a-btn--sm a-btn--danger" data-b="delete">Löschen</button></div>`;
    bar.onclick = async (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-b]')?.dataset.b;
      if (!act) return;
      const patch: Row | null = { show: { published: true }, hide: { published: false }, shop: { forSale: true }, noshop: { forSale: false }, feat: { featured: true }, nofeat: { featured: false } }[act as 'show'] ?? null;
      if (patch) await bulkUpdate(patch);
      if (act === 'delete') {
        if (!(await confirmDialog(`${n} Bilder endgültig löschen?`, 'Löschen', true))) return;
        for (const id of state.selected) await removePhoto(state.photos.find((p) => p.id === id)!, false);
        state.selected.clear(); toast(`${n} Bilder gelöscht`); renderPhotos();
      }
    };
    $<HTMLSelectElement>('[data-b-cat]', bar).onchange = (e) => { const v = (e.target as HTMLSelectElement).value; if (v) bulkUpdate({ category: v }); };
  }
  async function bulkUpdate(patch: Row) {
    try {
      const batch = writeBatch(db);
      state.selected.forEach((id) => batch.update(doc(db, 'photos', id), patch));
      await batch.commit();
      state.photos.forEach((p) => { if (state.selected.has(p.id)) Object.assign(p, patch); });
      toast(`${state.selected.size} Bilder aktualisiert`);
      renderPhotos();
    } catch (err) { toast(`Fehler: ${(err as Error).message}`, 'error'); }
  }

  function editPhoto(id: string) {
    const p = state.photos.find((x) => x.id === id)!;
    const idx = state.photos.indexOf(p);
    const panel = openDrawer(p.title?.de || 'Foto bearbeiten', `
      <div class="a-preview"><img src="${esc(p.src)}" alt="" /></div>
      <div class="a-row">${field('Titel (Deutsch)', input('title_de', p.title?.de, 'required'))}${field('Titel (Englisch)', input('title_en', p.title?.en))}</div>
      ${field('Bildbeschreibung (Deutsch)', textarea('alt_de', p.alt?.de, 'rows="2" style="min-height:70px"'), 'Beschreibe, was zu sehen ist – z. B. «Skater springt vor einem Tram in Zürich». Wichtig für Google & Barrierefreiheit.')}
      ${field('Bildbeschreibung (Englisch)', textarea('alt_en', p.alt?.en, 'rows="2" style="min-height:70px"'))}
      <div class="a-row">${field('Serie', `<select name="category">${options(CATS, p.category)}</select>`)}${field('Ort', input('location', p.location, 'placeholder="z. B. Zürich"'))}</div>
      <div class="a-card" style="padding:.25rem 1rem">
        ${sw('published', 'Auf der Website sichtbar', 'Ausgeschaltet = nur hier im Admin sichtbar', p.published !== false)}
        ${sw('featured', 'Auf der Startseite zeigen', 'Erscheint in «Ausgewählte Arbeiten»', !!p.featured)}
        ${sw('forSale', 'Im Print-Shop verkaufen', 'Nur bei Bildern ohne erkennbare Personen bzw. mit Einwilligung', !!p.forSale)}
      </div>
      ${field('URL-Name', input('slug', p.slug, 'pattern="[a-z0-9-]+" required'), `fabioberta.com/portfolio/<b>${esc(p.slug)}</b> – Änderung bricht bestehende Links`)}
      <div class="a-section-title">Position</div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="a-btn a-btn--sm" data-move="first">⇤ Ganz nach vorne</button><button class="a-btn a-btn--sm" data-move="-1">← Eins nach vorne</button><button class="a-btn a-btn--sm" data-move="1">Eins nach hinten →</button><span class="muted" style="font-size:.8rem;align-self:center">Position ${idx + 1} von ${state.photos.length}</span></div>
      <p class="muted" style="font-size:.8rem">${p.width} × ${p.height} px · hochgeladen ${fmtDate(p.createdAt)}</p>`,
      saveFoot(`<button class="a-btn a-btn--danger" data-delete>Löschen</button><button class="a-btn" data-replace>Bild ersetzen</button><a class="a-btn a-btn--ghost" href="/portfolio/${esc(p.slug)}" target="_blank" rel="noopener">Ansehen ↗</a>`),
      async () => {
        const d = formData(panel);
        const slug = slugify(d.slug) || p.slug;
        if (state.photos.some((x) => x.slug === slug && x.id !== p.id)) throw new Error('Dieser URL-Name ist schon vergeben.');
        if (!d.title_de) throw new Error('Bitte einen Titel eingeben.');
        const patch = {
          title: { de: d.title_de, en: d.title_en || d.title_de }, alt: { de: d.alt_de || d.title_de, en: d.alt_en || d.alt_de || d.title_de },
          category: d.category, location: d.location, published: d.published, featured: d.featured, forSale: d.forSale, slug,
        };
        await updateDoc(doc(db, 'photos', p.id), patch);
        Object.assign(p, patch);
        toast('Gespeichert ✓');
        renderPhotos();
      });
    panel.querySelector('[data-delete]')!.addEventListener('click', async () => {
      if (!(await confirmDialog('Dieses Bild endgültig löschen?', 'Löschen', true))) return;
      await removePhoto(p); closeDrawer(true); renderPhotos();
    });
    panel.querySelector('[data-replace]')!.addEventListener('click', () => {
      const fi = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
      fi.onchange = async () => {
        const file = fi.files?.[0]; if (!file) return;
        toast('Bild wird ersetzt …', 'info');
        try {
          const up = await processAndUpload(file, p.slug, () => {});
          const old = p.storagePath;
          const patch = { src: up.src, thumb: up.thumb, width: up.width, height: up.height, color: up.color, storagePath: up.storagePath };
          await updateDoc(doc(db, 'photos', p.id), patch);
          Object.assign(p, patch);
          if (old) await deleteFiles(old);
          $<HTMLImageElement>('.a-preview img', panel).src = up.src;
          toast('Bild ersetzt ✓'); renderPhotos();
        } catch (err) { toast(`Ersetzen fehlgeschlagen: ${(err as Error).message}`, 'error'); }
      };
      fi.click();
    });
    $$<HTMLElement>('[data-move]', panel).forEach((b) => b.addEventListener('click', async () => {
      const from = state.photos.indexOf(p);
      const to = b.dataset.move === 'first' ? 0 : Math.min(state.photos.length - 1, Math.max(0, from + Number(b.dataset.move)));
      if (from === to) return;
      state.photos.splice(from, 1); state.photos.splice(to, 0, p);
      await saveOrder();
      $('.muted', b.parentElement!).textContent = `Position ${to + 1} von ${state.photos.length}`;
      renderPhotos();
    }));
  }
  async function deleteFiles(path: string) {
    await Promise.all(['1920', '960'].map((s) => deleteObject(ref(storage, `${path}-${s}.webp`)).catch(() => {})));
  }
  async function removePhoto(p: Row, notify = true) {
    try {
      await deleteDoc(doc(db, 'photos', p.id));
      if (p.storagePath) await deleteFiles(p.storagePath);
      state.photos = state.photos.filter((x) => x.id !== p.id);
      if (notify) toast('Bild gelöscht');
    } catch (err) { toast(`Löschen fehlgeschlagen: ${(err as Error).message}`, 'error'); }
  }

  /* ---------- Upload ---------- */
  async function processAndUpload(file: File, slug: string, onProgress: (pct: number) => void) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const big = await resize(bitmap, 1920, 0.82);
    const small = await resize(bitmap, 960, 0.76);
    const path = `photos/${new Date().getFullYear()}/${slug}-${Date.now().toString(36)}`;
    const total = big.blob.size + small.blob.size;
    const loaded = { b: 0, s: 0 };
    const put = (blob: Blob, suffix: string, key: 'b' | 's') => new Promise<string>((resolve, reject) => {
      const task = uploadBytesResumable(ref(storage, `${path}-${suffix}.webp`), blob, { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' });
      task.on('state_changed', (s) => { loaded[key] = s.bytesTransferred; onProgress(Math.round(((loaded.b + loaded.s) / total) * 100)); }, reject, async () => resolve(await getDownloadURL(task.snapshot.ref)));
    });
    const [src, thumb] = await Promise.all([put(big.blob, '1920', 'b'), put(small.blob, '960', 's')]);
    return { src, thumb, width: big.w, height: big.h, color: dominant(bitmap), storagePath: path };
  }
  function openUpload(initial: File[] = []) {
    const body = openModal(`<div class="a-modal__inner">
      <div class="a-head" style="margin:0"><div><h2>Bilder hochladen</h2><p class="muted" style="font-size:.85rem">JPG, PNG oder WebP – werden automatisch für das Web optimiert.</p></div><button class="a-icon-btn" data-x aria-label="Schliessen">✕</button></div>
      <div class="a-row">${field('Serie', `<select data-u-cat>${options(CATS, state.photoFilter.cat !== 'all' ? state.photoFilter.cat : 'street')}</select>`)}${field('Ort (optional)', '<input data-u-loc placeholder="z. B. Zürich" />')}</div>
      <div class="a-card" style="padding:.25rem 1rem">${sw('u-sale', 'Im Print-Shop anbieten', 'Kannst du später pro Bild ändern', false)}${sw('u-feat', 'Auf der Startseite zeigen', '', false)}</div>
      <label class="a-drop" data-drop><strong>Bilder hierher ziehen</strong><span class="muted">oder klicken, um Dateien auszuwählen</span><input type="file" accept="image/*" multiple hidden data-files /></label>
      <div class="a-uploads" data-list></div>
      <div class="a-modal__actions"><button class="a-btn a-btn--primary" data-x>Fertig</button></div></div>`);
    let busy = 0;
    const list = $('[data-list]', body);
    const drop = $('[data-drop]', body);
    const start = async (files: File[]) => {
      const imgs = files.filter((f) => f.type.startsWith('image/'));
      const category = $<HTMLSelectElement>('[data-u-cat]', body).value;
      const location = $<HTMLInputElement>('[data-u-loc]', body).value.trim();
      const forSale = $<HTMLInputElement>('[name="u-sale"]', body).checked;
      const featured = $<HTMLInputElement>('[name="u-feat"]', body).checked;
      let sort = state.photos.length ? Math.min(...state.photos.map((p) => p.sort ?? 0)) - imgs.length : 0;
      for (const file of imgs) {
        const row = document.createElement('div');
        row.className = 'a-upload';
        row.innerHTML = `<img alt="" src="${URL.createObjectURL(file)}" /><div><div>${esc(file.name)}</div><div class="a-progress"><i></i></div></div><span data-st>wartet</span>`;
        list.prepend(row);
        busy++;
        const bar = $('i', row), st = $('[data-st]', row);
        try {
          st.textContent = 'optimiert …';
          const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
          let slug = slugify(title) || 'foto';
          while (state.photos.some((p) => p.slug === slug)) slug = `${slugify(title) || 'foto'}-${Math.random().toString(36).slice(2, 5)}`;
          const up = await processAndUpload(file, slug, (pct) => { bar.style.width = `${pct}%`; st.textContent = `${pct}%`; });
          const data = { slug, category, title: { de: title, en: title }, alt: { de: '', en: '' }, location, featured, forSale, published: true, sort: sort++, ...up, createdAt: serverTimestamp() };
          const newRef = doc(collection(db, 'photos'));
          await setDoc(newRef, data);
          state.photos.unshift({ id: newRef.id, ...data, createdAt: new Date() });
          state.photos.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
          st.textContent = '✓'; bar.style.width = '100%';
        } catch (err) {
          st.textContent = '✗'; st.title = (err as Error).message;
          toast(`${file.name}: ${(err as Error).message}`, 'error');
        } finally {
          busy--;
          if (!busy) { toast('Upload fertig – ergänze jetzt noch Titel & Beschreibungen.'); if (state.view === 'photos') renderPhotos(); }
        }
      }
    };
    const fileInput = $<HTMLInputElement>('[data-files]', body);
    fileInput.onchange = () => { start(Array.from(fileInput.files ?? [])); fileInput.value = ''; };
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => { e.stopPropagation(); start(Array.from((e as DragEvent).dataTransfer?.files ?? [])); });
    const close = async () => {
      if (busy && !(await confirmDialog('Uploads laufen noch – trotzdem schliessen?', 'Schliessen'))) { openUpload(); return; }
      modal.close(); if (state.view === 'photos') renderPhotos(); if (state.view === 'dashboard') renderDashboard();
    };
    $$('[data-x]', body).forEach((b) => (b.onclick = close));
    modal.oncancel = (e) => { e.preventDefault(); close(); };
    if (initial.length) start(initial);
  }


  /* ======================================================================
     Leistungen
     ====================================================================== */
  const INQ: [string, string][] = [['event', 'Event / Sport'], ['portrait', 'Portrait / Business'], ['print', 'Print / Lizenz'], ['other', 'Etwas anderes']];
  const L = (v: any, lang: 'de' | 'en') => (v && typeof v === 'object' ? v[lang] ?? '' : lang === 'de' ? v ?? '' : '');
  function renderServices() {
    view.innerHTML = `
      <div class="a-head"><div><h1>Leistungen</h1><p>Deine Angebote mit Texten, Paketen & Preisen und häufigen Fragen. Reihenfolge = Reihenfolge auf der Website.</p></div>
        <button class="a-btn a-btn--primary" data-new>＋ Neue Leistung</button></div>
      ${state.services.length ? '' : `<div class="a-card" style="margin-bottom:1.25rem;display:grid;gap:.75rem"><h2>Bestehende Leistungen übernehmen</h2>
        <p class="muted">Übernimm die drei bisherigen Leistungen (Event & Sport, Portrait & Business, Fine-Art-Prints) mit allen Paketen und Fragen, um sie hier zu bearbeiten.</p>
        <div><button class="a-btn a-btn--primary" data-import>Leistungen übernehmen</button></div></div>`}
      <div class="a-items">${state.services.map((sv, i) => {
        const c = photoBySlug(sv.cover);
        return `<div class="a-item a-item--click" data-id="${esc(sv.id)}"><img src="${esc(c?.thumb ?? '')}" alt="" /><div>
          <div class="a-item__title">${esc(sv.title?.de)}</div><div class="a-item__sub">${esc(sv.kicker?.de)}</div>
          <div class="a-photo__tags" style="margin-top:.4rem">${sv.published === false ? '<span class="a-tag a-tag--warn">versteckt</span>' : '<span class="a-tag a-tag--ok">online</span>'}
            ${sv.id === 'fine-art' ? '<span class="a-tag">führt zum Print-Shop</span>' : `<span class="a-tag">${(sv.packages ?? []).length} Pakete</span><span class="a-tag">${(sv.faq ?? []).length} Fragen</span>`}</div></div>
          <div class="a-item__actions"><button class="a-btn a-btn--sm" data-up ${i === 0 ? 'disabled' : ''} aria-label="Nach oben">↑</button><button class="a-btn a-btn--sm" data-down ${i === state.services.length - 1 ? 'disabled' : ''} aria-label="Nach unten">↓</button><button class="a-btn a-btn--sm">Bearbeiten</button></div></div>`;
      }).join('')}</div>`;
    view.onclick = async (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-new]')) return editService();
      if (t.closest('[data-import]')) return importDefaults(t.closest('button')!);
      const item = t.closest<HTMLElement>('[data-id]'); if (!item) return;
      const i = state.services.findIndex((x) => x.id === item.dataset.id);
      if (t.closest('[data-up]') || t.closest('[data-down]')) {
        const j = t.closest('[data-up]') ? i - 1 : i + 1;
        [state.services[i], state.services[j]] = [state.services[j], state.services[i]];
        try {
          const batch = writeBatch(db);
          state.services.forEach((x, n) => { x.sort = n; batch.update(doc(db, 'services', x.id), { sort: n }); });
          await batch.commit(); toast('Reihenfolge gespeichert');
        } catch (err) { toast(`Fehler: ${(err as Error).message}`, 'error'); }
        return renderServices();
      }
      editService(item.dataset.id);
    };
  }

  const pkgBlock = (p: Row = {}) => `
    <div class="a-repeat" data-pkg>
      <div class="a-repeat__head"><b>Paket</b><button type="button" class="a-btn a-btn--sm" data-mv="-1" aria-label="Nach oben">↑</button><button type="button" class="a-btn a-btn--sm" data-mv="1" aria-label="Nach unten">↓</button><button type="button" class="a-btn a-btn--sm a-btn--danger" data-rm-block>Entfernen</button></div>
      <div class="a-row">${field('Name (Deutsch)', `<input data-k="name_de" value="${esc(L(p.name, 'de'))}" placeholder="z. B. Halbtag" />`)}${field('Name (Englisch)', `<input data-k="name_en" value="${esc(L(p.name, 'en'))}" />`)}</div>
      <div class="a-row">${field('Preis (Deutsch)', `<input data-k="price_de" value="${esc(L(p.price, 'de'))}" placeholder="z. B. CHF 890 oder ab CHF 1’900" />`)}${field('Preis (Englisch)', `<input data-k="price_en" value="${esc(L(p.price, 'en') || L(p.price, 'de'))}" placeholder="from CHF 1,900" />`)}</div>
      ${field('Leistungen (Deutsch) – eine pro Zeile', `<textarea data-k="features_de" rows="4">${esc((p.features?.de ?? []).join('\n'))}</textarea>`)}
      ${field('Leistungen (Englisch) – eine pro Zeile', `<textarea data-k="features_en" rows="4">${esc((p.features?.en ?? []).join('\n'))}</textarea>`)}
      <label class="a-switch" style="border:0;min-height:auto"><span><b>Als «Beliebt» hervorheben</b></span><input type="checkbox" data-k="popular" ${p.popular ? 'checked' : ''} /></label>
    </div>`;
  const faqBlock = (f: Row = {}) => `
    <div class="a-repeat" data-faq>
      <div class="a-repeat__head"><b>Frage</b><button type="button" class="a-btn a-btn--sm" data-mv="-1" aria-label="Nach oben">↑</button><button type="button" class="a-btn a-btn--sm" data-mv="1" aria-label="Nach unten">↓</button><button type="button" class="a-btn a-btn--sm a-btn--danger" data-rm-block>Entfernen</button></div>
      ${field('Frage (Deutsch)', `<input data-k="q_de" value="${esc(f.q?.de)}" placeholder="z. B. Was kostet ein Eventfotograf?" />`)}
      ${field('Antwort (Deutsch)', `<textarea data-k="a_de" rows="3">${esc(f.a?.de)}</textarea>`)}
      ${field('Frage (Englisch)', `<input data-k="q_en" value="${esc(f.q?.en)}" />`)}
      ${field('Antwort (Englisch)', `<textarea data-k="a_en" rows="3">${esc(f.a?.en)}</textarea>`)}
    </div>`;
  const group = (title: string, hint: string, body: string, open = false) =>
    `<details class="a-group" ${open ? 'open' : ''}><summary>${esc(title)}<small>${esc(hint)}</small></summary><div class="a-group__body">${body}</div></details>`;

  function editService(id?: string) {
    const sv: Row = state.services.find((x) => x.id === id) ?? {
      title: { de: '', en: '' }, kicker: { de: '', en: '' }, slug: { de: '', en: '' }, seoTitle: { de: '', en: '' }, seoDescription: { de: '', en: '' },
      intro: { de: '', en: '' }, cover: '', gallery: [], highlights: { de: [], en: [] }, packages: [], faq: [], inquiryType: 'other', published: true,
    };
    const isShop = sv.id === 'fine-art';
    let gallery: string[] = [...(sv.gallery ?? [])];
    const panel = openDrawer(id ? `Leistung: ${sv.title?.de}` : 'Neue Leistung', `
      ${isShop ? '<div class="a-help">Diese Leistung führt auf der Website direkt in den Print-Shop. Titel, Einleitung und SEO-Texte erscheinen dort; Preise verwaltest du unter «Print-Preise».</div>' : ''}
      ${group('Grundangaben', 'Titel & Untertitel', `
        <div class="a-row">${field('Titel (Deutsch)', input('title_de', sv.title?.de, 'required placeholder="z. B. Hochzeitsfotografie"'))}${field('Titel (Englisch)', input('title_en', sv.title?.en))}</div>
        <div class="a-row">${field('Untertitel (Deutsch)', input('kicker_de', sv.kicker?.de, 'placeholder="Stichworte, mit · getrennt"'))}${field('Untertitel (Englisch)', input('kicker_en', sv.kicker?.en))}</div>
        ${field('Einleitung (Deutsch)', textarea('intro_de', sv.intro?.de, 'rows="5"'), 'Der wichtigste Text der Seite – erzähl, wie du arbeitest und was Kund:innen bekommen.')}
        ${field('Einleitung (Englisch)', textarea('intro_en', sv.intro?.en, 'rows="5"'))}`, true)}
      ${group('Bilder', 'Titelbild & Galerie', `
        ${coverField('cover', sv.cover)}
        ${isShop ? '' : `<div class="a-field"><span>Galerie auf der Seite</span><div class="a-thumbs" data-gallery></div><small>Klick auf ＋ zum Hinzufügen, ✕ zum Entfernen.</small></div>`}`)}
      ${isShop ? '' : group('Highlights', 'Kurze Vorteile mit ✦', `
        ${field('Highlights (Deutsch) – eins pro Zeile', textarea('hl_de', (sv.highlights?.de ?? []).join('\n'), 'rows="4"'))}
        ${field('Highlights (Englisch) – eins pro Zeile', textarea('hl_en', (sv.highlights?.en ?? []).join('\n'), 'rows="4"'))}`)}
      ${isShop ? '' : group('Pakete & Preise', `${(sv.packages ?? []).length} Pakete`, `
        <div style="display:grid;gap:.75rem" data-pkgs>${(sv.packages ?? []).map(pkgBlock).join('')}</div>
        <div><button type="button" class="a-btn a-btn--sm" data-add-pkg>＋ Paket hinzufügen</button></div>`)}
      ${isShop ? '' : group('Häufige Fragen (FAQ)', `${(sv.faq ?? []).length} Fragen · erscheint auch bei Google`, `
        <div style="display:grid;gap:.75rem" data-faqs>${(sv.faq ?? []).map(faqBlock).join('')}</div>
        <div><button type="button" class="a-btn a-btn--sm" data-add-faq>＋ Frage hinzufügen</button></div>`)}
      ${group('Google (SEO)', 'Titel & Beschreibung in den Suchergebnissen', `
        ${field('Seitentitel (Deutsch)', input('seo_title_de', sv.seoTitle?.de, 'maxlength="70" placeholder="z. B. Hochzeitsfotograf Zürich | Fabio Berta"'), 'Max. ca. 60 Zeichen, mit Suchbegriff + Ort')}
        ${field('Seitentitel (Englisch)', input('seo_title_en', sv.seoTitle?.en, 'maxlength="70"'))}
        <label class="a-field"><span>Beschreibung (Deutsch)</span>${textarea('seo_desc_de', sv.seoDescription?.de, 'rows="3" maxlength="220"')}<small class="a-counter" data-count="seo_desc_de"></small></label>
        <label class="a-field"><span>Beschreibung (Englisch)</span>${textarea('seo_desc_en', sv.seoDescription?.en, 'rows="3" maxlength="220"')}<small class="a-counter" data-count="seo_desc_en"></small></label>
        ${isShop ? '' : `<div class="a-row">${field('URL-Name (Deutsch)', input('slug_de', sv.slug?.de, 'pattern="[a-z0-9-]+"'), '/leistungen/…')}${field('URL-Name (Englisch)', input('slug_en', sv.slug?.en, 'pattern="[a-z0-9-]+"'), '/en/services/…')}</div>`}`)}
      ${group('Einstellungen', '', `
        ${isShop ? '' : field('Vorauswahl im Kontaktformular', `<select name="inquiryType">${options(INQ, sv.inquiryType || 'other')}</select>`, 'Was beim Klick auf «Anfragen» vorausgewählt ist')}
        <div class="a-card" style="padding:.25rem 1rem">${sw('published', 'Auf der Website sichtbar', 'Ausgeschaltet = Seite und Menüeintrag verschwinden', sv.published !== false)}</div>`)}`,
      saveFoot(id ? `${isShop ? '' : '<button class="a-btn a-btn--danger" data-delete>Löschen</button>'}<a class="a-btn a-btn--ghost" href="${isShop ? '/shop' : `/leistungen/${esc(sv.slug?.de)}`}" target="_blank" rel="noopener">Ansehen ↗</a>` : ''),
      async () => {
        const d = formData(panel);
        if (!d.title_de) throw new Error('Bitte einen Titel eingeben.');
        const lines = (v: string) => String(v ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
        const blocks = (sel: string) => $$(sel, panel).map((b) => {
          const o: Row = {};
          $$<HTMLInputElement>('[data-k]', b).forEach((el) => (o[el.dataset.k!] = el.type === 'checkbox' ? el.checked : el.value.trim()));
          return o;
        });
        const packages = isShop ? [] : blocks('[data-pkg]').filter((p) => p.name_de || p.price_de).map((p) => ({
          name: { de: p.name_de, en: p.name_en || p.name_de },
          price: { de: p.price_de, en: p.price_en || p.price_de },
          features: { de: lines(p.features_de), en: lines(p.features_en).length ? lines(p.features_en) : lines(p.features_de) },
          popular: Boolean(p.popular),
        }));
        const faq = isShop ? [] : blocks('[data-faq]').filter((f) => f.q_de && f.a_de).map((f) => ({ q: { de: f.q_de, en: f.q_en || f.q_de }, a: { de: f.a_de, en: f.a_en || f.a_de } }));
        const slugDe = isShop ? 'fine-art-prints' : slugify(d.slug_de || d.title_de);
        const slugEn = isShop ? 'fine-art-prints' : slugify(d.slug_en || d.title_en || d.title_de);
        if (state.services.some((x) => x.id !== id && (x.slug?.de === slugDe || x.slug?.en === slugEn))) throw new Error('Dieser URL-Name ist schon vergeben.');
        const data: Row = {
          title: { de: d.title_de, en: d.title_en || d.title_de }, kicker: { de: d.kicker_de, en: d.kicker_en || d.kicker_de },
          slug: { de: slugDe, en: slugEn },
          seoTitle: { de: d.seo_title_de || `${d.title_de} Zürich | Fabio Berta`, en: d.seo_title_en || d.seo_title_de || `${d.title_en || d.title_de} Zurich | Fabio Berta` },
          seoDescription: { de: d.seo_desc_de || d.intro_de.slice(0, 155), en: d.seo_desc_en || (d.intro_en || d.intro_de).slice(0, 155) },
          intro: { de: d.intro_de, en: d.intro_en || d.intro_de }, cover: d.cover, gallery: isShop ? [] : gallery,
          highlights: isShop ? { de: [], en: [] } : { de: lines(d.hl_de), en: lines(d.hl_en).length ? lines(d.hl_en) : lines(d.hl_de) },
          packages, faq, inquiryType: isShop ? 'print' : d.inquiryType, published: d.published,
          sort: sv.sort ?? state.services.length,
        };
        const r = id ? doc(db, 'services', id) : doc(collection(db, 'services'));
        await setDoc(r, data);
        id ? Object.assign(sv, data) : state.services.push({ id: r.id, ...data });
        toast('Leistung gespeichert ✓ – live in max. 5 Minuten'); renderServices();
      });

    // Galerie
    const gal = panel.querySelector<HTMLElement>('[data-gallery]');
    const drawGallery = () => {
      if (!gal) return;
      gal.innerHTML = gallery.map((slug, i) => `<div class="a-thumb"><img src="${esc(photoBySlug(slug)?.thumb ?? '')}" alt="" /><button type="button" data-gal-rm="${i}" aria-label="Entfernen">✕</button></div>`).join('')
        + '<button type="button" class="a-thumb a-thumb--add" data-gal-add aria-label="Bild hinzufügen">＋</button>';
    };
    drawGallery();
    gal?.addEventListener('click', async (e) => {
      const t = e.target as HTMLElement;
      const rm = t.closest<HTMLElement>('[data-gal-rm]');
      if (rm) { gallery.splice(Number(rm.dataset.galRm), 1); dirty = true; return drawGallery(); }
      if (t.closest('[data-gal-add]')) { const slug = await pickPhoto(); if (slug && !gallery.includes(slug)) { gallery.push(slug); dirty = true; drawGallery(); } }
    });
    // Pakete & FAQ
    panel.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-add-pkg]')) { $('[data-pkgs]', panel).insertAdjacentHTML('beforeend', pkgBlock()); dirty = true; $<HTMLInputElement>('[data-pkg]:last-child [data-k="name_de"]', panel).focus(); }
      if (t.closest('[data-add-faq]')) { $('[data-faqs]', panel).insertAdjacentHTML('beforeend', faqBlock()); dirty = true; $<HTMLInputElement>('[data-faq]:last-child [data-k="q_de"]', panel).focus(); }
      const block = t.closest<HTMLElement>('[data-pkg], [data-faq]');
      if (block && t.closest('[data-rm-block]')) { block.remove(); dirty = true; }
      const mv = t.closest<HTMLElement>('[data-mv]');
      if (block && mv) {
        const sib = mv.dataset.mv === '-1' ? block.previousElementSibling : block.nextElementSibling;
        if (sib) { mv.dataset.mv === '-1' ? sib.before(block) : sib.after(block); dirty = true; }
      }
    });
    panel.querySelectorAll<HTMLElement>('[data-count]').forEach((c) => {
      const ta = $<HTMLTextAreaElement>(`[name="${c.dataset.count}"]`, panel);
      const upd = () => { c.textContent = `${ta.value.length} / 160 Zeichen`; c.classList.toggle('is-over', ta.value.length > 160); };
      ta.addEventListener('input', upd); upd();
    });
    bindCoverPickers(panel);
    if (!id) autoSlug(panel, 'title_de', 'slug_de');
    panel.querySelector('[data-delete]')?.addEventListener('click', async () => {
      if (!(await confirmDialog('Diese Leistung löschen? Die Seite verschwindet von der Website.', 'Löschen', true))) return;
      await deleteDoc(doc(db, 'services', id!)); state.services = state.services.filter((x) => x.id !== id);
      toast('Leistung gelöscht'); closeDrawer(true); renderServices();
    });
  }

  /* ======================================================================
     Events
     ====================================================================== */
  function renderEvents() {
    view.innerHTML = `
      <div class="a-head"><div><h1>Events</h1><p>Events mit Link zur Teilnehmer-Galerie, z. B. Meisterschaften.</p></div><button class="a-btn a-btn--primary" data-new>＋ Neues Event</button></div>
      <div class="a-items">${state.events.map((e) => {
        const c = photoBySlug(e.cover);
        return `<div class="a-item a-item--click" data-id="${e.id}"><img src="${esc(c?.thumb ?? '')}" alt="" /><div><div class="a-item__title">${esc(e.title)}</div><div class="a-item__sub">${fmtDate(e.date)} · ${esc(e.location)}</div>
          <div class="a-photo__tags" style="margin-top:.4rem">${e.published === false ? '<span class="a-tag a-tag--warn">versteckt</span>' : '<span class="a-tag a-tag--ok">online</span>'}${e.galleryUrl ? '<span class="a-tag">Galerie verlinkt</span>' : '<span class="a-tag a-tag--warn">kein Galerie-Link</span>'}</div></div>
          <div class="a-item__actions"><button class="a-btn a-btn--sm">Bearbeiten</button></div></div>`;
      }).join('') || '<div class="a-empty"><b>Noch keine Events</b>Leg dein erstes Event an.</div>'}</div>`;
    view.onclick = (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-new]')) return editEvent();
      const item = t.closest<HTMLElement>('[data-id]'); if (item) editEvent(item.dataset.id);
    };
  }
  function editEvent(id?: string) {
    const e: Row = state.events.find((x) => x.id === id) ?? { title: '', slug: '', date: new Date().toISOString().slice(0, 10), location: '', cover: '', galleryUrl: '', summary: { de: '', en: '' }, body: { de: '', en: '' }, published: true };
    const panel = openDrawer(id ? 'Event bearbeiten' : 'Neues Event', `
      ${field('Name des Events', input('title', e.title, 'required placeholder="z. B. SNBF International Open 2025"'))}
      <div class="a-row">${field('Datum', input('date', e.date, 'type="date" required'))}${field('Ort', input('location', e.location, 'placeholder="z. B. Zürich"'))}</div>
      ${coverField('cover', e.cover)}
      ${field('Link zur Galerie', input('galleryUrl', e.galleryUrl, 'type="url" placeholder="https://…"'), 'Wo Teilnehmende ihre Fotos finden (z. B. Pixieset, Google Drive). Leer = Button «Fotos anfragen».')}
      ${field('Kurzbeschreibung (Deutsch)', textarea('summary_de', e.summary?.de, 'rows="2" style="min-height:70px"'))}
      ${field('Kurzbeschreibung (Englisch)', textarea('summary_en', e.summary?.en, 'rows="2" style="min-height:70px"'))}
      ${field('Text (Deutsch)', textarea('body_de', e.body?.de))}
      ${field('Text (Englisch)', textarea('body_en', e.body?.en))}
      ${field('URL-Name', input('slug', e.slug, 'pattern="[a-z0-9-]+"'), 'fabioberta.com/events/…')}
      <div class="a-card" style="padding:.25rem 1rem">${sw('published', 'Auf der Website sichtbar', '', e.published !== false)}</div>`,
      saveFoot(id ? `<button class="a-btn a-btn--danger" data-delete>Löschen</button>${e.slug ? `<a class="a-btn a-btn--ghost" href="/events/${esc(e.slug)}" target="_blank" rel="noopener">Ansehen ↗</a>` : ''}` : ''),
      async () => {
        const d = formData(panel);
        if (!d.title) throw new Error('Bitte einen Namen eingeben.');
        const slug = slugify(d.slug || d.title);
        if (state.events.some((x) => x.slug === slug && x.id !== id)) throw new Error('URL-Name schon vergeben.');
        const data = { title: d.title, slug, date: d.date, location: d.location, cover: d.cover, galleryUrl: d.galleryUrl, summary: { de: d.summary_de, en: d.summary_en || d.summary_de }, body: { de: d.body_de, en: d.body_en || d.body_de }, published: d.published };
        const r = id ? doc(db, 'events', id) : doc(collection(db, 'events'));
        await setDoc(r, data);
        id ? Object.assign(e, data) : state.events.unshift({ id: r.id, ...data });
        state.events.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        toast('Event gespeichert ✓'); renderEvents();
      });
    autoSlug(panel, 'title', 'slug');
    bindCoverPickers(panel);
    panel.querySelector('[data-delete]')?.addEventListener('click', async () => {
      if (!(await confirmDialog('Event löschen?', 'Löschen', true))) return;
      await deleteDoc(doc(db, 'events', id!)); state.events = state.events.filter((x) => x.id !== id);
      toast('Event gelöscht'); closeDrawer(true); renderEvents();
    });
  }

  /* ======================================================================
     Ausstellungen
     ====================================================================== */
  function renderExhibitions() {
    view.innerHTML = `
      <div class="a-head"><div><h1>Ausstellungen</h1><p>Vergangene und kommende Ausstellungen.</p></div><button class="a-btn a-btn--primary" data-new>＋ Neue Ausstellung</button></div>
      <div class="a-items">${state.exhibitions.map((x) => `<div class="a-item a-item--click" data-id="${x.id}"><img src="${esc(x.image)}" alt="" /><div><div class="a-item__title">${esc(x.title)}</div><div class="a-item__sub">${esc(x.dateLabel?.de || fmtDate(x.date))} · ${esc(x.venue)}, ${esc(x.city)}</div>
        <div class="a-photo__tags" style="margin-top:.4rem">${x.published === false ? '<span class="a-tag a-tag--warn">versteckt</span>' : '<span class="a-tag a-tag--ok">online</span>'}${String(x.date) > new Date().toISOString().slice(0, 10) ? '<span class="a-tag a-tag--accent">kommend</span>' : ''}</div></div>
        <div class="a-item__actions"><button class="a-btn a-btn--sm">Bearbeiten</button></div></div>`).join('') || '<div class="a-empty"><b>Noch keine Ausstellungen</b></div>'}</div>`;
    view.onclick = (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-new]')) return editExhibition();
      const item = t.closest<HTMLElement>('[data-id]'); if (item) editExhibition(item.dataset.id);
    };
  }
  function editExhibition(id?: string) {
    const x: Row = state.exhibitions.find((e) => e.id === id) ?? { title: '', date: new Date().toISOString().slice(0, 10), dateLabel: { de: '', en: '' }, venue: '', city: '', image: '', imageAlt: { de: '', en: '' }, photoSlug: '', text: { de: '', en: '' }, url: '', published: true };
    const panel = openDrawer(id ? 'Ausstellung bearbeiten' : 'Neue Ausstellung', `
      ${field('Titel', input('title', x.title, 'required placeholder="z. B. Photo Schweiz 2026"'))}
      <div class="a-row">${field('Startdatum', input('date', x.date, 'type="date" required'))}${field('Zeitraum als Text (optional)', input('label_de', x.dateLabel?.de, 'placeholder="2.–11. Juli 2026"'))}</div>
      <div class="a-row">${field('Ort / Halle', input('venue', x.venue))}${field('Stadt', input('city', x.city))}</div>
      <div class="a-field"><span>Bild (Plakat oder Foto)</span><div class="a-cover-field"><img data-ex-img src="${esc(x.image)}" alt="" ${x.image ? '' : 'hidden'} /><input type="hidden" name="image" value="${esc(x.image)}" />
        <button type="button" class="a-btn a-btn--sm" data-ex-upload>Bild hochladen</button><button type="button" class="a-btn a-btn--sm" data-ex-pick>Aus Portfolio</button></div></div>
      ${coverField('photoSlug', x.photoSlug, 'Verlinktes Portfolio-Bild (optional, für «Das Bild ansehen»)')}
      ${field('Text (Deutsch)', textarea('text_de', x.text?.de))}
      ${field('Text (Englisch)', textarea('text_en', x.text?.en))}
      ${field('Link zur Ausstellung', input('url', x.url, 'type="url" placeholder="https://…"'))}
      <div class="a-card" style="padding:.25rem 1rem">${sw('published', 'Auf der Website sichtbar', '', x.published !== false)}</div>`,
      saveFoot(id ? '<button class="a-btn a-btn--danger" data-delete>Löschen</button>' : ''),
      async () => {
        const d = formData(panel);
        if (!d.title) throw new Error('Bitte einen Titel eingeben.');
        const data = { title: d.title, date: d.date, dateLabel: { de: d.label_de || fmtDate(d.date), en: d.label_de || new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }, venue: d.venue, city: d.city, image: d.image, imageAlt: { de: d.title, en: d.title }, photoSlug: d.photoSlug, text: { de: d.text_de, en: d.text_en || d.text_de }, url: d.url, published: d.published };
        const r = id ? doc(db, 'exhibitions', id) : doc(collection(db, 'exhibitions'));
        await setDoc(r, data);
        id ? Object.assign(x, data) : state.exhibitions.unshift({ id: r.id, ...data });
        state.exhibitions.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        toast('Ausstellung gespeichert ✓'); renderExhibitions();
      });
    bindCoverPickers(panel);
    const setImg = (url: string) => { $<HTMLInputElement>('[name="image"]', panel).value = url; const img = $<HTMLImageElement>('[data-ex-img]', panel); img.src = url; img.hidden = !url; dirty = true; };
    $('[data-ex-pick]', panel).onclick = async () => { const s = await pickPhoto(); if (s) setImg(photoBySlug(s)?.thumb ?? ''); };
    $('[data-ex-upload]', panel).onclick = () => {
      const fi = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
      fi.onchange = async () => {
        const f = fi.files?.[0]; if (!f) return;
        toast('Bild wird hochgeladen …', 'info');
        try { const up = await processAndUpload(f, `ausstellung-${slugify($<HTMLInputElement>('[name="title"]', panel).value) || 'bild'}`, () => {}); setImg(up.thumb); toast('Bild hochgeladen ✓'); }
        catch (err) { toast(`Upload fehlgeschlagen: ${(err as Error).message}`, 'error'); }
      };
      fi.click();
    };
    panel.querySelector('[data-delete]')?.addEventListener('click', async () => {
      if (!(await confirmDialog('Ausstellung löschen?', 'Löschen', true))) return;
      await deleteDoc(doc(db, 'exhibitions', id!)); state.exhibitions = state.exhibitions.filter((e) => e.id !== id);
      toast('Ausstellung gelöscht'); closeDrawer(true); renderExhibitions();
    });
  }

  /* ======================================================================
     Journal
     ====================================================================== */
  function renderPosts() {
    const list = state.posts.filter((p) => state.postLang === 'all' || p.lang === state.postLang);
    view.innerHTML = `
      <div class="a-head"><div><h1>Journal</h1><p>Blog-Beiträge – gut für Google. Tipp: Nach jedem Event einen kurzen Beitrag schreiben.</p></div><button class="a-btn a-btn--primary" data-new>＋ Neuer Beitrag</button></div>
      <div class="a-toolbar">${[['all', 'Alle'], ['de', 'Deutsch'], ['en', 'Englisch']].map(([v, l]) => `<button class="chip ${state.postLang === v ? 'is-active' : ''}" data-lang="${v}">${l}</button>`).join('')}</div>
      <div class="a-items">${list.map((p) => {
        const c = photoBySlug(p.cover);
        const hasTr = state.posts.some((o) => o.id !== p.id && o.translationKey && o.translationKey === p.translationKey);
        return `<div class="a-item a-item--click" data-id="${p.id}"><img src="${esc(c?.thumb ?? '')}" alt="" /><div><div class="a-item__title">${esc(p.title)}</div><div class="a-item__sub">${fmtDate(p.date)} · ${esc((p.tags ?? []).join(', '))}</div>
          <div class="a-photo__tags" style="margin-top:.4rem"><span class="a-tag">${p.lang === 'en' ? 'EN' : 'DE'}</span>${p.published === false ? '<span class="a-tag a-tag--warn">Entwurf</span>' : '<span class="a-tag a-tag--ok">online</span>'}${hasTr ? '<span class="a-tag">übersetzt</span>' : ''}</div></div>
          <div class="a-item__actions"><button class="a-btn a-btn--sm">Bearbeiten</button></div></div>`;
      }).join('') || '<div class="a-empty"><b>Noch keine Beiträge</b></div>'}</div>`;
    view.onclick = (e) => {
      const t = e.target as HTMLElement;
      const l = t.closest<HTMLElement>('[data-lang]'); if (l) { state.postLang = l.dataset.lang!; return renderPosts(); }
      if (t.closest('[data-new]')) return editPost();
      const item = t.closest<HTMLElement>('[data-id]'); if (item) editPost(item.dataset.id);
    };
  }
  function editPost(id?: string) {
    const p: Row = state.posts.find((x) => x.id === id) ?? { lang: state.postLang === 'en' ? 'en' : 'de', title: '', slug: '', description: '', date: new Date(), cover: '', tags: [], body: '', translationKey: '', published: false };
    const others = state.posts.filter((o) => o.lang !== p.lang && o.id !== id);
    const panel = openDrawer(id ? 'Beitrag bearbeiten' : 'Neuer Beitrag', `
      <div class="a-row">${field('Sprache', `<select name="lang">${options([['de', 'Deutsch'], ['en', 'Englisch']], p.lang)}</select>`)}${field('Datum', input('date', isoDay(p.date), 'type="date"'))}</div>
      ${field('Titel', input('title', p.title, 'required maxlength="90"'), 'Kurz und mit Suchbegriff, z. B. «Eventfotograf in Zürich buchen: 7 Tipps»')}
      <label class="a-field"><span>Kurzbeschreibung (für Google)</span>${textarea('description', p.description, 'rows="2" style="min-height:70px" maxlength="200"')}<small class="a-counter" data-counter></small></label>
      ${coverField('cover', p.cover)}
      ${field('Schlagwörter', input('tags', (p.tags ?? []).join(', '), 'placeholder="Eventfotografie, Zürich"'), 'Mit Komma trennen')}
      <div class="a-field"><span>Text</span>
        <div class="a-md-toolbar"><button type="button" class="a-btn a-btn--sm" data-md="## ">Zwischentitel</button><button type="button" class="a-btn a-btn--sm" data-md="**">Fett</button><button type="button" class="a-btn a-btn--sm" data-md="- ">Liste</button><button type="button" class="a-btn a-btn--sm" data-md="link">Link</button><button type="button" class="a-btn a-btn--sm" data-preview>Vorschau</button></div>
        ${textarea('body', p.body, 'class="a-md"')}
        <div class="a-md-preview prose" data-preview-box hidden></div>
        <small>Formatierung: <code>## Zwischentitel</code>, <code>**fett**</code>, <code>- Liste</code>, <code>[Linktext](/kontakt)</code></small></div>
      ${field('Übersetzung von / verknüpft mit', `<select name="translationOf"><option value="">– keine –</option>${others.map((o) => `<option value="${o.id}" ${o.translationKey && o.translationKey === p.translationKey ? 'selected' : ''}>${esc(o.lang.toUpperCase())}: ${esc(o.title)}</option>`).join('')}</select>`, 'Damit der Sprachwechsel auf der Website direkt zur Übersetzung führt.')}
      ${field('URL-Name', input('slug', p.slug, 'pattern="[a-z0-9-]+"'), '/journal/…')}
      <div class="a-card" style="padding:.25rem 1rem">${sw('published', 'Veröffentlicht', 'Ausgeschaltet = Entwurf, nur hier sichtbar', p.published !== false)}</div>`,
      saveFoot(id ? `<button class="a-btn a-btn--danger" data-delete>Löschen</button>${p.slug ? `<a class="a-btn a-btn--ghost" href="${p.lang === 'en' ? '/en' : ''}/journal/${esc(p.slug)}" target="_blank" rel="noopener">Ansehen ↗</a>` : ''}` : ''),
      async () => {
        const d = formData(panel);
        if (!d.title) throw new Error('Bitte einen Titel eingeben.');
        const slug = slugify(d.slug || d.title);
        if (state.posts.some((x) => x.slug === slug && x.lang === d.lang && x.id !== id)) throw new Error('URL-Name schon vergeben.');
        const r = id ? doc(db, 'posts', id) : doc(collection(db, 'posts'));
        const partner = state.posts.find((o) => o.id === d.translationOf);
        let translationKey = partner ? partner.translationKey || partner.id : p.translationKey || r.id;
        if (partner && !partner.translationKey) { await updateDoc(doc(db, 'posts', partner.id), { translationKey }); partner.translationKey = translationKey; }
        if (!partner && p.translationKey && state.posts.some((o) => o.id !== id && o.translationKey === p.translationKey)) translationKey = r.id;
        const data = { lang: d.lang, title: d.title, slug, description: d.description, date: Timestamp.fromDate(d.date ? new Date(d.date) : new Date()), cover: d.cover, tags: String(d.tags).split(',').map((s: string) => s.trim()).filter(Boolean), body: d.body, translationKey, published: d.published };
        await setDoc(r, data);
        id ? Object.assign(p, data) : state.posts.unshift({ id: r.id, ...data });
        state.posts.sort((a, b) => +(toDate(b.date) ?? 0) - +(toDate(a.date) ?? 0));
        toast(d.published ? 'Beitrag veröffentlicht ✓' : 'Entwurf gespeichert ✓'); renderPosts();
      });
    autoSlug(panel, 'title', 'slug');
    bindCoverPickers(panel);
    const desc = $<HTMLTextAreaElement>('[name="description"]', panel), counter = $('[data-counter]', panel);
    const count = () => { counter.textContent = `${desc.value.length} / 160 Zeichen`; counter.classList.toggle('is-over', desc.value.length > 160); };
    desc.addEventListener('input', count); count();
    const ta = $<HTMLTextAreaElement>('[name="body"]', panel);
    $$<HTMLElement>('[data-md]', panel).forEach((b) => b.addEventListener('click', () => {
      const m = b.dataset.md!, s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
      let ins = m === '**' ? `**${sel || 'fetter Text'}**` : m === 'link' ? `[${sel || 'Linktext'}](https://)` : `${s && ta.value[s - 1] !== '\n' ? '\n' : ''}${m}${sel || (m === '## ' ? 'Zwischentitel' : 'Punkt')}`;
      ta.setRangeText(ins, s, e, 'end'); ta.focus(); dirty = true;
    }));
    const box = $('[data-preview-box]', panel);
    $('[data-preview]', panel).onclick = (e) => {
      const showing = !box.hidden;
      box.hidden = showing; ta.hidden = !showing;
      (e.target as HTMLElement).textContent = showing ? 'Vorschau' : 'Bearbeiten';
      if (!showing) box.innerHTML = marked.parse(ta.value, { async: false }) as string;
    };
    panel.querySelector('[data-delete]')?.addEventListener('click', async () => {
      if (!(await confirmDialog('Beitrag löschen?', 'Löschen', true))) return;
      await deleteDoc(doc(db, 'posts', id!)); state.posts = state.posts.filter((x) => x.id !== id);
      toast('Beitrag gelöscht'); closeDrawer(true); renderPosts();
    });
  }

  /* ======================================================================
     Preise
     ====================================================================== */
  function renderPrices() {
    const cfg: Row = structuredClone(state.prints ?? defaults.prints);
    const matHtml = (m: Row, i: number) => `
      <section class="a-card" data-mat="${i}" style="display:grid;gap:1rem">
        <div class="a-head" style="margin:0"><h2>${esc(m.name?.de)}</h2>${sw(`active_${i}`, 'Angeboten', '', m.active !== false).replace('a-switch', 'a-switch" style="border:0;min-height:auto')}</div>
        <div class="a-row">${field('Name (Deutsch)', input(`name_de_${i}`, m.name?.de))}${field('Name (Englisch)', input(`name_en_${i}`, m.name?.en))}</div>
        ${field('Beschreibung (Deutsch)', textarea(`desc_de_${i}`, m.description?.de, 'rows="2" style="min-height:60px"'))}
        ${field('Beschreibung (Englisch)', textarea(`desc_en_${i}`, m.description?.en, 'rows="2" style="min-height:60px"'))}
        <table class="a-price-table"><thead><tr><th>Breite (cm)</th><th>Höhe (cm)</th><th>Preis (CHF)</th><th></th></tr></thead><tbody>
        ${m.sizes.map((s: Row) => `<tr data-size><td><input class="a-input" type="number" min="5" value="${s.w}" data-w /></td><td><input class="a-input" type="number" min="5" value="${s.h}" data-h /></td><td><input class="a-input" type="number" min="1" step="1" value="${s.price}" data-price /></td><td><button class="a-icon-btn" data-rm aria-label="Format entfernen">✕</button></td></tr>`).join('')}
        </tbody></table>
        <div><button class="a-btn a-btn--sm" data-add>＋ Format hinzufügen</button></div>
      </section>`;
    view.innerHTML = `
      <div class="a-head"><div><h1>Print-Preise</h1><p>Preise in CHF. Formate gelten für Querformat – bei Hochformat dreht die Website sie automatisch.</p></div>
        <div style="display:flex;gap:.5rem"><button class="a-btn" data-reset>Standard wiederherstellen</button><button class="a-btn a-btn--primary" data-save-prices>Preise speichern</button></div></div>
      <div style="display:grid;gap:1rem">${cfg.materials.map(matHtml).join('')}
        <section class="a-card" style="display:grid;gap:1rem"><h2>Versand</h2>
          <div class="a-row">${field('Schweiz & Liechtenstein (CHF)', input('ship_ch', cfg.shipping.ch.price, 'type="number" min="0"'))}${field('Europa (CHF)', input('ship_eu', cfg.shipping.eu.price, 'type="number" min="0"'))}${field('Gratisversand ab (CHF)', input('ship_free', cfg.shipping.freeFrom, 'type="number" min="0"'))}</div>
        </section></div>`;
    view.onclick = async (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-add]')) {
        const tbody = $('tbody', t.closest('[data-mat]')!);
        tbody.insertAdjacentHTML('beforeend', `<tr data-size><td><input class="a-input" type="number" min="5" value="" data-w /></td><td><input class="a-input" type="number" min="5" value="" data-h /></td><td><input class="a-input" type="number" min="1" value="" data-price /></td><td><button class="a-icon-btn" data-rm aria-label="Format entfernen">✕</button></td></tr>`);
        $<HTMLInputElement>('tr:last-child [data-w]', tbody).focus();
      }
      if (t.closest('[data-rm]')) t.closest('tr')!.remove();
      if (t.closest('[data-reset]') && (await confirmDialog('Alle Preise auf die Standardwerte zurücksetzen?', 'Zurücksetzen', true))) { state.prints = structuredClone(defaults.prints); renderPrices(); toast('Standard geladen – noch speichern!', 'info'); }
      if (t.closest('[data-save-prices]')) {
        try {
          const val = (n: string) => $<HTMLInputElement>(`[name="${n}"]`, view).value.trim();
          const materials = cfg.materials.map((m: Row, i: number) => {
            const sizes = $$('[data-size]', $(`[data-mat="${i}"]`, view)).map((tr) => {
              const w = Number($<HTMLInputElement>('[data-w]', tr).value), h = Number($<HTMLInputElement>('[data-h]', tr).value), price = Number($<HTMLInputElement>('[data-price]', tr).value);
              if (!w || !h || !price) throw new Error(`Bitte bei «${m.name.de}» alle Felder (Breite, Höhe, Preis) ausfüllen.`);
              return { id: `${w}x${h}`, w, h, price };
            }).sort((a, b) => a.price - b.price);
            return { id: m.id, name: { de: val(`name_de_${i}`), en: val(`name_en_${i}`) }, description: { de: val(`desc_de_${i}`), en: val(`desc_en_${i}`) }, active: $<HTMLInputElement>(`[name="active_${i}"]`, view).checked, sizes };
          });
          const shipping = { ch: { ...cfg.shipping.ch, price: Number(val('ship_ch')) }, eu: { ...cfg.shipping.eu, price: Number(val('ship_eu')) }, freeFrom: Number(val('ship_free')) };
          const data = { materials, shipping };
          await setDoc(doc(db, 'settings', 'prints'), data);
          state.prints = data;
          toast('Preise gespeichert ✓ – live in max. 5 Minuten');
          renderPrices();
        } catch (err) { toast((err as Error).message, 'error'); }
      }
    };
  }

  /* ======================================================================
     Anfragen
     ====================================================================== */
  function renderInquiries() {
    const f = state.inquiryFilter;
    const list = state.inquiries.filter((i) => f === 'all' || (f === 'open' ? !i.handled : i.handled));
    view.innerHTML = `
      <div class="a-head"><div><h1>Anfragen</h1><p>Nachrichten aus dem Kontaktformular. Du bekommst zusätzlich eine E-Mail.</p></div></div>
      <div class="a-toolbar">${[['open', 'Offen'], ['done', 'Erledigt'], ['all', 'Alle']].map(([v, l]) => `<button class="chip ${f === v ? 'is-active' : ''}" data-f="${v}">${l}</button>`).join('')}</div>
      <div class="a-items">${list.map((i) => `
        <article class="a-item ${i.handled ? 'is-done' : ''}" data-id="${i.id}" style="grid-template-columns:1fr auto">
          <div><div class="a-item__title">${esc(i.name)} <span class="a-tag">${esc(TYPES[i.type] ?? i.type)}</span></div>
            <div class="a-item__sub">${fmtDate(i.createdAt, true)} · <a href="mailto:${esc(i.email)}">${esc(i.email)}</a>${i.phone ? ` · <a href="tel:${esc(i.phone)}">${esc(i.phone)}</a>` : ''}${i.eventDate ? ` · Wunschdatum: ${fmtDate(i.eventDate)}` : ''}</div></div>
          <div class="a-item__actions">
            <a class="a-btn a-btn--sm a-btn--primary" href="mailto:${esc(i.email)}?subject=${encodeURIComponent('Deine Anfrage bei Fabio Berta Photography')}&body=${encodeURIComponent(`Hallo ${i.name}\n\nVielen Dank für deine Nachricht!\n\n\n\nLiebe Grüsse\nFabio\n\n---\n${i.message}`)}">Antworten</a>
            <button class="a-btn a-btn--sm" data-toggle>${i.handled ? 'Wieder öffnen' : '✓ Erledigt'}</button>
            <button class="a-btn a-btn--sm a-btn--danger" data-del aria-label="Löschen">Löschen</button></div>
          <div class="a-item__msg">${esc(i.message)}</div>
        </article>`).join('') || `<div class="a-empty"><b>${f === 'open' ? 'Alles erledigt 🎉' : 'Keine Anfragen'}</b></div>`}</div>`;
    view.onclick = async (e) => {
      const t = e.target as HTMLElement;
      const fb = t.closest<HTMLElement>('[data-f]'); if (fb) { state.inquiryFilter = fb.dataset.f!; return renderInquiries(); }
      const item = t.closest<HTMLElement>('[data-id]'); if (!item) return;
      const i = state.inquiries.find((x) => x.id === item.dataset.id)!;
      try {
        if (t.closest('[data-toggle]')) { await updateDoc(doc(db, 'inquiries', i.id), { handled: !i.handled }); i.handled = !i.handled; toast(i.handled ? 'Als erledigt markiert' : 'Wieder offen'); }
        if (t.closest('[data-del]')) { if (!(await confirmDialog('Anfrage löschen?', 'Löschen', true))) return; await deleteDoc(doc(db, 'inquiries', i.id)); state.inquiries = state.inquiries.filter((x) => x.id !== i.id); toast('Anfrage gelöscht'); }
        updateBadges(); renderInquiries();
      } catch (err) { toast(`Fehler: ${(err as Error).message}`, 'error'); }
    };
  }

  /* ======================================================================
     Bestellungen
     ====================================================================== */
  function renderOrders() {
    const f = state.orderFilter;
    const list = state.orders.filter((o) => f === 'all' || (f === 'open' ? ['paid', 'production'].includes(o.status) : o.status === f));
    const total = state.orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.amountTotal || 0), 0);
    const matName = (id: string) => (state.prints ?? defaults.prints).materials.find((m: Row) => m.id === id)?.name?.de ?? id;
    view.innerHTML = `
      <div class="a-head"><div><h1>Bestellungen</h1><p>${state.orders.length} Bestellungen · Gesamtumsatz ${chf(total)}</p></div><a class="a-btn" href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener">Stripe öffnen ↗</a></div>
      <div class="a-help">So geht’s: Neue Bestellung → Print produzieren lassen → Status auf «In Produktion» → nach dem Versand «Versendet» setzen und dem Kunden kurz schreiben.</div>
      <div class="a-toolbar">${[['open', 'Offen'], ['shipped', 'Versendet'], ['cancelled', 'Storniert'], ['all', 'Alle']].map(([v, l]) => `<button class="chip ${f === v ? 'is-active' : ''}" data-f="${v}">${l}</button>`).join('')}</div>
      <div class="a-items">${list.map((o) => {
        const p = photoBySlug(o.photoSlug);
        const addr = o.shippingAddress ? [o.shippingAddress.line1, o.shippingAddress.line2, `${o.shippingAddress.postal_code ?? ''} ${o.shippingAddress.city ?? ''}`, o.shippingAddress.country].filter((v) => v && String(v).trim()).join(', ') : '–';
        return `<article class="a-item ${o.status === 'shipped' || o.status === 'cancelled' ? 'is-done' : ''}" data-id="${o.id}">
          <img src="${esc(p?.thumb ?? '')}" alt="" />
          <div><div class="a-item__title">${esc(p?.title?.de ?? o.photoSlug)} · ${esc(matName(o.material))} ${esc(String(o.size).replace('x', ' × '))} cm · ${o.quantity}×</div>
            <div class="a-item__sub">${fmtDate(o.createdAt, true)} · <b>${chf(o.amountTotal)}</b></div>
            <div class="a-item__sub">${esc(o.name)} · <a href="mailto:${esc(o.email)}">${esc(o.email)}</a><br>${esc(addr)}</div></div>
          <div class="a-item__actions"><select class="a-input" data-status style="width:auto;min-height:36px">${options(STATUS, o.status)}</select>
            <a class="a-btn a-btn--sm" href="mailto:${esc(o.email)}?subject=${encodeURIComponent('Deine Print-Bestellung bei Fabio Berta')}&body=${encodeURIComponent(`Hallo ${o.name ?? ''}\n\n`)}">Kunde mailen</a></div>
        </article>`;
      }).join('') || '<div class="a-empty"><b>Keine Bestellungen</b>Bestellungen aus dem Shop erscheinen hier automatisch.</div>'}</div>`;
    view.onclick = (e) => { const fb = (e.target as HTMLElement).closest<HTMLElement>('[data-f]'); if (fb) { state.orderFilter = fb.dataset.f!; renderOrders(); } };
    view.onchange = async (e) => {
      const sel = (e.target as HTMLElement).closest<HTMLSelectElement>('[data-status]'); if (!sel) return;
      const o = state.orders.find((x) => x.id === sel.closest<HTMLElement>('[data-id]')!.dataset.id)!;
      try { await updateDoc(doc(db, 'orders', o.id), { status: sel.value }); o.status = sel.value; toast('Status aktualisiert'); updateBadges(); renderOrders(); }
      catch (err) { toast(`Fehler: ${(err as Error).message}`, 'error'); }
    };
  }
}

/* Start (am Dateiende, damit alle Hilfsfunktionen initialisiert sind) */
const cfgEl = document.getElementById('fb-config');
if (cfgEl) boot(JSON.parse(cfgEl.textContent!), JSON.parse(document.getElementById('fb-defaults')!.textContent!));
