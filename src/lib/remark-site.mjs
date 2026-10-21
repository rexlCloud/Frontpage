// Markdown of the guides:
// - {version} becomes the newest cloud version (in text, code and links)
// - links to pages of this site get the language prefix of the guide, e.g. /docs/x -> /de/docs/x
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cloudFile = fileURLToPath(new URL('../generated/cloud.json', import.meta.url));

function version() {
  try {
    return JSON.parse(readFileSync(cloudFile, 'utf8')).version;
  } catch {
    return '2.0.0';
  }
}

function visit(node, callback) {
  callback(node);
  for (const child of node.children ?? []) {
    visit(child, callback);
  }
}

export default function remarkSite() {
  return (tree, file) => {
    const current = version();
    const path = (file.path ?? file.history?.[0] ?? '').replaceAll('\\', '/');
    const german = path.includes('/content/docs/de/');
    visit(tree, (node) => {
      if (typeof node.value === 'string' && node.value.includes('{version}')) {
        node.value = node.value.replaceAll('{version}', current);
      }
      if (node.type === 'link' && typeof node.url === 'string') {
        node.url = node.url.replaceAll('{version}', current);
        // The Javadoc and downloads exist once, not per language
        if (german && node.url.startsWith('/') && !node.url.startsWith('/api/') && !node.url.startsWith('/de/')) {
          node.url = `/de${node.url}`;
        }
      }
    });
  };
}
