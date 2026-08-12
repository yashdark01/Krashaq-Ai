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

function fixDynamicRoute(content) {
  let updated = content.replace(
    /\{ params \}: \{ params: \{ ([^}]+) \} \}/g,
    '{ params }: { params: Promise<{ $1 }> }'
  );

  updated = updated.replace(
    /(export async function \w+\([\s\S]*?\) \{\n)(?!\s*const \{)/g,
    (match, prefix) => {
      if (!prefix.includes('Promise<{')) return match;
      const keys = [...prefix.matchAll(/(\w+): string/g)].map((m) => m[1]);
      if (!keys.length) return match;
      const destructure = keys.map((k) => `${k}`).join(', ');
      return `${prefix}  const { ${destructure} } = await params;\n`;
    }
  );

  return updated;
}

for (const file of walk('app/api')) {
  if (!file.includes('[')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const updated = fixDynamicRoute(content);
  if (updated !== content) {
    fs.writeFileSync(file, updated);
    console.log('fixed', file);
  }
}
