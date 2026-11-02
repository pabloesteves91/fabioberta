/**
 * Erzeugt supabase/seed.sql aus src/data/photos.json.
 * Damit startet die Datenbank mit den bestehenden Bildern (die weiterhin unter /photos/ auf der Website liegen).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const photos = JSON.parse(await readFile(path.join(root, 'src/data/photos.json'), 'utf8')).filter((p) => p.category !== '_site');
const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const rows = photos.map((p) =>
  `(${[p.slug, p.category, p.title.de, p.title.en, p.alt.de, p.alt.en, p.location, p.featured, p.forSale, true, p.sort, p.src, p.thumb, p.width, p.height, p.color].map(q).join(', ')})`,
);
const sql = `-- Automatisch erzeugt mit \`npm run seed:sql\`
insert into public.photos (slug, category, title_de, title_en, alt_de, alt_en, location, featured, for_sale, published, sort, src, thumb, width, height, color) values
${rows.join(',\n')}
on conflict (slug) do nothing;
`;
await writeFile(path.join(root, 'supabase/seed.sql'), sql);
console.log(`${rows.length} Fotos in supabase/seed.sql geschrieben.`);
