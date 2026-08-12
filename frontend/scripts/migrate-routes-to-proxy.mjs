#!/usr/bin/env node
/**
 * Converts API route files that proxy via apiClient into legacy-python proxies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const NATIVE_ROUTES = new Set([
  'app/api/chat/route.ts',
  'app/api/weather/route.ts',
  'app/api/auth/login/email/route.ts',
  'app/api/auth/signup/route.ts',
  'app/api/auth/register/route.ts',
  'app/api/auth/me/route.ts',
  'app/api/auth/refresh/route.ts',
  'app/api/auth/logout/route.ts',
  'app/api/farmers/route.ts',
  'app/api/farmers/[farmerId]/route.ts',
  'app/api/farmers/phone/[phone]/route.ts',
]);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name === 'route.ts') acc.push(full);
  }
  return acc;
}

function fileToApiPath(rel) {
  return rel.replace(/^app/, '').replace(/\/route\.ts$/, '');
}

function convertFile(absPath) {
  const rel = path.relative(root, absPath).replace(/\\/g, '/');
  if (NATIVE_ROUTES.has(rel)) return false;

  const content = fs.readFileSync(absPath, 'utf8');
  if (!content.includes("from '@/lib/api/client'")) return false;

  const apiPath = fileToApiPath(rel);
  const handlers = [];

  const methodRegex =
    /export async function (GET|POST|PUT|DELETE|PATCH)\s*\(\s*([^)]*)\)\s*\{[\s\S]*?api\.(get|post|put|delete|patch)<[^>]*>\(\s*`([^`]+)`/g;

  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const [, method, args, , templatePath] = match;
    handlers.push({ method, args: args.trim(), templatePath });
  }

  if (handlers.length === 0) {
    // Fallback: static path from file location
    handlers.push({ method: 'GET', args: 'request: NextRequest', templatePath: apiPath });
  }

  const hasParams = handlers.some((h) => h.args.includes('params'));
  const paramsType = content.match(/params:\s*(Promise<[^>]+>|\{[^}]+\})/)?.[1] ?? null;

  let out = `import { NextRequest } from 'next/server';\nimport { proxyToLegacyPython } from '@/lib/server/proxy/legacy-python';\n\n`;

  for (const h of handlers) {
    const method = h.method;
    if (hasParams && h.args.includes('params')) {
      const paramsDecl = paramsType?.startsWith('Promise')
        ? `{ params }: { params: ${paramsType} }`
        : `{ params }: { params: ${paramsType ?? '{ id: string }'} }`;

      let pathExpr = h.templatePath;
      // params.userId -> userId after await
      pathExpr = pathExpr.replace(/\$\{params\.(\w+)\}/g, '${$1}');

      out += `export async function ${method}(\n  request: NextRequest,\n  ${paramsDecl}\n) {\n`;
      if (paramsType?.startsWith('Promise')) {
        out += `  const resolved = await params;\n`;
        const keys = [...pathExpr.matchAll(/\$\{(\w+)\}/g)].map((m) => m[1]);
        for (const key of keys) {
          if (key !== 'params') {
            out += `  const ${key} = resolved.${key};\n`;
          }
        }
      } else {
        const keys = [...pathExpr.matchAll(/\$\{params\.(\w+)\}/g)].map((m) => m[1]);
        for (const key of keys) {
          out += `  const ${key} = params.${key};\n`;
        }
        pathExpr = pathExpr.replace(/\$\{params\./g, '${');
      }
      out += `  return proxyToLegacyPython(request, \`${pathExpr}\`);\n}\n\n`;
    } else {
      out += `export async function ${method}(request: NextRequest) {\n`;
      out += `  return proxyToLegacyPython(request, '${h.templatePath.startsWith('/') ? h.templatePath : apiPath}');\n}\n\n`;
    }
  }

  fs.writeFileSync(absPath, out.trim() + '\n');
  return true;
}

const files = walk(path.join(root, 'app/api'));
let count = 0;
for (const file of files) {
  if (convertFile(file)) {
    count++;
    console.log('Converted', path.relative(root, file));
  }
}
console.log(`Done. Converted ${count} route files.`);
