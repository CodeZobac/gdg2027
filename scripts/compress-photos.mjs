import sharp from "sharp";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const input = resolve(process.argv[2] ?? `${workspace}/gdgfarodevfest25`);
const output = resolve(process.argv[3] ?? `${workspace}/gdg-fotos-compressed`);
const selected = resolve(workspace, "gdg-fotos-selection");
const manifestPath = resolve(output, "manifest.json");
const settings = { maxEdge: 1920, quality: 82, format: "jpeg", metadata: false };
async function hashFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
async function exists(path) {
  try { await stat(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

await mkdir(output, { recursive: true });
let previous = { images: [] };
if (await exists(manifestPath)) previous = JSON.parse(await readFile(manifestPath, "utf8"));
const entries = (await readdir(input, { withFileTypes: true })).filter(entry => entry.isFile());
const images = entries.filter(entry => /\.jpe?g$/i.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name));
const manifest = { version: 1, settings, excludedFiles: entries.filter(entry => !/\.jpe?g$/i.test(entry.name)).map(entry => entry.name), images: [] };
let added = 0, reused = 0;
for (const { name } of images) {
  const source = resolve(input, name), destination = resolve(output, name);
  const sourceSha256 = await hashFile(source);
  if (await exists(destination)) {
    const known = previous.images.find(image => image.file === name);
    if (known) {
      if (known.sourceSha256 !== sourceSha256 || known.sha256 !== await hashFile(destination)) throw new Error(`Changed source/output: ${name}; refusing to overwrite`);
    } else if (!await exists(resolve(selected, name)) || await hashFile(resolve(selected, name)) !== sourceSha256) {
      throw new Error(`Unverified existing image: ${name}; refusing to overwrite`);
    }
    reused++;
  } else {
    const temporary = `${destination}.tmp`;
    await sharp(source).rotate().resize({ width: settings.maxEdge, height: settings.maxEdge, fit: "inside", withoutEnlargement: true }).jpeg({ quality: settings.quality, mozjpeg: true }).toFile(temporary);
    await rename(temporary, destination);
    added++;
  }
  const metadata = await sharp(destination).metadata();
  await sharp(destination).stats(); // Decode fully, rather than trusting only the header.
  if (metadata.format !== "jpeg" || metadata.width > settings.maxEdge || metadata.height > settings.maxEdge || metadata.exif || metadata.xmp || metadata.iptc) throw new Error(`Invalid compressed image: ${name}`);
  manifest.images.push({ file: name, sourceSha256, sha256: await hashFile(destination), sourceBytes: (await stat(source)).size, bytes: (await stat(destination)).size, width: metadata.width, height: metadata.height });
  await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2) + "\n");
  await rename(`${manifestPath}.tmp`, manifestPath);
  if (manifest.images.length % 20 === 0) console.log(`Verified ${manifest.images.length}/${images.length} images`);
}
console.log(JSON.stringify({ images: images.length, added, reused, excluded: manifest.excludedFiles, sourceBytes: manifest.images.reduce((sum, image) => sum + image.sourceBytes, 0), compressedBytes: manifest.images.reduce((sum, image) => sum + image.bytes, 0) }, null, 2));
