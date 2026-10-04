// Builds each issues/*.json into a root-level HTML file from blocks/.
// Edits are literal find/replace pairs applied to a block; a pair that
// matches nothing fails the build so stale copy can't ship silently.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => readFileSync(path.join(root, ...p), 'utf8');
const layout = read('blocks', '_layout.html');

function replaceAll(src, from, to, where) {
  if (!src.includes(from)) throw new Error(`${where}: no match for "${from.slice(0, 60)}"`);
  return src.split(from).join(to);
}

for (const file of readdirSync(path.join(root, 'issues')).filter((f) => f.endsWith('.json')).sort()) {
  const issue = JSON.parse(read('issues', file));
  const body = issue.blocks.map((name) => {
    let html = read('blocks', `${name}.html`).trim();
    for (const [from, to] of issue.edits?.[name] ?? []) html = replaceAll(html, from, to, `${file} ${name}`);
    return html;
  }).join('\n');

  let out = layout;
  out = replaceAll(out, '{{TITLE}}', issue.title, file);
  out = replaceAll(out, '{{PREHEADER}}', issue.preheader, file);
  out = replaceAll(out, '{{BLOCKS}}', body, file);
  out = out.split('{{ISSUE}}').join(issue.issue ?? '');
  writeFileSync(path.join(root, issue.output), out.endsWith('\n') ? out : out + '\n');
  console.log(`${issue.output}  ${(Buffer.byteLength(out) / 1024).toFixed(1)} KB`);
}
