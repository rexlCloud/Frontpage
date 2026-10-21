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

const TAB = /(?:^|\s)tab="([^"]+)"/;

/**
 * Consecutive code blocks with a tab label (```java tab="Java") become one box with tabs, e.g. Java and Kotlin, or
 * Gradle and Maven. The tab bar is added by the script in CodeTabsScript.astro; without JavaScript the blocks stay
 * below each other.
 */
function groupTabs(node) {
  if (!Array.isArray(node.children)) {
    return;
  }
  const children = [];
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const label = child.type === 'code' ? child.meta?.match(TAB)?.[1] : undefined;
    if (!label) {
      groupTabs(child);
      children.push(child);
      continue;
    }
    const panels = [];
    while (i < node.children.length) {
      const next = node.children[i];
      const nextLabel = next.type === 'code' ? next.meta?.match(TAB)?.[1] : undefined;
      if (!nextLabel) {
        break;
      }
      panels.push({
        type: 'codeTab',
        data: { hName: 'div', hProperties: { className: ['code-tab'], dataTab: nextLabel } },
        children: [next],
      });
      i++;
    }
    i--;
    children.push({
      type: 'codeTabs',
      data: { hName: 'div', hProperties: { className: ['code-tabs'] } },
      children: panels,
    });
  }
  node.children = children;
}

export default function remarkSite() {
  return (tree, file) => {
    groupTabs(tree);
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
