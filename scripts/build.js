import { mkdir, cp, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
// Explicit allowlist: only public assets enter the deployment's static directory.
await mkdir('dist', {recursive:true});
for (const file of await readdir('public')) await cp(resolve('public',file),resolve('dist',file),{recursive:true});
console.log('Built public website and admin UI in dist/. Vercel deploys api/ separately.');
