import { sample } from './sample.js';
import { health, requestPrediction } from './client.js';
const $ = id => document.getElementById(id);
const storageKey = 'orv-if-history-v1';
let history = [], current, controller, busy = false, toastTimer;
function validRecord(v) {
  return v && ['generated','sample'].includes(v.kind) && ['title','question','premise','baseline','ending','uncertainty'].every(k=>typeof v[k]==='string') &&
    Array.isArray(v.assumptions) && v.assumptions.every(v=>typeof v==='string') &&
    Array.isArray(v.changes) && v.changes.every(v=>v && ['title','cause','outcome'].every(k=>typeof v[k]==='string')) &&
    Array.isArray(v.references) && v.references.every(v=>v && ['id','title','fact'].every(k=>typeof v[k]==='string'));
}
try { const saved=JSON.parse(localStorage.getItem(storageKey)||'[]'); if(Array.isArray(saved)) history=saved.filter(validRecord).slice(0,10); } catch {}
function node(tag, text, className) {
  const el=document.createElement(tag); if(text!==undefined) el.textContent=text; if(className) el.className=className; return el;
}
function toast(text) { $('toast').textContent=text; $('toast').hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').hidden=true,3500); }
function setQuestion(text) { $('question').value=text; $('char-count').textContent=`${text.length} / 600`; }
function showError(text) { $('error').textContent=text; $('error').hidden=!text; }
function setBusy(value) {
  busy=value; $('loading').hidden=!value; $('submit').hidden=value; $('cancel').hidden=!value;
  $('question').readOnly=value; $('question-form').setAttribute('aria-busy',String(value));
  document.querySelectorAll('#example-list button, #sample, #result button, #history-list button').forEach(b=>b.disabled=value);
}
function saveHistory(result) {
  history=[result,...history.filter(v=>v.question!==result.question)].slice(0,10);
  try { localStorage.setItem(storageKey,JSON.stringify(history)); } catch { toast('브라우저 저장 공간에 기록을 남기지 못했습니다.'); }
  renderHistory();
}
function renderHistory() {
  $('history-count').textContent=String(history.length); $('history-list').replaceChildren();
  if(!history.length) $('history-list').append(node('p','아직 읽은 세계선이 없습니다. 첫 번째 가설을 적어 보세요.','muted'));
  for(const result of history) {
    const button=node('button',undefined,'history-entry'); button.type='button';
    button.append(node('strong',result.title),node('small',result.question));
    button.addEventListener('click',()=>{if(busy)return;setQuestion(result.question);showError('');render(result);$('result').scrollIntoView({behavior:'smooth',block:'start'});});
    $('history-list').append(button);
  }
}
function asText(r) {
  return `${r.kind==='sample'?'[작성된 예시 · 실시간 AI 예측 아님]':'[AI가 작성한 가상 전개 · 원작 결말 아님]'}\n${r.title}\n\n질문: ${r.question}\n\n기존 사건\n${r.baseline}\n\n추가 가정\n${r.assumptions.join('\n')}\n\n${r.changes.map((c,i)=>`${i+1}. ${c.title}\n${c.cause}\n${c.outcome}`).join('\n\n')}\n\nIF 결말\n${r.ending}\n\n불확실성\n${r.uncertainty}`;
}
async function copyResult() {
  const text=asText(current);
  try {
    if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const field=node('textarea'); field.value=text; document.body.append(field); field.select();
      const copied=document.execCommand('copy'); field.remove(); if(!copied) throw new Error();
    }
    toast('이 세계선의 이야기를 복사했습니다.');
  } catch { toast('복사하지 못했습니다. 본문을 선택해 복사해 주세요.'); }
}
function render(r) {
  if(!validRecord(r)) { showError('결과를 표시하지 못했습니다. 다시 시도해 주세요.');return; }
  current=r; const root=$('result');root.replaceChildren();root.hidden=false;
  const header=node('div',undefined,'result-header');
  header.append(node('p',r.kind==='sample'?'직접 작성한 예시 · 실시간 AI 예측이 아닙니다':'02 / AI가 쓴 하나의 가능성',`eyebrow ${r.kind==='sample'?'sample-badge':''}`),node('h2',r.title),node('p',r.premise));
  const body=node('div',undefined,'result-body');
  const baseline=node('div',undefined,'baseline');baseline.append(node('span','기존 사건 · 사이트 정리 자료 기준','mini-label'),node('p',r.baseline));
  const assumptions=node('div',undefined,'assumptions');r.assumptions.forEach(t=>assumptions.append(node('span',`추가 가정 · ${t}`)));
  const timeline=node('ol',undefined,'timeline');r.changes.forEach((c,i)=>{const li=node('li');li.append(node('span',String(i+1).padStart(2,'0'),'step'),node('h3',c.title),node('p',c.cause),node('p',c.outcome,'outcome'));timeline.append(li);});
  const ending=node('div',undefined,'ending');ending.append(node('span','IF ENDING / 이 가설의 결말','mini-label'),node('p',r.ending));
  const uncertainty=node('p',`다르게 흐를 수 있는 지점 — ${r.uncertainty}`,'uncertainty');
  const refs=node('details',undefined,'references');refs.append(node('summary','어떤 사건을 참고했나요? · 자료 범위와 한계'),node('p','프롤로그~마계의 봄의 사건 요약 26개를 사용합니다. 기존 조사와 웹툰 선택 장면 대조에 기반하며, 소설 원문 전체를 전수 검증한 자료는 아닙니다. 아래 번호는 사이트의 자료 ID이며 원작 회차가 아닙니다. 이후의 결말은 모두 창작 IF입니다.'));
  for(const ref of r.references) refs.append(node('h4',`${ref.id} · ${ref.title}`),node('p',ref.fact));
  const links=node('div',undefined,'reference-links');
  for(const [label,url] of [['공식 웹툰','https://comic.naver.com/webtoon/list?titleId=747269'],['작품 참고 문서','https://namu.wiki/w/%EC%A0%84%EC%A7%80%EC%A0%81%20%EB%8F%85%EC%9E%90%20%EC%8B%9C%EC%A0%90']]) {const a=node('a',label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
  refs.append(links);
  const actions=node('div',undefined,'result-actions');
  const copy=node('button','이야기 복사 ↗','text-button');copy.type='button';copy.addEventListener('click',copyResult);
  const retry=node('button','이 가설로 다시 쓰기 ↻','text-button');retry.type='button';retry.addEventListener('click',()=>{setQuestion(r.question);$('question-form').requestSubmit();});
  actions.append(copy,retry);body.append(baseline,assumptions,timeline,ending,uncertainty,refs,actions);root.append(header,body);
}
$('question').addEventListener('input',()=>$('char-count').textContent=`${$('question').value.length} / 600`);
document.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>{setQuestion(b.dataset.question);$('question').focus();}));
$('sample').addEventListener('click',()=>{setQuestion(sample.question);showError('');render(sample);$('result').scrollIntoView({behavior:'smooth',block:'start'});});
$('history-toggle').addEventListener('click',()=>{const open=$('history').hidden;$('history').hidden=!open;$('history-toggle').setAttribute('aria-expanded',String(open));if(open)$('history').scrollIntoView({behavior:'smooth'});});
$('clear-history').addEventListener('click',()=>{history=[];try{localStorage.removeItem(storageKey);}catch{}renderHistory();});
$('cancel').addEventListener('click',()=>controller?.abort());
$('question-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const question=$('question').value.trim();if(question.length<8||question.length>600){showError('바꾸고 싶은 사건을 8~600자로 적어 주세요.');return;}
  showError('');setBusy(true);controller=new AbortController();
  let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;controller.abort();},65000);
  try {
    const data=await requestPrediction(question,controller.signal);
    if(!validRecord(data) || data.kind!=='generated')throw new Error('AI 응답이 불완전합니다. 다시 시도해 주세요.');
    render(data);saveHistory(data);$('result').scrollIntoView({behavior:'smooth',block:'start'});
  } catch(error) {
    if(error.name==='AbortError')showError(timedOut?'예측 시간이 초과되었습니다. 다시 시도해 주세요.':'예측을 취소했습니다.');
    else showError(error instanceof TypeError?'서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.':error.message);
  } finally {clearTimeout(timeout);controller=null;setBusy(false);}
});
renderHistory();
health().then(data=>{
  $('connection').textContent=data.ready?'AI 서버 연결됨':data.preview?'미리보기 · AI 연결 대기':'AI 연결 대기 · 예시 열람 가능';$('connection').classList.toggle('ready',!!data.ready);
}).catch(()=>$('connection').textContent='서버 연결 확인 필요');
