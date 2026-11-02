/**
 * Optimiert Quellbilder zu WebP (1920 px + 960 px) und schreibt src/data/photos.json.
 * Verwendung: node scripts/optimize-images.mjs <ordner-mit-originalen>
 * Wird nur für die lokalen Platzhalterbilder benötigt. Neue Bilder kommen über /admin in Supabase.
 */
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const inputDir = process.argv[2];
if (!inputDir) {
  console.error('Bitte Ordner mit Originalbildern angeben.');
  process.exit(1);
}
const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(path.join(root, 'src/data/photos.source.json'), 'utf8'));
const outDir = path.join(root, 'public/photos');
await mkdir(outDir, { recursive: true });

const sizes = [
  { suffix: '1920', width: 1920, quality: 76 },
  { suffix: '960', width: 960, quality: 70 },
];

const result = [];
for (const item of manifest) {
  const file = path.join(inputDir, item.source);
  const img = sharp(file).rotate();
  const meta = await img.metadata();
  for (const s of sizes) {
    await sharp(file)
      .rotate()
      .resize({ width: s.width, height: s.width, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: s.quality, effort: 5 })
      .toFile(path.join(outDir, `${item.slug}-${s.suffix}.webp`));
  }
  const { dominant } = await sharp(file).stats();
  const hex = '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('');
  const { source, ...rest } = item;
  result.push({
    id: item.slug,
    ...rest,
    src: `/photos/${item.slug}-1920.webp`,
    thumb: `/photos/${item.slug}-960.webp`,
    width: meta.width,
    height: meta.height,
    color: hex,
  });
  process.stdout.write('.');
}
await writeFile(path.join(root, 'src/data/photos.json'), JSON.stringify(result, null, 1));
console.log(`\n${result.length} Bilder optimiert.`);
