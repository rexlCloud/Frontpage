// Runs before every build: reads the newest rexlCloud release from the repository and unpacks the Javadoc of the
// four APIs into public/api/<artifact>/. Writes src/generated/cloud.json, which the pages read.
//
// FETCH_STRICT=1 (Docker build) fails when the repository cannot be reached; otherwise the last fetched data is kept
// so the site can be developed offline.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'https://repo.rexlcloud.de';
const DOWNLOADS = `${REPO}/downloads/de/rexlcloud`;
const SNAPSHOTS = `${REPO}/snapshots/de/rexlcloud`;
const OUT = join(ROOT, 'src/generated/cloud.json');
const STRICT = process.env.FETCH_STRICT === '1';

/** Downloadable jars, in the order the download page shows them. */
const JARS = ['launcher', 'restmodule', 'bridge', 'proxy'];
/** APIs with Javadoc. */
const APIS = ['module-api', 'bukkit-api', 'proxy-api', 'minestom-api'];

async function get(url, type = 'text') {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return type === 'bytes' ? new Uint8Array(await response.arrayBuffer()) : response.text();
}

async function release(base, artifact) {
  const xml = await get(`${base}/${artifact}/maven-metadata.xml`);
  const version = xml.match(/<release>([^<]+)<\/release>/)?.[1] ?? xml.match(/<latest>([^<]+)<\/latest>/)?.[1];
  const updated = xml.match(/<lastUpdated>(\d{14})<\/lastUpdated>/)?.[1];
  if (!version) {
    throw new Error(`No version in the metadata of ${artifact}`);
  }
  return { version, updated };
}

async function unpackJavadoc(artifact, version) {
  const jar = await get(`${SNAPSHOTS}/${artifact}/${version}/${artifact}-${version}-javadoc.jar`, 'bytes');
  const target = join(ROOT, 'public/api', artifact);
  await rm(target, { recursive: true, force: true });
  let files = 0;
  for (const [name, content] of Object.entries(unzipSync(jar))) {
    if (name.endsWith('/') || name.startsWith('META-INF/') || name.includes('..')) {
      continue;
    }
    const file = join(target, name);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
    files++;
  }
  return files;
}

async function main() {
  const { version, updated } = await release(DOWNLOADS, 'launcher');
  const jars = Object.fromEntries(JARS.map((jar) => [jar, `${DOWNLOADS}/${jar}/${version}/${jar}-${version}.jar`]));
  const apis = [];
  for (const artifact of APIS) {
    const api = await release(SNAPSHOTS, artifact);
    const files = await unpackJavadoc(artifact, api.version);
    apis.push({ artifact, version: api.version });
    console.log(`Javadoc of ${artifact} ${api.version}: ${files} files`);
  }
  const releasedAt = updated
    ? `${updated.slice(0, 4)}-${updated.slice(4, 6)}-${updated.slice(6, 8)}`
    : null;
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ version, releasedAt, repository: REPO, jars, apis }, null, 2) + '\n');
  console.log(`rexlCloud ${version}`);
}

try {
  await main();
} catch (error) {
  if (STRICT) {
    console.error(error);
    process.exit(1);
  }
  try {
    await readFile(OUT);
    console.warn(`Could not fetch the cloud release (${error.message}); using the last fetched data`);
  } catch {
    console.warn(`Could not fetch the cloud release (${error.message}); using placeholders`);
    await mkdir(dirname(OUT), { recursive: true });
    await writeFile(OUT, JSON.stringify({
      version: '2.0.0', releasedAt: null, repository: REPO,
      jars: Object.fromEntries(JARS.map((jar) => [jar, `${DOWNLOADS}/${jar}/`])), apis: [],
    }, null, 2) + '\n');
  }
}
