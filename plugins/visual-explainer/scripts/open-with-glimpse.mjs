#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

function expandHome(path) {
  if (!path) return path;
  return path.startsWith('~/') ? `${process.env.HOME}${path.slice(1)}` : path;
}

function browserOpen(file) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', file] : [file];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

async function firstExisting(paths) {
  for (const candidate of paths) {
    if (!candidate) continue;
    const resolved = expandHome(candidate);
    try {
      await access(resolved);
      return resolved;
    } catch {}
  }
  return null;
}

async function resolveGlimpseModule() {
  try {
    return require.resolve('glimpseui/src/glimpse.mjs');
  } catch {}

  const envPath = process.env.GLIMPSE_MODULE || process.env.GLIMPSE_PATH;
  const packageRoot = resolve(here, '../../../..');
  return firstExisting([
    envPath,
    resolve(packageRoot, 'node_modules/glimpseui/src/glimpse.mjs'),
    '~/.pi/agent/git/github.com/hazat/glimpse/src/glimpse.mjs',
    '~/.bun/install/global/node_modules/glimpseui/src/glimpse.mjs',
    '~/.bun/install/cache/glimpseui@0.8.0@@@1/src/glimpse.mjs',
  ]);
}

const args = process.argv.slice(2);
if (args.includes('--check')) {
  process.exit((await resolveGlimpseModule()) ? 0 : 1);
}

const fileArg = args.find((arg) => !arg.startsWith('--'));
if (!fileArg) {
  console.error('Usage: open-with-glimpse.mjs [--check] <html-file>');
  process.exit(2);
}

const htmlFile = resolve(expandHome(fileArg));
const title = args.includes('--title') ? args[args.indexOf('--title') + 1] : `Visual Explainer — ${htmlFile.split('/').pop()}`;
const glimpseModule = await resolveGlimpseModule();

if (!glimpseModule) {
  browserOpen(htmlFile);
  process.exit(0);
}

try {
  const { open } = await import(pathToFileURL(glimpseModule).href);
  const html = await readFile(htmlFile, 'utf8');
  const win = open(html, {
    title,
    width: 1200,
    height: 850,
    openLinks: true,
  });
  win.on('closed', () => process.exit(0));
} catch (error) {
  console.error(`Glimpse failed, opening in browser instead: ${error.message}`);
  browserOpen(htmlFile);
  process.exit(0);
}
