import {ACTIONS,EFFECTS,profileFor} from './library.js';
import {MotionPlayer,readMotionPreference,MOTION_SAVE_KEY} from './player.js';
import {makeSprite,atlasMap} from './sprites.js';
import {WALK_CYCLES} from './walk-data.js';
const $=id=>document.getElementById(id),node=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text||'';if(cls)n.className=cls;return n;};
async function start(){
 const [catalog,manifest]=await Promise.all(['assets/catalog.json','assets/manifest.json'].map(async u=>{const r=await fetch(u);if(!r.ok)throw Error(u);return r.json();}));
 const entities=[...catalog.existing,...catalog.entities],byId=new Map(entities.map(e=>[e.id,e])),atlases=atlasMap(catalog,manifest),preference=readMotionPreference();
 const params=new URLSearchParams(location.search),player=new MotionPlayer($('motion-stage'),preference);let kind='character',selected=byId.get(params.get('entity'))||byId.get('dokja-coat'),profile=profileFor(selected),action=selected.kind==='item'?'activate':'walk',effect=profile.effect,source,target,loopTimer=0;
 kind=selected.kind;$('motion-enabled').checked=preference.enabled;$('quality').value=preference.quality;
 function persist(){try{localStorage.setItem(MOTION_SAVE_KEY,JSON.stringify({enabled:player.enabled,quality:player.fx.quality}));}catch{}}
 function stop(){clearTimeout(loopTimer);loopTimer=0;player.reset();$('play-status').textContent=player.enabled?'대기':'움직임 꺼짐';}
 function sizeActors(){const floorGap=$('motion-stage').getBoundingClientRect().bottom-$('motion-stage').querySelector('.floor-grid').getBoundingClientRect().top;for(const actor of $('actors').children){const cell=actor.querySelector('.sprite-cell'),ratio=Number(cell.dataset.ratio),height=Math.min(actor.clientHeight,actor.clientWidth/ratio);cell.style.height=height+'px';cell.style.width=height*ratio+'px';const sheet=WALK_CYCLES[actor.dataset.entity];if(sheet)actor.style.bottom=Math.max(0,floorGap-(1-sheet.sourceGround)*height)+'px';}}
 const resizeObserver=new ResizeObserver(sizeActors);resizeObserver.observe($('motion-stage'));
 function actors(){stop();$('actors').replaceChildren();source=makeSprite(selected,atlases[selected.atlas],{className:'motion-sprite actor-left'});source.dataset.idle=profile.idle;
  const other=byId.get(selected.kind==='item'?'dokja-coat':'sentinel-golem');target=makeSprite(other,atlases[other.atlas],{className:'motion-sprite actor-right'});target.dataset.idle=profileFor(other).idle;$('actors').append(source,target);sizeActors();$('source-label').textContent=selected.name;$('target-label').textContent=selected.kind==='item'?'사용 대상 · 김독자':'동작 확인용 표적';
 }
 function renderList(){const q=$('entity-search').value.trim().toLocaleLowerCase(),list=entities.filter(e=>e.kind===kind&&(!q||e.name.toLocaleLowerCase().includes(q)||e.id.includes(q)));$('entity-list').replaceChildren();$('entity-count').textContent=list.length+' / '+entities.length;
  for(const e of list){const p=profileFor(e),b=node('button',e.name,'entity-choice');b.dataset.entity=e.id;b.setAttribute('aria-pressed',String(e.id===selected.id));b.append(node('small',EFFECTS[p.effect].label+' · '+p.actions.length+'개 동작'));b.onclick=()=>select(e);$('entity-list').append(b);}if(!list.length)$('entity-list').append(node('p','검색 결과가 없습니다.','empty'));
  $('kind-tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===kind)));
 }
 function controls(){
  const sheet=WALK_CYCLES[selected.id];
  $('actions').replaceChildren();for(const id of profile.actions){const b=node('button',id==='walk'&&!sheet?'간이 이동':ACTIONS[id].label);b.dataset.action=id;b.setAttribute('aria-pressed',String(id===action));b.onclick=()=>{action=id;history.replaceState(null,'','?entity='+encodeURIComponent(selected.id)+'&action='+action);controls();play();};$('actions').append(b);}
  $('walk-controls').hidden=action!=='walk';$('effect-panel').hidden=action==='walk';$('walk-frame-status').textContent=sheet?'팔·다리 8프레임 루프':'기존 아트의 공통 이동 연출';$('walk-sheet-download').hidden=!sheet;if(sheet)$('walk-sheet-download').href='assets/'+sheet.path;
  $('action-count').textContent=profile.actions.length+'개';$('effects').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.effect===effect)));
  $('effect-description').textContent=EFFECTS[effect].label+' · '+(selected.kind==='item'?'아이템 중심에서 발동하고 대상에게 전달됩니다.':'공격 시 표적에, 방어·회복 시 자신에게 표시됩니다.');
 }
 function select(e,requested=null){selected=e;profile=profileFor(e);kind=e.kind;action=profile.actions.includes(requested)?requested:e.kind==='item'?'activate':WALK_CYCLES[e.id]?'walk':'attack';effect=profile.effect;$('entity-title').textContent=e.name;$('source-status').textContent=e.sourceStatus==='provisional'?'임시 외형':e.sourceStatus==='ui-symbol'?'상징 표현':'참고 외형 확인';history.replaceState(null,'','?entity='+encodeURIComponent(e.id)+'&action='+action);actors();renderList();controls();}
 function play(){stop();if(!player.enabled||document.hidden){$('play-status').textContent='움직임 꺼짐';return;}const beneficial=['shield','heal','mana','soul','insight','seal','summon','portal','pickup','spring','craft'].includes(effect);
  const to=['guard','victory','acquire','equip','teleport','idle','enter','jump','walk','fall','dodge','hit'].includes(action)?null:beneficial&&selected.kind!=='item'?null:target;
  const walking=action==='walk'&&!!WALK_CYCLES[selected.id],direction=Number($('walk-direction').value),distance=action==='walk'&&$('walk-mode').value==='travel'?Math.min(90,$('motion-stage').clientWidth*.14):0;
  const seamless=walking&&$('auto-loop').checked&&distance===0;
  $('play-status').textContent=walking?'걷기 · 8프레임 · '+(direction<0?'왼쪽':'오른쪽'):ACTIONS[action].label+' / '+EFFECTS[effect].label;
  player.play(source,action,{profile,target:to,effect,direction:action==='walk'?direction:1,distance,loop:seamless,onImpact:()=>{},onFinish:()=>{$('play-status').textContent=ACTIONS[action].label+' 완료';}});
  if($('auto-loop').checked&&!seamless){loopTimer=setTimeout(play,(action==='idle'?2200:ACTIONS[action].duration*(walking?2:1)+850)/player.speed);}
 }
 for(const [id,label] of Object.entries({character:'캐릭터',item:'아이템',equipment:'장착'})){const b=node('button',label);b.dataset.kind=id;b.onclick=()=>{kind=id;renderList();};$('kind-tabs').append(b);}
 for(const [id,def] of Object.entries(EFFECTS)){const b=node('button','','effect-choice'),swatch=node('span','','swatch');swatch.style.background=def.color;b.append(swatch,node('span',def.label));b.dataset.effect=id;b.onclick=()=>{effect=id;controls();play();};$('effects').append(b);}
 $('entity-search').oninput=renderList;$('play').onclick=play;$('stop').onclick=()=>{$('auto-loop').checked=false;stop();};$('auto-loop').onchange=()=>{$('auto-loop').checked?play():stop();};$('default-effect').onclick=()=>{effect=profile.effect;controls();play();};
 $('speed').oninput=()=>{player.setSpeed($('speed').value);$('speed-label').textContent=$('speed').value+'×';if(action==='walk'&&source?.querySelector('[data-walking]'))play();};$('quality').onchange=()=>{player.setQuality($('quality').value);persist();};
 $('walk-direction').onchange=$('walk-mode').onchange=play;
 $('motion-enabled').onchange=()=>{stop();player.setEnabled($('motion-enabled').checked);persist();$('play-status').textContent=player.enabled?'대기':'움직임 꺼짐';};
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(loopTimer);loopTimer=0;}});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');reduced.addEventListener('change',e=>{if(e.matches){stop();$('motion-enabled').checked=false;player.setEnabled(false);}});
 $('coverage').textContent=`${entities.length}개 아트 · 걷기 ${Object.keys(WALK_CYCLES).length}개 모습 / 80프레임 · 효과 ${Object.keys(EFFECTS).length}종`;
 select(selected,params.get('action'));window.addEventListener('pagehide',e=>{clearTimeout(loopTimer);if(e.persisted){stop();player.setPaused(true);}else{resizeObserver.disconnect();player.destroy();}});
 window.addEventListener('pageshow',e=>{if(e.persisted){player.setPaused(false);sizeActors();}});
}
start().catch(e=>{$('entity-title').textContent='애니메이션을 불러오지 못했습니다';$('play-status').textContent='로컬 서버에서 다시 열어 주세요';console.error(e);});
