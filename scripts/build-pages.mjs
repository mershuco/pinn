import { mkdir, cp, writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('build-pages/',root),{recursive:true});
await cp(new URL('public/',root),new URL('build-pages/',root),{recursive:true});
await writeFile(new URL('build-pages/config.js',root),"export const config = { mode: 'preview' };\n");
console.log('GitHub Pages preview ready. AI is explicitly marked unconnected.');
