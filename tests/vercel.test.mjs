import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {handleApi,nodeHandler} from '../server/vercel.mjs';
import {openaiBinding} from '../server/openai.mjs';
import {sample} from '../public/sample.js';
const req=(body,extra={})=>new Request('https://orv.example/api/predict',{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
const mockOutput={...sample,references:['C20','C21','C26']};
const upstream=()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(mockOutput)}]}]});
test('Vercel health distinguishes missing server credentials',async()=>{
 const url='https://orv.example/api/health';
 assert.equal((await (await handleApi(new Request(url),{})).json()).ready,false);
 assert.equal((await (await handleApi(new Request(url),{OPENAI_API_KEY:'test-key'})).json()).ready,true);
 assert.equal((await handleApi(req({question:sample.question}),{})).status,503);
});
test('OpenAI Responses request uses server-only authorization and grounded messages',async()=>{
 let outgoing;
 const response=await handleApi(req({question:sample.question},{'x-vercel-forwarded-for':'test-success'}),{OPENAI_API_KEY:'test-key'},async(url,options)=>{outgoing={url,options};return upstream();});
 assert.equal(response.status,200);const result=await response.json();
 assert.equal(result.kind,'generated');assert.equal(result.model,'gpt-4.1-mini');assert.equal(result.references.length,3);
 assert.equal(outgoing.url,'https://api.openai.com/v1/responses');
 assert.equal(outgoing.options.headers.Authorization,'Bearer test-key');
 const body=JSON.parse(outgoing.options.body);assert.equal(body.store,false);assert.equal(body.input[1].content,sample.question);
 assert.equal(body.text.format.type,'json_object');assert.ok(!JSON.stringify(result).includes('test-key'));
});
test('upstream authentication, quota and incomplete results produce honest errors',async()=>{
 for(const [status,expected] of [[401,503],[429,429],[500,502]]){
  const binding=openaiBinding({OPENAI_API_KEY:'test-key'},async()=>new Response('private upstream diagnostic',{status}));
  await assert.rejects(binding.run('model',{messages:[]}),e=>e.status===expected&&!e.message.includes('private'));
 }
 const binding=openaiBinding({OPENAI_API_KEY:'test-key'},async()=>Response.json({status:'incomplete',output:[]}));
 await assert.rejects(binding.run('model',{messages:[]}),e=>e.code==='INCOMPLETE_AI_RESPONSE');
});
test('Vercel rejects invalid and foreign-origin requests before calling AI',async()=>{
 let calls=0;const call=async()=>{calls++;return upstream();};const env={OPENAI_API_KEY:'test-key'};
 assert.equal((await handleApi(req({question:'짧음'}),env,call)).status,400);
 assert.equal((await handleApi(req(null),env,call)).status,400);
 assert.equal((await handleApi(req({question:sample.question},{Origin:'https://foreign.example'}),env,call)).status,403);
 assert.equal(calls,0);
});
test('per-instance request limit prevents excess upstream calls',async()=>{
 let calls=0;const call=async()=>{calls++;return upstream();};const env={OPENAI_API_KEY:'test-key'};
 for(let i=0;i<6;i++){
  const response=await handleApi(req({question:sample.question},{'x-vercel-forwarded-for':'test-limit'}),env,call);
  assert.equal(response.status,i<5?200:429);
 }
 assert.equal(calls,5);
});
test('Vercel Node handler works with a real HTTP stream',async()=>{
 const server=createServer(nodeHandler);server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const url=`http://127.0.0.1:${server.address().port}`;
  const health=await fetch(url+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).hosting,'Vercel');
  const response=await fetch(url+'/api/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'짧음'})});assert.equal(response.status,400);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
