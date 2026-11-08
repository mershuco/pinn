import {StorySession, SAVE_KEY} from './runtime/engine.js';
import {StoryDirector} from '../animation/director.js';
import {readMotionPreference, MOTION_SAVE_KEY} from '../animation/player.js';
import {makeSprite} from '../animation/sprites.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => {const n = document.createElement(tag); if(cls)n.className=cls; if(text!=null)n.textContent=text; return n;};
const speakerIds = {'김독자':'dokja','유중혁':'junghyeok','유상아':'sangah','이현성':'hyunsung','이길영':'gilyoung','정희원':'heewon','이지혜':'jihye','공필두':'pildu','한수영':'sooyoung','신유승':'yoosung','신유승 · 41회차':'yoosung-disaster','이수경':'sookyung','비형':'bihyung','비유':'biyoo','바울':'baul','천인호':'inho','안나 크로프트':'anna','리카온':'lycaon','명일상':'myungilsang','니르바나':'nirvana','라인하이트':'reinhardt','척준경':'jun-gyeong','페르세포네':'persephone','키리오스':'kyrgios','혹부리':'humpback','아일렌':'aileen','장하영':'hayoung','마르크':'mark','한명오':'myungoh','아스모데우스':'asmodeus','파천검성':'sword-saint','양산형 제작자':'maker','이리스':'iris','수르야':'surya','민지원':'jiwon','윤성호':'yoon','공민':'citizen'};
const milestones = {'party_survived':'객차의 일행 생존','sponsor_refused':'배후 선택 유보','stream_contract':'비형과 스트림 계약','heewon_rescued':'정희원 구조','heewon_judgment':'멸악의 심판자 각성','pildu_allied':'공필두와 공동 방어','yoo_freed':'극장의 지배 해제','throne_destroyed':'절대 왕좌 파괴','seolhwa_rescued':'이설화 구조','young_yoosung_protected':'현재 신유승 보호','future_yoosung_dead':'41회차 신유승의 죽음','soul_in_egg':'영혼을 도깨비 알에 보존','peace_land_protected':'피스랜드 보호','steel_awakened':'강철화 각성','chimera_tamed':'키메라 드래곤 길들이기','mother_rescued':'이수경 생환','party_clear':'암흑성 일행 클리어','dokja_personal_failure':'김독자의 개인 실패·추방','biyoo_born':'비유 탄생','factory_destroyed':'공장 파괴','other_district_revolution':'서로의 이름으로 이루어진 혁명','revised_text':'멸살법 수정본 발견','master_rescue_prepared':'스승 구원의 준비','biyoo_rescued_by_yoo':'유중혁의 비유 구출','citizens_evacuated':'공민 해방','role_deception':'2차전 포지션 전환','earth_reinforcements':'지구 원군 합류','crest_captured':'적 문장 확보','yoo_refused_regression':'유중혁의 회귀 거부','uriel_descended':'우리엘 현현','korea_defense':'한반도 방어','surya_avatar_defeated':'수르야 화신체 격파','selection_settled':'마왕 선발전 최종 정산','demon_world_spring':'거대 설화 마계의 봄','temporary_nebula_announced':'김독자 컴퍼니 임시 공표'};

async function start() {
  const [campaign, catalog, manifest, animation] = await Promise.all(['story/campaign.json','assets/catalog.json','assets/manifest.json','animation/manifest.json'].map(async p=>{const r=await fetch(p);if(!r.ok)throw Error(p);return r.json();}));
  const entities = new Map([...catalog.existing,...catalog.entities].map(e=>[e.id,e]));
  const atlases = {...manifest.atlases};catalog.batches.forEach(b=>atlases[b.id]=b);
  const motionPreference=readMotionPreference(),director=new StoryDirector($('stage'),{manifest:animation,entities,atlases,...motionPreference});
  const motionReplay=el('button','scene-motion-replay','연출 다시 보기');motionReplay.hidden=true;motionReplay.onclick=()=>director.playCurrent();$('stage').append(motionReplay);
  $('motion-enabled').checked=motionPreference.enabled;
  $('motion-enabled').onchange=()=>{director.setEnabled($('motion-enabled').checked);motionReplay.hidden=!director.current||!director.player.enabled;try{localStorage.setItem(MOTION_SAVE_KEY,JSON.stringify({enabled:director.player.enabled,quality:director.player.fx.quality}));}catch{}};
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches){$('motion-enabled').checked=false;director.setEnabled(false);motionReplay.hidden=true;}});
  window.addEventListener('pagehide',e=>{if(e.persisted)director.player.setPaused(true);else director.destroy();});
  window.addEventListener('pageshow',e=>{if(e.persisted)director.player.setPaused(document.hidden||!!document.querySelector('dialog[open]'));});
  let storageAvailable = true, saved = null;
  try {const value=localStorage.getItem(SAVE_KEY);if(value)saved=JSON.parse(value);} catch {storageAvailable=false;}
  let main = new StorySession(campaign,saved), replay = null, feedbackChoice = null;
  const active = () => replay || main;
  function persist() {
    if(replay)return;
    try {localStorage.setItem(SAVE_KEY,JSON.stringify(main.save()));storageAvailable=true;} catch {storageAvailable=false;}
    $('save-status').textContent=storageAvailable?'자동 저장됨':'저장 불가 · 설정에서 진행 파일을 보관하세요';
  }
  function chapterOf(index) {return campaign.chapters.find(c=>c.sceneIds.includes(campaign.scenes[index]?.id));}
  function renderChapters() {
    $('chapter-list').replaceChildren();let act=null;
    for(const c of campaign.chapters){
      if(c.act!==act){act=c.act;const a=campaign.acts.find(a=>a.id===act);$('chapter-list').append(el('div','act-heading',a.title));}
      const b=el('button','chapter-button');b.dataset.chapter=c.id;b.disabled=c.first>main.index;b.classList.toggle('complete',main.index>=c.first+c.sceneIds.length);b.classList.toggle('active',chapterOf(Math.min(active().index,152))?.id===c.id);
      b.append(el('span','chapter-number',String(Number(c.id.slice(1))).padStart(2,'0')),el('span','',c.title));
      b.onclick=()=>{if(c.first===main.index){replay=null;}else{replay=main.replay(c.first);}render();};
      $('chapter-list').append(b);
    }
    $('progress').value=main.index;$('progress-label').textContent=`${main.index} / ${campaign.scenes.length}`;
  }
  function sizeSprites() {
    for(const holder of $('cast').children){const cell=holder.querySelector('.sprite-cell');if(!cell)continue;const ratio=Number(cell.dataset.ratio);const height=Math.min(holder.clientHeight-7,holder.clientWidth/ratio);cell.style.height=height+'px';cell.style.width=height*ratio+'px';}
  }
  function renderCast(scene, speaker) {
    const focus=speakerIds[speaker];
    if([...$('cast').children].map(e=>e.dataset.actor).join(',')!==scene.cast.join(',')){
      $('cast').replaceChildren();
      for(const id of scene.cast){const e=entities.get(id);if(!e)continue;const holder=makeSprite(e,atlases[e.atlas],{className:'standee'});holder.dataset.actor=id;holder.dataset.idle=director.profiles.get(id).idle;holder.append(el('span','standee-name',e.name));$('cast').append(holder);}
    }
    for(const holder of $('cast').children){const id=holder.dataset.actor;holder.classList.toggle('speaking',!focus||id.startsWith(focus)||focus.startsWith(id));}
    sizeSprites();
  }
  function world(scene) {const g=Number(scene.research_group.slice(1));return scene.order===151?'city':g<=7?'subway':g<=13?'city':g===14?'underworld':g===15?'peace':g<=17?'city':g<=20?'castle':g<=22?'demon':g===23?'murim':g===24?'demon':g===25?'battle':'train';}
  function render() {
    const session=active(),scene=session.scene;renderChapters();$('ending').hidden=!session.finished;$('replay-bar').hidden=!replay;
    $('choices').replaceChildren();
    if(!scene){director.clear();motionReplay.hidden=true;$('scene-title').textContent='함께 얻어 낸 봄';$('scene-counter').textContent='153 / 153';$('act-name').textContent='완독 · 마왕 선발전 정산';return;}
    $('scene-title').textContent=scene.title;$('scene-counter').textContent=`${String(scene.order).padStart(3,'0')} / 153`;$('act-name').textContent=campaign.acts.find(a=>a.id===scene.act).title;
    $('location').textContent=scene.location;$('stage').dataset.world=world(scene);$('mode').textContent=scene.mode;$('objective').textContent=scene.objective;
    const line=scene.lines[session.line];$('speaker').textContent=line.speaker;$('line-counter').textContent=`${session.line+1} / ${scene.lines.length}`;$('line-text').textContent=line.text;renderCast(scene,line.speaker);
    director.show(scene,session.line);motionReplay.hidden=!director.current||!director.player.enabled;
    $('back-line').disabled=session.line===0;$('next-line').hidden=session.ready;$('save-status').textContent=replay?'회상 중 · 현재 진행 유지':storageAvailable?'자동 저장됨':'저장 불가 · 진행 파일을 보관하세요';
    if(session.ready)for(const c of scene.choices){const b=el('button','choice',c.label);b.dataset.choice=c.id;b.onclick=()=>answer(c.id);$('choices').append(b);}
  }
  function step() {const s=active();if(s.nextLine()){persist();render();}else if(s.ready){if(s.scene.choices.length===1)answer(s.scene.choices[0].id);else $('choices').querySelector('button')?.focus();}}
  function finishChoice() {
    const s=active();if(!s.commit())return;
    if(replay && replay.index>=main.index)replay=null;
    if(!replay)persist();render();
    if(s.finished)$('ending-journal').focus();else ($('next-line').hidden?$('choices').querySelector('button'):$('next-line'))?.focus();
  }
  function answer(id) {
    const c=active().choose(id);if(!c)return;
    if(!c.reply){finishChoice();return;}
    feedbackChoice=c;$('feedback-kind').textContent=c.kind==='reflect'?'다시 읽기':'선택의 기록';$('feedback-title').textContent=c.label;$('feedback-text').textContent=c.reply;$('feedback-next').textContent=c.kind==='reflect'?'다시 판단하기':'계속';$('feedback').showModal();$('feedback-next').focus();
  }
  $('next-line').onclick=step;$('back-line').onclick=()=>{if(active().previousLine()){persist();render();}};
  $('feedback-next').onclick=()=>{const c=feedbackChoice;$('feedback').close();feedbackChoice=null;if(c?.kind==='advance')finishChoice();else $('choices').querySelector('button')?.focus();};
  $('feedback').addEventListener('cancel',()=>{active().pending=null;feedbackChoice=null;});
  $('return-button').onclick=()=>{replay=null;render();};
  function journal() {
    const state=active().state,body=$('journal-content');body.replaceChildren();
    body.append(el('p','',`지금까지 ${active().index}개의 장면을 지나왔습니다.`));
    body.append(el('h3','','기억할 사건'));const events=el('ul','journal-events');
    for(const [key,label] of Object.entries(milestones))if(state.flags[key]===true)events.append(el('li','',label));
    if(!events.children.length)events.append(el('li','','이야기의 첫 장면을 읽고 있습니다.'));body.append(events);
    body.append(el('h3','','남겨진 설화'));const stories=el('div','journal-list');for(const name of state.stories)stories.append(el('div','journal-entry',name));if(!stories.children.length)stories.append(el('p','','아직 기록된 설화가 없습니다.'));body.append(stories);
    body.append(el('h3','','이야기에 등장한 물건'));const items=el('div','journal-list');
    for(const [id,value] of Object.entries(state.items)){const entity=entities.get(id),entry=el('div','journal-entry'+(value.status==='used'?' used':''));if(entity)entry.append(makeSprite(entity,atlases[entity.atlas],{className:'journal-item-art'}));entry.append(el('span','',entity?.name||id),el('small','',value.status==='used'?'사용·교환·성장에 연결된 기록':'등장한 물건의 기록'));items.append(entry);}body.append(items);
    body.append(el('p','','물건의 기록에는 동료와 다른 인물이 사용한 물품도 포함됩니다.'));
    $('journal').showModal();
  }
  $('journal-button').onclick=$('ending-journal').onclick=journal;
  $('settings-button').onclick=()=>$('settings').showModal();
  for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
  for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){if(d.id==='feedback'){active().pending=null;feedbackChoice=null;}d.close();}});
  $('export-save').onclick=()=>{const blob=new Blob([JSON.stringify(main.save(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='readers-record-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('import-save').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>131072)throw Error();const data=JSON.parse(await f.text());if(!data||data.schema!==1||!Array.isArray(data.choices))throw Error();const imported=new StorySession(campaign,data);if(imported.recovered)throw Error();main=imported;replay=null;persist();render();$('settings-message').textContent='진행 파일을 불러왔습니다.';}catch{$('settings-message').textContent='올바른 진행 파일이 아닙니다. 현재 진행은 유지했습니다.';}e.target.value='';};
  $('reset-save').onclick=()=>{main=new StorySession(campaign);replay=null;persist();$('settings').close();render();};
  document.addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]'))return;if(e.target.closest('button,a,input,select,textarea,summary'))return;if(e.key==='Enter'||e.code==='Space'){e.preventDefault();step();}});
  new ResizeObserver(sizeSprites).observe($('stage'));
  render();persist();
}
start().catch(error=>{$('scene-title').textContent='이야기를 불러오지 못했습니다';$('line-text').textContent='로컬 서버에서 페이지를 새로고침해 주세요. 저장된 진행은 지우지 않았습니다.';console.error(error);});
