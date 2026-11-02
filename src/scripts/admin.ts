import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

type Row = Record<string, any>;
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const slugify = (s: string) =>
  s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const CATS: [string, string][] = [['street', 'Street'], ['landscape', 'Landschaft'], ['travel', 'Reisen'], ['event', 'Events & Sport'], ['portrait', 'Portrait']];

if (url && anon) boot(createClient(url, anon));

async function boot(sb: SupabaseClient) {
  const login = $<HTMLFormElement>('#login');
  const app = $('#app');
  const logout = $('#logout');

  const show = async () => {
    const { data } = await sb.auth.getSession();
    if (!data.session) { login.classList.remove('hidden'); app.classList.add('hidden'); logout.classList.add('hidden'); return; }
    const { data: isAdmin } = await sb.rpc('is_admin');
    if (!isAdmin) { $('#l-status').textContent = 'Dieses Konto hat keine Admin-Rechte (Tabelle «admins» prüfen).'; await sb.auth.signOut(); login.classList.remove('hidden'); return; }
    login.classList.add('hidden'); app.classList.remove('hidden'); logout.classList.remove('hidden');
    loadPhotos(); loadInquiries(); loadOrders();
  };

  login.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: $<HTMLInputElement>('#l-email').value, password: $<HTMLInputElement>('#l-pass').value });
    $('#l-status').textContent = error ? `Anmeldung fehlgeschlagen: ${error.message}` : '';
    if (!error) show();
  });
  logout.addEventListener('click', async () => { await sb.auth.signOut(); show(); });

  // Tabs
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('is-active', x === b));
      document.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== b.dataset.tab));
    }),
  );

  /* ---------- Fotos ---------- */
  let photos: Row[] = [];
  async function loadPhotos() {
    const { data, error } = await sb.from('photos').select('*').order('sort');
    if (error) { $('#plist').innerHTML = `<p class="form__status is-error">${esc(error.message)}</p>`; return; }
    photos = data ?? [];
    $('#c-photos').textContent = String(photos.length);
    renderPhotos();
  }
  function renderPhotos() {
    $('#plist').innerHTML = photos.map((p, i) => `
      <article class="card pitem" data-id="${p.id}">
        <img src="${esc(p.thumb || p.src)}" alt="" loading="lazy" />
        <div>
          <div class="grid">
            <div class="field"><label>Titel DE</label><input name="title_de" value="${esc(p.title_de)}" /></div>
            <div class="field"><label>Titel EN</label><input name="title_en" value="${esc(p.title_en)}" /></div>
            <div class="field"><label>Alt-Text DE (SEO)</label><input name="alt_de" value="${esc(p.alt_de)}" /></div>
            <div class="field"><label>Alt-Text EN</label><input name="alt_en" value="${esc(p.alt_en)}" /></div>
            <div class="field"><label>Serie</label><select name="category">${CATS.map(([v, l]) => `<option value="${v}" ${p.category === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="field"><label>Ort</label><input name="location" value="${esc(p.location)}" /></div>
          </div>
          <div class="row">
            <label class="cb"><input type="checkbox" name="published" ${p.published ? 'checked' : ''}/> Sichtbar</label>
            <label class="cb"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}/> Startseite</label>
            <label class="cb"><input type="checkbox" name="for_sale" ${p.for_sale ? 'checked' : ''}/> Print-Shop</label>
            <span class="badge">/${esc(p.slug)} · ${p.width}×${p.height}</span>
          </div>
          <div class="row">
            <button class="small-btn primary" data-act="save">Speichern</button>
            <button class="small-btn" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Nach oben">↑</button>
            <button class="small-btn" data-act="down" ${i === photos.length - 1 ? 'disabled' : ''} aria-label="Nach unten">↓</button>
            <button class="small-btn danger" data-act="delete">Löschen</button>
            <span class="badge" data-status></span>
          </div>
        </div>
      </article>`).join('');
  }
  $('#plist').addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    if (!btn) return;
    const card = btn.closest<HTMLElement>('[data-id]')!;
    const id = card.dataset.id!;
    const idx = photos.findIndex((p) => p.id === id);
    const status = card.querySelector('[data-status]')!;
    const act = btn.dataset.act;
    if (act === 'save') {
      const val = (n: string) => (card.querySelector<HTMLInputElement>(`[name=${n}]`)!);
      const patch = {
        title_de: val('title_de').value, title_en: val('title_en').value || null, alt_de: val('alt_de').value, alt_en: val('alt_en').value || null,
        category: (card.querySelector<HTMLSelectElement>('[name=category]')!).value, location: val('location').value || null,
        published: val('published').checked, featured: val('featured').checked, for_sale: val('for_sale').checked,
      };
      const { error } = await sb.from('photos').update(patch).eq('id', id);
      status.textContent = error ? `Fehler: ${error.message}` : 'Gespeichert ✓ (live in max. 5 Min.)';
      if (!error) Object.assign(photos[idx], patch);
    }
    if (act === 'up' || act === 'down') {
      const j = act === 'up' ? idx - 1 : idx + 1;
      [photos[idx], photos[j]] = [photos[j], photos[idx]];
      await Promise.all([photos[idx], photos[j]].map((p) => sb.from('photos').update({ sort: photos.indexOf(p) }).eq('id', p.id)));
      photos.forEach((p, n) => (p.sort = n));
      renderPhotos();
    }
    if (act === 'delete') {
      if (!confirm('Dieses Bild wirklich löschen?')) return;
      const p = photos[idx];
      if (p.storage_path) await sb.storage.from('photos').remove([`${p.storage_path}-1920.webp`, `${p.storage_path}-960.webp`]);
      const { error } = await sb.from('photos').delete().eq('id', id);
      if (error) { status.textContent = `Fehler: ${error.message}`; return; }
      photos.splice(idx, 1);
      renderPhotos();
    }
  });

  /* ---------- Upload ---------- */
  const drop = $('#drop');
  const input = $<HTMLInputElement>('#files');
  const progress = $('#u-progress');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', (e) => upload(Array.from((e as DragEvent).dataTransfer?.files ?? [])));
  input.addEventListener('change', () => { upload(Array.from(input.files ?? [])); input.value = ''; });

  async function resize(bitmap: ImageBitmap, max: number, quality: number) {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('WebP-Konvertierung fehlgeschlagen'))), 'image/webp', quality));
    return { blob, w, h };
  }
  function dominant(bitmap: ImageBitmap) {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const ctx = c.getContext('2d')!; ctx.drawImage(bitmap, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  async function upload(files: File[]) {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    const category = $<HTMLSelectElement>('#u-cat').value;
    const location = $<HTMLInputElement>('#u-loc').value.trim() || null;
    const forSale = $<HTMLInputElement>('#u-sale').checked;
    const log: string[] = [];
    const write = () => (progress.textContent = log.join('\n'));
    let sort = photos.length ? Math.max(...photos.map((p) => p.sort)) + 1 : 0;
    for (const file of images) {
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      log.push(`⏳ ${file.name}`); write();
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
        const big = await resize(bitmap, 1920, 0.82);
        const small = await resize(bitmap, 960, 0.76);
        const slug = `${slugify(title) || 'foto'}-${Math.random().toString(36).slice(2, 6)}`;
        const base = `${new Date().getFullYear()}/${slug}`;
        for (const [suffix, f] of [['1920', big], ['960', small]] as const) {
          const { error } = await sb.storage.from('photos').upload(`${base}-${suffix}.webp`, f.blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
          if (error) throw error;
        }
        const pub = (s: string) => sb.storage.from('photos').getPublicUrl(`${base}-${s}.webp`).data.publicUrl;
        const { error } = await sb.from('photos').insert({
          slug, category, title_de: title, title_en: title, alt_de: title, alt_en: title, location,
          for_sale: forSale, featured: false, published: true, sort: sort++,
          src: pub('1920'), thumb: pub('960'), storage_path: base, width: big.w, height: big.h, color: dominant(bitmap),
        });
        if (error) throw error;
        log[log.length - 1] = `✓ ${file.name}`;
      } catch (err) {
        log[log.length - 1] = `✗ ${file.name}: ${(err as Error).message}`;
      }
      write();
    }
    log.push('Fertig. Bitte Titel & Alt-Texte ergänzen – sie sind wichtig für Google.');
    write();
    loadPhotos();
  }

  /* ---------- Anfragen & Bestellungen ---------- */
  async function loadInquiries() {
    const { data } = await sb.from('inquiries').select('*').order('created_at', { ascending: false }).limit(200);
    const rows = data ?? [];
    $('#c-inq').textContent = String(rows.filter((r) => !r.handled).length || '');
    $('#inq').innerHTML = rows.map((r) => `
      <tr style="${r.handled ? 'opacity:.5' : ''}">
        <td>${new Date(r.created_at).toLocaleString('de-CH')}</td><td>${esc(r.type)}${r.event_date ? `<br><span class="badge">${esc(r.event_date)}</span>` : ''}</td>
        <td>${esc(r.name)}<br><a href="mailto:${esc(r.email)}">${esc(r.email)}</a>${r.phone ? `<br>${esc(r.phone)}` : ''}</td>
        <td class="msg">${esc(r.message)}</td>
        <td><button class="small-btn" data-handle="${r.id}" data-val="${!r.handled}">${r.handled ? 'Offen' : 'Erledigt'}</button></td>
      </tr>`).join('') || '<tr><td colspan="5" class="muted">Noch keine Anfragen.</td></tr>';
  }
  $('#inq').addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-handle]');
    if (!b) return;
    await sb.from('inquiries').update({ handled: b.dataset.val === 'true' }).eq('id', b.dataset.handle);
    loadInquiries();
  });
  async function loadOrders() {
    const { data } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
    const rows = data ?? [];
    $('#c-orders').textContent = String(rows.length || '');
    $('#orders').innerHTML = rows.map((o) => `
      <tr><td>${new Date(o.created_at).toLocaleString('de-CH')}</td><td>${esc(o.photo_slug)}</td><td>${esc(o.material)} · ${esc(o.size)} · ${o.quantity}×</td>
      <td>CHF ${esc(o.amount_total)}</td><td>${esc(o.name)}<br><a href="mailto:${esc(o.email)}">${esc(o.email)}</a></td>
      <td>${esc(o.shipping_address ? Object.values(o.shipping_address).filter(Boolean).join(', ') : '–')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Noch keine Bestellungen.</td></tr>';
  }

  sb.auth.onAuthStateChange(() => {});
  show();
}
