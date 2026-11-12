import {test} from 'node:test';
import assert from 'node:assert/strict';
import {predict,messagesFor,parseResult,selectEvents,validateQuestion} from '../server/service.mjs';
import {sample} from '../public/sample.js';

test('questions are validated before using AI quota', async()=>{
  let called=false;const ai={run(){called=true;}};
  for(const value of [null,'짧음','a'.repeat(601),{}])await assert.rejects(predict(value,ai),e=>e.status===400);
  assert.equal(called,false);assert.equal(validateQuestion('  김독자가 왕좌를 차지했다면?  '),'김독자가 왕좌를 차지했다면?');
});
test('reference retrieval covers all 26 events and prioritizes the actual turning point',()=>{
  const refs=selectEvents('유중혁이 73번째 마왕이 되었다면?');
  assert.equal(new Set(refs.map(v=>v.id)).size,26);
  assert.ok(refs.findIndex(v=>v.id==='C20')<refs.findIndex(v=>v.id==='C02'));
  const messages=messagesFor('유중혁이 마왕이 되었다면?');
  assert.equal(messages[1].content,'유중혁이 마왕이 되었다면?');
  assert.match(messages[0].content,/자동 이전되지 않는다/);
  assert.match(messages[0].content,/전수 검증은 아님/);
  assert.match(messages[0].content,/원작 결말로 표현하지 마라/);
});
test('unconnected AI fails honestly without canned predictions',async()=>{
  await assert.rejects(predict(sample.question,{}),e=>e.status===503&&e.code==='AI_NOT_CONNECTED');
});
test('server invokes actual binding with user premise and validates structured result',async()=>{
  let received;const ai={async run(model,input){received={model,input};return {response:JSON.stringify({...sample,references:['C20','FAKE','C20','C21']})};}};
  const result=await predict(sample.question,ai);
  assert.equal(result.kind,'generated');assert.equal(result.question,sample.question);
  assert.deepEqual(result.references.map(v=>v.id),['C20','C21']);
  assert.match(received.model,/llama-3.3/);
  assert.equal(received.input.messages[1].content,sample.question);
  assert.equal(received.input.response_format.type,'json_object');
});
test('malformed or truncated AI output and unrecognized citations are rejected',()=>{
  for(const response of ['not json','{"title":"incomplete"}',JSON.stringify({...sample,changes:[]}),JSON.stringify({...sample,references:['C999']})])assert.throws(()=>parseResult({response}),e=>e.status===502);
});
test('provider errors are sanitized and never expose response bodies',async()=>{
  await assert.rejects(predict(sample.question,{run(){throw new Error('sensitive upstream details');}}),e=>e.code==='AI_UNAVAILABLE'&&!e.message.includes('sensitive'));
});
