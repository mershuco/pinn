import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../scripts/build.mjs';
const {default:worker}=await import('../build/worker.mjs');
const request=(data,headers={})=>new Request('https://if.example/api/predict',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:typeof data==='string'?data:JSON.stringify(data)});

test('isolated static app has correct MIME types and same-origin CSP',async()=>{
  const response=await worker.fetch(new Request('https://if.example/'),{});
  assert.equal(response.status,200);assert.match(await response.text(),/독자의 가설/);
  assert.match(response.headers.get('content-security-policy'),/connect-src 'self'/);
  const js=await worker.fetch(new Request('https://if.example/app.js'),{});assert.match(js.headers.get('content-type'),/javascript/);
  assert.equal((await worker.fetch(new Request('https://if.example/missing'),{})).status,404);
});
test('health does not pretend AI is connected',async()=>{
  assert.equal((await (await worker.fetch(new Request('https://if.example/api/health'),{})).json()).ready,false);
});
test('API rejects invalid bodies and cross-origin requests without invoking AI',async()=>{
  assert.equal((await worker.fetch(request('{'),{})).status,400);
  assert.equal((await worker.fetch(request('null'),{})).status,400);
  assert.equal((await worker.fetch(request('[]'),{})).status,400);
  assert.equal((await worker.fetch(request({question:'무엇이 달라질까?'},{Origin:'https://attacker.example'}),{})).status,403);
  assert.equal((await worker.fetch(request('a'.repeat(5100)),{})).status,413);
  assert.equal((await worker.fetch(request({question:'김독자가 왕좌를 차지했다면?'}),{})).status,503);
});
test('Cloudflare native limiter prevents model invocation',async()=>{
  let invoked=false;
  const response=await worker.fetch(request({question:'김독자가 왕좌를 차지했다면?'}),{AI:{run(){invoked=true;}},AI_RATE_LIMITER:{async limit(){return {success:false};}}});
  assert.equal(response.status,429);assert.equal(invoked,false);
});
