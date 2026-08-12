import fs from 'node:fs';
import path from 'node:path';

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name === 'route.ts') acc.push(full);
  }
  return acc;
}

for (const file of walk('app/api')) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('proxyToLegacyPython')) continue;

  const paramsMatch = content.match(/params:\s*(Promise<[^>]+>|\{[^}]+\})/);
  if (!paramsMatch) continue;

  const isPromise = paramsMatch[1].startsWith('Promise');
  const keys = [...content.matchAll(/`\$\{(\w+)\}/g)].map((m) => m[1]);
  const unique = [...new Set(keys)];
  if (!unique.length) continue;

  const fnMatch = content.match(/export async function \w+\([\s\S]*?\) \{\n/);
  if (!fnMatch || fnMatch.index === undefined) continue;

  const start = fnMatch.index + fnMatch[0].length;
  const block = content.slice(start, start + 200);
  if (unique.some((k) => block.includes(`const ${k}`))) continue;

  let insert = '';
  if (isPromise) {
    insert =
      '  const resolved = await params;\n' +
      unique.map((k) => `  const ${k} = resolved.${k};`).join('\n') +
      '\n';
  } else {
    insert = unique.map((k) => `  const ${k} = params.${k};`).join('\n') + '\n';
  }

  content = content.slice(0, start) + insert + content.slice(start);
  fs.writeFileSync(file, content);
  console.log('fixed', file);
}
