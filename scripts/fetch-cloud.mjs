// Runs before every build: reads the newest rexlCloud release from GitHub (version, date, jar links) and unpacks the
// Javadoc of the four APIs from Reposilite (repo.rexlcloud.de/releases) into public/api/<artifact>/. Writes
// src/generated/cloud.json, which the pages read.
//
// FETCH_STRICT=1 (Docker build) fails when GitHub or Reposilite cannot be reached; otherwise the last fetched data is
// kept so the site can be developed offline.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'https://repo.rexlcloud.de';
const MAVEN = `${REPO}/releases/de/rexlcloud`;
const GITHUB = 'https://github.com/rexlCloud/rexlCloud';
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

async function apiVersion(artifact) {
  const xml = await get(`${MAVEN}/${artifact}/maven-metadata.xml`);
  const version = xml.match(/<release>([^<]+)<\/release>/)?.[1] ?? xml.match(/<latest>([^<]+)<\/latest>/)?.[1];
  if (!version) {
    throw new Error(`No version in the metadata of ${artifact}`);
  }
  return version;
}

/** GitHub answers releases/latest with a redirect to releases/tag/v<version>; no API quota needed. */
async function latestRelease() {
  const response = await fetch(`${GITHUB}/releases/latest`, { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  const location = response.headers.get('location') ?? '';
  const tag = location.split('/').pop();
  if (!location.includes('/tag/') || !tag) {
    throw new Error(`No release at ${GITHUB}/releases (HTTP ${response.status})`);
  }
  return tag.replace(/^v/, '');
}

/** The release date from the GitHub API; optional, it is only shown next to the version. */
async function releaseDate(version) {
  try {
    const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
    const response = await fetch(`https://api.github.com/repos/rexlCloud/rexlCloud/releases/tags/v${version}`,
      { headers, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      return null;
    }
    return (await response.json()).published_at?.slice(0, 10) ?? null;
  } catch {
    return null;
  }
}

async function unpackJavadoc(artifact, version) {
  const jar = await get(`${MAVEN}/${artifact}/${version}/${artifact}-${version}-javadoc.jar`, 'bytes');
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
  const version = await latestRelease();
  const jars = Object.fromEntries(JARS.map((jar) => [jar, `${GITHUB}/releases/download/v${version}/${jar}-${version}.jar`]));
  const apis = [];
  for (const artifact of APIS) {
    const apiRelease = await apiVersion(artifact);
    const files = await unpackJavadoc(artifact, apiRelease);
    apis.push({ artifact, version: apiRelease });
    console.log(`Javadoc of ${artifact} ${apiRelease}: ${files} files`);
  }
  const releasedAt = await releaseDate(version);
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({
    version, releasedAt, repository: `${REPO}/#/releases`, releases: `${GITHUB}/releases`, jars, apis,
  }, null, 2) + '\n');
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
      version: '1.0.0', releasedAt: null, repository: `${REPO}/#/releases`, releases: `${GITHUB}/releases`,
      jars: Object.fromEntries(JARS.map((jar) => [jar, `${GITHUB}/releases/latest`])), apis: [],
    }, null, 2) + '\n');
  }
}
