import { access, readFile } from 'node:fs/promises';
for(const file of ['public/index.html','api/health.mjs','api/predict.mjs','server/knowledge.mjs']) await access(new URL('../'+file,import.meta.url));
if((await readFile(new URL('../public/config.js',import.meta.url),'utf8')).includes("mode: 'preview'"))throw new Error('Vercel must use server configuration.');
console.log('Vercel static site + Node API functions ready. AI key is read only on the server at runtime.');
