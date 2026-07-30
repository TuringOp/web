import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requiredPaths = [
  'public',
  'public/index.html',
  'public/turing.html',
  'public/robots.txt',
  'public/sitemap.xml',
  'worker.js',
  'wrangler.toml'
];

let hasError = false;

for (const relativePath of requiredPaths) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required path for Cloudflare deploy: ${relativePath}`);
    hasError = true;
    continue;
  }

  if (relativePath === 'public' && !statSync(absolutePath).isDirectory()) {
    console.error('Expected `public` to be a directory.');
    hasError = true;
  }
}

if (hasError) {
  console.error('\nCloudflare deployment preflight failed.');
  console.error('Make sure the `public/` directory and its files are committed and pushed.');
  process.exit(1);
}

console.log('Cloudflare deployment preflight passed.');

