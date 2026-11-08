import {GameSession,GAME_SAVE_KEY} from './runtime/session.js?v=major-events-1';
import {HEROES,GEAR,CONSUMABLES,SHOP,ENCOUNTERS,worldFor,levelFor} from './data.js';
import {MotionPlayer,readMotionPreference,MOTION_SAVE_KEY} from '../animation/player.js';
import {makeSprite,atlasMap} from '../animation/sprites.js';
import {profileFor} from '../animation/library.js';
import {StoryDirector} from '../animation/director.js';
import {readJson} from '../animation/resources.js';
import {ArcadeUI} from './ui.js?v=major-events-1';
const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function start(){
 const [campaign,catalog,artManifest,groundAnchors,animation]=await Promise.all(['story/campaign.json','assets/catalog.json','assets/manifest.json','game/assets/ground-anchors.json','animation/manifest.json'].map(readJson));
 const entities=new Map([...catalog.existing,...catalog.entities].map(e=>[e.id,e])),atlases=atlasMap(catalog,artManifest),motion=readMotionPreference(),player=new MotionPlayer($('battlefield'),motion);
 const director=new StoryDirector($('battlefield'),{manifest:animation,entities,atlases,player});
 let saved=null,storage=true;try{const raw=localStorage.getItem(GAME_SAVE_KEY);if(raw)saved=JSON.parse(raw);}catch{storage=false;}
 const createGame=(save=null)=>new GameSession(campaign,save,{compact:true});
 let game=createGame(saved),selected=null,target=null,busy=false,auto=false,toastTimer=0,logs=[],sound=false,audio=null,ui=null;
 const units=new Map();const chapters=()=>game.compact?game.beats.map(b=>({...b,first:b.first-1,act:campaign.scenes[b.first-1].act,sceneIds:campaign.scenes.slice(b.first-1,b.last).map(s=>s.id)})):campaign.chapters;const chapterFor=scene=>game.compact?game.beat:campaign.chapters.find(c=>c.sceneIds.includes(scene?.id));
 function persist(){try{localStorage.setItem(GAME_SAVE_KEY,JSON.stringify(game.save()));storage=true;}catch{storage=false;}$('save-status').textContent=storage?'자동 저장됨':'저장 불가 · 설정에서 파일 저장';}
 function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,2700);}
 function tone(kind){if(!sound)return;try{audio||=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(kind==='heal'?650:kind==='win'?880:240,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(kind==='heal'?900:kind==='win'?1200:100,audio.currentTime+.12);gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+.22);}catch{}}
 function art(id,cls='item-art'){const e=entities.get(id);if(!e)return node('div',cls);const sprite=makeSprite(e,atlases[e.atlas],{className:cls});if(e.kind==='equipment')sprite.dataset.equipment='true';return sprite;}
 function name(id){return entities.get(id)?.name||HEROES[id]?.name||id;}
 function appearance(id){const weapon=game.loadout.weapon;if(['dokja-office','dokja-coat'].includes(id))return ({'stone-hog-spike':'dokja-stone-hog-spike','broken-faith':'dokja-broken-faith','unbroken-faith':'dokja-unbroken','four-tiger-sword':'dokja-four-tiger'})[weapon]||id;if(id.startsWith('heewon')&&weapon==='judgment-sword')return 'heewon-judgment-loadout';if(id==='junghyeok'&&weapon==='black-heaven')return 'junghyeok-blackheaven';return id;}
 function close(){ $('modal').close();player.setPaused(document.hidden||!!document.querySelector('dialog[open]')); }
 function modal(title,content,eyebrow='THE READER’S RECORD'){
  if(busy){toast('현재 동작이 끝난 뒤 열 수 있습니다.');return false;}auto=false;updateAuto();$('modal-title').textContent=title;$('modal-eyebrow').textContent=eyebrow;$('modal-content').replaceChildren(content);if(!$('modal').open)$('modal').showModal();player.setPaused(true);return true;
 }
 $('modal-close').onclick=close;$('modal').addEventListener('close',()=>player.setPaused(document.hidden||!!document.querySelector('dialog[open]')));
 $('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 function updateAuto(){$('auto-battle').textContent=auto?'자동 전투 켜짐':'자동 전투 꺼짐';$('auto-battle').setAttribute('aria-pressed',String(auto));}
 function focusMap(){const current=$('chapter-map').querySelector('.current')||$('chapter-map').lastElementChild;if(current){const r=current.getBoundingClientRect(),map=$('chapter-map').getBoundingClientRect();if(innerWidth<=800)$('chapter-map').scrollLeft+=r.left-map.left-12;else $('chapter-map').scrollTop+=r.top-map.top-70;}}
 function renderMap(){
  $('chapter-map').replaceChildren();let act=null;const columns=innerWidth<=700?7:8;$('chapter-map').style.gridTemplateColumns=`repeat(${columns},minmax(0,1fr))`;$('chapter-map').style.gridTemplateRows=`repeat(${Math.ceil(chapters().length/columns)},minmax(0,1fr))`;
  const rows=Math.ceil(chapters().length/columns),dy=430/rows,left=500/columns,right=1000-left;let route=`M${left} ${dy/2}`;for(let row=0;row<rows;row++){const x=row%2?left:right,y=(row+.5)*dy;route+=`H${x}`;if(row<rows-1){const edge=row%2?5:995;route+=`Q${edge} ${y} ${edge} ${y+dy/2}T${x} ${y+dy}`;}}document.querySelector('.map-landscape path').setAttribute('d',route);
  for(const [index,c] of chapters().entries()){if(act!==c.act){act=c.act;$('chapter-map').append(node('div','act-name',campaign.acts.find(a=>a.id===act).title));}
   const done=game.story.index>=c.first+c.sceneIds.length,current=chapterFor(game.scene)?.id===c.id,b=node('button','map-node'+(current?' current':'')+(done?' done':'')),row=Math.floor(index/columns);b.style.gridColumn=(row%2?columns-index%columns:index%columns+1);b.style.gridRow=row+1;b.title=c.title;b.setAttribute('aria-label',c.id.slice(1)+' · '+c.title);b.dataset.chapter=c.id;b.disabled=c.first>game.story.index;b.append(node('span','map-num',String(Number(c.id.slice(1)))),node('span','',c.title),node('small','',done?'✓':current?'◆':'▣'));b.onclick=()=>{if($('world-map').open)$('world-map').close();if(!current)openChapter(c);};$('chapter-map').append(b);
  }
  $('journey-count').textContent=game.progress+' / '+game.total;$('journey-progress').max=game.total;$('journey-progress').value=game.progress;
  focusMap();
 }
 function spriteUnit({id,uid,hp,maxHp,enemy=false,position=20,story=false,intent=null}){
  const holder=node('button','unit'+(enemy?' enemy':'')+(hp===0?' down':''));holder.dataset.uid=uid;holder.dataset.selected='false';holder.dataset.target='false';holder.style.left=position+'%';holder.setAttribute('aria-label',name(id)+(story?'':` · 체력 ${hp}/${maxHp}`));
  const visual=node('div','unit-visual'),face=node('div','face'),sprite=art(enemy?id:appearance(id),'battle-sprite');if(story)sprite.dataset.actor=id;sprite.dataset.idle=profileFor(entities.get(id)).idle;face.append(sprite);visual.append(face);holder.append(visual,node('span','unit-tag',name(id)));
  if(!story){const bar=node('span','unit-bars'),fill=node('i');fill.style.width=(hp/maxHp*100)+'%';bar.append(fill);holder.append(bar);if(enemy&&hp>0){const label={attack:'공격',charge:'힘 모으기',heavy:'강공격'}[intent],badge=node('span','intent '+intent,label);badge.title={attack:'일반 공격',charge:'힘을 모으며 이번 턴 공격하지 않습니다',heavy:'강공격 예고 · 방어 권장'}[intent];holder.append(badge);}}
  holder.onclick=()=>{if(story||busy||game.phase!=='battle')return;if(enemy){if(hp>0){target=uid;refreshSelection();}}else{const hero=game.battle.heroes.find(h=>h.uid===uid);if(hero.hp>0&&!hero.acted){selected=uid;refreshSelection();}}};
  $('units').append(holder);units.set(uid,sprite);return holder;
 }
 function sizeUnits(){for(const holder of $('units').children){const visual=holder.querySelector('.unit-visual'),cell=holder.querySelector('.sprite-cell'),sprite=holder.querySelector('.battle-sprite');if(!cell)continue;const ratio=Number(cell.dataset.ratio),height=Math.min(visual.clientHeight,visual.clientWidth/ratio)*(sprite.dataset.equipment ? .76 : 1);cell.style.height=height+'px';cell.style.width=height*ratio+'px';sprite.style.transform=`translateY(${Math.max(0,(1-(groundAnchors[sprite.dataset.entity]||.84))*height-5)}px)`;}}
 const resize=new ResizeObserver(()=>{sizeUnits();focusMap();});resize.observe($('battlefield'));
 function renderUnits(){
  director.clear();player.reset();$('units').replaceChildren();$('floaters').replaceChildren();units.clear();
  if(game.battle){const b=game.battle;for(const [i,h] of b.heroes.entries())spriteUnit({...h,position:2+i*13});for(const [i,e] of b.enemies.entries())spriteUnit({...e,enemy:true,position:54+i*13});}
  else if(game.viewScene){const cast=game.viewScene.cast.slice(0,3),positions=cast.length===1?[40]:cast.length===2?[25,58]:[15,40,65];cast.forEach((id,i)=>spriteUnit({id,uid:'story'+i,position:positions[i],story:true}));}
  else ['dokja-coat','junghyeok','biyoo'].forEach((id,i)=>spriteUnit({id,uid:'end'+i,position:15+i*25,story:true}));
  sizeUnits();
 }
 function render(){
  const scene=game.viewScene||campaign.scenes.at(-1),chapter=chapterFor(scene),level=levelFor(scene.order);
  $('chapter-number').textContent=(game.compact?'사건 ':'CHAPTER ')+chapter.id.slice(1);$('chapter-name').textContent=game.compact?'주요 시나리오':chapter.title;$('game-level').textContent='LV. '+String(level).padStart(2,'0');$('scene-title').textContent=game.complete?'함께 얻어 낸 봄':scene.title;
  $('scene-goal').textContent=game.battle?.config.goal||scene.objective;$('coins').textContent=game.coins.toLocaleString('ko-KR');$('stage-id').textContent=scene.id;$('location').textContent=scene.location;
  $('battlefield').dataset.world=worldFor(scene);$('phase-label').textContent={story:'STORY',battle:'BATTLE · '+game.battle?.round,reward:'SCENARIO CLEAR',defeat:'TRY AGAIN',ending:'THE END'}[game.phase];
  $('battle-caption').textContent=game.battle?(game.encounter.mode==='survive'?`생존 목표 ${game.encounter.rounds}턴 · 현재 ${Math.min(game.battle.round,game.encounter.rounds)}턴`:'적을 선택하고 동료의 행동을 결정하세요'):'한 사람의 선택이 다음 이야기를 엽니다.';
  $('story-panel').hidden=game.phase!=='story';$('combat-panel').hidden=game.phase!=='battle';$('result-panel').hidden=!['reward','defeat','ending'].includes(game.phase);
  renderMap();renderUnits();if(game.phase==='story')renderStory();if(game.phase==='battle')renderCombat();if(['reward','defeat','ending'].includes(game.phase))renderResult();
  $('inventory-button').disabled=busy;$('shop-button').disabled=busy;ui?.render(game,selected,busy,target);persist();
 }
 function renderStory(){
  const s=game.viewScene,line=s.lines[game.displayLine];$('speaker').textContent=line.speaker;$('line-text').textContent=line.text;$('line-count').textContent=game.compact?'핵심 사건':String(game.story.line+1).padStart(2,'0')+' / '+String(s.lines.length).padStart(2,'0');$('choice-list').replaceChildren();$('next-line').hidden=game.ready;
  if(game.ready)for(const choice of s.choices){const b=node('button',choice.kind==='advance'?'primary':'',choice.text||choice.label||'다음 이야기');if(choice.kind==='advance'&&choice.reply)b.append(node('small','choice-consequence',choice.reply));b.dataset.choice=choice.id;b.dataset.kind=choice.kind;b.onclick=()=>choose(choice.id);$('choice-list').append(b);}director.show(s,game.displayLine);$('replay-motion').hidden=!director.current||!player.enabled;ui?.renderPortrait(line.speaker);requestAnimationFrame(()=>ui?.fitArt());$('story-panel').querySelector('.dialogue-scroll').scrollTop=0;
 }
 function choose(id){if(busy)return;const outcome=game.compact?game.beat.result:null;const choice=game.choose(id);if(!choice)return;if(choice.kind!=='advance'){
   const wrap=node('div','modal-copy');wrap.append(node('p','',choice.reply||choice.feedback?.text||choice.feedback||choice.explanation||'이 선택은 현재 이야기의 결말을 바꾸지 않습니다.'));modal(choice.feedback?.title||'독자의 판단',wrap);return;
  }
  logs=[];selected=null;target=null;render();if(game.phase==='battle'){
   for(const sprite of units.values())player.play(sprite,'walk',{profile:profileFor(entities.get(sprite.dataset.entity)),distance:12,cycles:1,withEffect:false});
   $('battle-caption').textContent=game.encounter.goal;toast(game.encounter.mode==='survive'?`${game.encounter.rounds}턴 동안 한 명 이상 살아남으세요.`:'적의 행동 예고를 보고 공격·능력·방어를 선택하세요.');
  }else{if(outcome)toast(outcome);else if(game.lastReward?.items.length)toast('새 아이템 · '+game.lastReward.items.map(name).join(', '));}
 }
 $('next-line').onclick=()=>{if(game.nextLine()){renderStory();persist();}};
 $('replay-motion').onclick=()=>director.playCurrent();
 function transcript(scene,{read=false}={}){const body=node('div');scene.lines.forEach(l=>{const p=node('div','transcript-line');p.append(node('strong','',l.speaker),node('p','',l.text));body.append(p);});if(read){const b=node('button','primary','다 읽었어요 · 선택하기');b.style.marginTop='20px';b.onclick=()=>{game.readScene();close();renderStory();persist();};body.append(b);}return body;}
 $('read-scene').onclick=()=>modal(game.viewScene.title,transcript(game.viewScene,{read:true}),'사건 '+game.viewScene.id.slice(1));
 function renderCombat(){
  const b=game.battle;if(!b.heroes.some(h=>h.uid===selected&&h.hp>0&&!h.acted))selected=b.active?.uid||null;if(!b.enemies.some(e=>e.uid===target&&e.hp>0))target=b.enemies.find(e=>e.hp>0)?.uid;
  $('party-cards').replaceChildren();for(const h of b.heroes){const card=node('button','party-card');card.dataset.hero=h.uid;card.disabled=busy||h.hp<=0||h.acted;card.setAttribute('aria-pressed',String(h.uid===selected));card.append(node('strong','',h.name),node('small','',h.hp<=0?'전투 불능':h.acted?'행동 완료':h.role),node('small','',`HP ${h.hp}/${h.maxHp}`),node('small','',`MP ${h.mp}/${h.maxMp}`));for(const type of ['hp','mp']){const bar=node('span','bar '+type),fill=node('i');fill.style.width=h[type]/h[type==='hp'?'maxHp':'maxMp']*100+'%';bar.append(fill);card.append(bar);}card.onclick=()=>{selected=h.uid;refreshSelection();};$('party-cards').append(card);}
  $('turn-label').textContent=b.turn==='enemies'?'ENEMY TURN':'YOUR TURN · ROUND '+b.round;updateAuto();refreshSelection();$('combat-log').textContent=logs.at(-1)||'동료는 한 턴에 한 번 행동합니다. 적 위의 예고를 확인하세요.';
 }
 function refreshSelection(){
  const b=game.battle;if(!b)return;const actor=b.heroes.find(h=>h.uid===selected),enemy=b.enemies.find(e=>e.uid===target);
  for(const holder of $('units').children){holder.dataset.selected=String(holder.dataset.uid===selected);holder.dataset.target=String(holder.dataset.uid===target);}
  $('party-cards').querySelectorAll('button').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.hero===selected)));
  $('skill-name').textContent=actor?.skill||'능력 발동';$('skill-cost').textContent=actor?`마력 ${actor.cost} · ${actor.type==='heal'?'동료 전체 회복':actor.type==='shield'?'동료 전체 방어':actor.type==='area'?'적 전체 공격':'집중 공격'}`:'';
  $('target-label').textContent=enemy?'대상 · '+name(enemy.id)+' · '+({attack:'공격 예고',heavy:'강공격 · 방어 권장',charge:'힘 모으기 · 이번 턴 휴식'}[enemy.intent]):'대상을 선택하세요';
  for(const id of ['attack-button','skill-button','guard-button','item-button'])$(id).disabled=busy||!actor||b.turn!=='heroes';if(actor&&actor.mp<actor.cost)$('skill-button').disabled=true;
  if(ui){ui.selected=selected;ui.target=target;ui.busy=busy;ui.renderEquipment();ui.renderInspector();ui.renderPortrait();requestAnimationFrame(()=>ui.fitArt());}
 }
 function float(event){const sprite=units.get(event.target);if(!sprite)return;const unit=sprite.closest('.unit'),h=$('battlefield').getBoundingClientRect(),r=unit.getBoundingClientRect(),n=node('span','damage-number '+event.kind,event.kind==='heal'?`+${event.amount}`:event.kind==='mana'?`MP +${event.amount}`:event.kind==='damage'?String(event.amount):event.kind==='guard'?'방어':event.kind==='buff'?'강화':'');if(!n.textContent)return;n.style.left=r.left-h.left+r.width*.4+'px';n.style.top=r.top-h.top+r.height*.43+'px';$('floaters').append(n);setTimeout(()=>n.remove(),850);}
 async function animateEvents(events){
  for(const e of events){const source=units.get(e.actor),to=units.get(e.target);if(!source)continue;const profile=profileFor(entities.get(source.dataset.entity));
   if(e.kind==='damage'){player.play(source,'attack',{profile,target:to,effect:e.effect,direction:e.actor.startsWith('e')?-1:1});if(e.actor.startsWith('h'))tone('hit');}
   else if(e.kind==='heal'||e.kind==='mana'){player.burst(e.effect,to);tone('heal');}
   else if(e.kind==='guard'||e.kind==='buff'||e.kind==='charge')player.burst(e.effect,to);
   if(e.kind==='down'&&to)player.play(to,'fall',{profile:profileFor(entities.get(to.dataset.entity)),withEffect:false});
   float(e);
   const actorName=name((game.battle.heroes.find(h=>h.uid===e.actor)||game.battle.enemies.find(x=>x.uid===e.actor))?.id);
   if(e.kind==='damage')logs.push(actorName+' → '+name((game.battle.heroes.find(h=>h.uid===e.target)||game.battle.enemies.find(x=>x.uid===e.target))?.id)+' · 피해 '+e.amount);
   if(e.kind==='heal')logs.push(actorName+' · 체력 '+e.amount+' 회복');
  }
  await wait(player.enabled?auto?340:510:80);
 }
 async function perform(type,extra={}){
  if(busy||game.phase!=='battle'||$('modal').open||document.hidden)return;const actor=selected||game.battle.active?.uid;if(!actor)return;busy=true;refreshSelection();
  if(!game.command({type,actor,target,...extra})){busy=false;refreshSelection();return;}
  persist();await animateEvents([...game.battle.events]);
  if(game.phase==='battle'&&game.battle.turn==='enemies'){
   $('turn-label').textContent='ENEMY TURN';await wait(player.enabled?250:0);game.enemyTurn();persist();await animateEvents([...game.battle.events]);
  }
  busy=false;render();if(game.phase==='reward'){auto=false;updateAuto();tone('win');player.burst(game.scene.order===152?'spring':'pickup',units.values().next().value);}
  if(game.phase==='defeat'){auto=false;updateAuto();}
  if(auto&&game.phase==='battle')queueAuto();
 }
 function queueAuto(){setTimeout(()=>{if(!auto||busy||document.hidden||$('modal').open||game.phase!=='battle')return;const h=game.battle.heroes.find(h=>h.uid===selected)||game.battle.active;if(!h)return;let type=h.mp>=h.cost?'skill':'attack';if(h.type==='heal'&&game.battle.heroes.every(x=>x.hp===0||x.hp>x.maxHp*.7))type='attack';if(h.type==='shield'&&!game.battle.enemies.some(e=>e.hp>0&&e.intent==='heavy'))type='attack';perform(type);},140);}
 $('attack-button').onclick=()=>perform('attack');$('skill-button').onclick=()=>perform('skill');$('guard-button').onclick=()=>perform('guard');$('item-button').onclick=openConsumables;$('auto-battle').onclick=()=>{auto=!auto;updateAuto();if(auto)queueAuto();};
 function openConsumables(){if(busy||game.phase!=='battle')return;const body=node('div');body.append(node('p','modal-copy','선택한 동료에게 사용하며 행동 1회를 소모합니다. 전투에서 패배하면 입장 전 물약 수량으로 돌아갑니다.'));const grid=node('div','item-grid');for(const [id,def] of Object.entries(CONSUMABLES)){const card=itemCard(id,game.battle.supplies[id]||0),b=node('button','',id==='hp-potion'?'체력 55% 회복':id==='mp-potion'?'마력 70% 회복':'공격력 +8');b.disabled=!(game.battle.supplies[id]>0);b.onclick=()=>{close();perform('item',{item:id,ally:selected});};card.lastChild.append(b);grid.append(card);}body.append(grid);modal('전투 소모품',body,'BATTLE ITEMS');}
 function renderResult(){
  const panel=$('result-panel');panel.replaceChildren();
  if(game.phase==='reward'){
   panel.append(node('span','eyebrow','SCENARIO CLEAR'),node('h2','',game.encounter.mode==='survive'?'끝까지 버텨 냈습니다':'다음 이야기를 향해'),node('p','',game.compact&&game.scene.order>=(game.beat.encounter||0)?game.beat.result:game.encounter.goal),node('div','reward-coins','✦ +'+game.lastReward.coins));
   const items=node('div','reward-items');for(const id of game.lastReward.items){const item=node('div','reward-item');item.append(art(id),node('span','',name(id)));items.append(item);}if(game.lastReward.potions)items.append(node('span','reward-item','체력 회복 물약 ×1'));panel.append(items);const b=node('button','primary','보상 받고 계속 →');b.id='claim-reward';b.onclick=()=>{if(game.completeScene()){selected=null;target=null;logs=[];render();}};panel.append(b);
  }else if(game.phase==='defeat'){
   panel.append(node('span','eyebrow','A PAGE TO REWRITE'),node('h2','','이야기는 여기서 끝나지 않습니다'),node('p','','전투 입장 시점으로 돌아갑니다. 동료와 물약을 회복하고, 강공격 예고에 맞춰 방어해 보세요.'));const b=node('button','primary','같은 전투 다시 도전');b.id='retry-battle';b.onclick=()=>{game.retry();selected=null;render();};panel.append(b);
  }else{
   panel.append(node('span','eyebrow','THE FIRST GREAT STORY'),node('div','ending-seal','春'),node('h2','','마계의 봄'),node('p','','함께 살아남은 시간이 하나의 이야기가 되었습니다.'),node('p','',`주요 사건 ${game.total}개 · 전투 ${game.battlesWon}회 완료 · ${game.coins.toLocaleString()} 코인`));const stories=node('div','ending-stories');for(const title of game.story.state.stories)stories.append(node('span','',title));panel.append(stories);const b=node('button','primary','함께 남긴 기록 보기');b.onclick=openJournal;panel.append(b);
  }
 }
 function itemDescription(id){const g=GEAR[id],c=CONSUMABLES[id];if(g)return [g.atk?'공격 +'+g.atk:null,g.def?'방어 +'+g.def:null,g.hp?'체력 +'+g.hp:null,g.mp?'마력 +'+g.mp:null].filter(Boolean).join(' · ');if(c)return c.heal?'체력 55% 회복':c.mana?'마력 70% 회복':'전투 중 공격력 +8';return '이야기에서 얻은 기록 아이템';}
 function itemCard(id,amount){const card=node('div','item-card'),copy=node('div');copy.append(node('h3','',name(id)),node('p','',itemDescription(id)),node('span','badge','×'+amount+(game.upgrades[id]?' · +'+game.upgrades[id]:'')));card.append(art(id),copy);return card;}
 function openInventory(){const body=node('div'),strip=node('div','loadout-strip');for(const [slot,label] of Object.entries({weapon:'무기',armor:'방어구',charm:'보조'}))strip.append(node('span','',label+' · '+(game.loadout[slot]?name(game.loadout[slot]):'미장착')));body.append(strip,node('p','modal-copy','장비 능력치는 출전 동료 모두에게 적용됩니다. 강화를 하면 해당 장비의 능력치가 22%씩 올라갑니다. 전투 중에는 장비를 바꿀 수 없습니다.'));const grid=node('div','item-grid');
  for(const [id,amount] of Object.entries(game.bag).filter(([,n])=>n>0)){const card=itemCard(id,amount);if(GEAR[id]){const equipped=Object.values(game.loadout).includes(id),equip=node('button','',equipped?'장착 해제':'장착'),up=node('button','',(game.upgrades[id]||0)>=5?'강화 완료':'강화 · '+game.upgradeCost(id)+'코인');equip.disabled=!game.canManage();up.disabled=!game.canManage()||(game.upgrades[id]||0)>=5||game.coins<game.upgradeCost(id);equip.onclick=()=>{game.equip(id);persist();render();openInventory();};up.onclick=()=>{if(game.upgrade(id)){persist();render();openInventory();tone('win');}};card.lastChild.append(node('br'),equip,up);}grid.append(card);}body.append(grid);modal('가방과 장비',body,'INVENTORY & EQUIPMENT');}
 function openShop(){const body=node('div');body.append(node('p','modal-copy',`보유 코인 ${game.coins.toLocaleString()} · 장면 사이에 구입할 수 있습니다. 전투에 들어갈 때 체력과 마력은 전부 회복됩니다.`));const grid=node('div','item-grid');for(const id of SHOP){const card=itemCard(id,game.bag[id]||0),def=CONSUMABLES[id]||GEAR[id],b=node('button','',GEAR[id]&&game.bag[id]?'보유 중':def.price+' 코인 · 구입');b.disabled=!game.canManage()||game.coins<def.price||!!(GEAR[id]&&game.bag[id]);b.onclick=()=>{if(game.buy(id)){persist();render();openShop();tone('win');}};card.lastChild.append(node('br'),b);grid.append(card);}body.append(grid);modal('비형의 도깨비 상점',body,'DOKKAEBI SHOP');}
 function openJournal(){const body=node('div');body.append(node('p','modal-copy',`주요 사건 ${game.progress} / ${game.total} · 전투 ${game.battlesWon}회 클리어`));for(const title of game.story.state.stories)body.append(node('h3','modal-section-title',title));body.append(node('h3','modal-section-title','지나온 이야기'));for(const c of chapters().filter(c=>game.compact?c.last<=game.story.index:c.first<game.story.index)){const b=node('button','back-camp',c.id.slice(1)+' · '+c.title+' 읽기');b.onclick=()=>openChapter(c);body.append(b);}if(!game.story.index)body.append(node('p','modal-copy','첫 시나리오를 완료하면 기록이 남습니다.'));modal('함께 남긴 기록',body,'YOUR STORIES');}
 function openChapter(chapter){const body=node('div');if(game.compact){const beat=game.beats.find(b=>b.id===chapter.id);body.append(node('p','modal-copy',beat.summary),node('p','modal-copy',beat.result));modal(beat.title,body,'사건 '+beat.id.slice(1));return;}for(const id of chapter.sceneIds){const scene=campaign.scenes.find(s=>s.id===id);if(scene.order>game.story.index+1)continue;body.append(node('h3','modal-section-title',scene.title),transcript(scene));}modal(chapter.title,body,'CHAPTER '+chapter.id.slice(1));}
 function openHelp(){const body=node('div'),list=node('ol','help-steps');for(const text of ['큰 사건 32개를 따라갑니다. 짧은 요약을 읽고 전투 시작을 누르면 대표 전투로 바로 이어집니다.','전투에서는 동료와 적을 누른 다음 공격·능력·방어·소모품을 고릅니다. 동료마다 한 턴에 한 번 행동합니다.','적의 강공격 예고가 보이면 방어하세요. 버티기 전투는 표시된 턴을 살아남으면 성공합니다.','보상으로 얻은 무기를 장착하고 코인으로 강화하세요. 상점에서 회복 물약과 장비를 살 수 있습니다.','전투에 들어갈 때 체력·마력은 회복됩니다. 패배해도 진행을 잃지 않고 다시 도전할 수 있습니다.','Enter / Space: 다음 문장 · 1 공격 · 2 능력 · 3 방어 · 4 소모품. 전투는 자동 진행으로 바꿀 수 있습니다.'])list.append(node('li','',text));body.append(list);modal('다음 페이지를 여는 방법',body,'HOW TO PLAY');}
 function downloadSave(){const blob=new Blob([JSON.stringify(game.save(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='readers-record-game.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function openSettings(){const body=node('div');body.append(node('p','modal-copy','현재 게임은 이 브라우저에 자동 저장됩니다. 기존 스토리 서재의 진행과 별도로 보관합니다.'));const motionLabel=node('label','setting-row'),checkbox=node('input');checkbox.type='checkbox';checkbox.checked=player.enabled;checkbox.onchange=()=>{player.setEnabled(checkbox.checked);try{localStorage.setItem(MOTION_SAVE_KEY,JSON.stringify({enabled:player.enabled,quality:player.fx.quality}));}catch{}};motionLabel.append(checkbox,node('span','','캐릭터 애니메이션 · 파티클'));body.append(motionLabel);const soundLabel=node('label','setting-row'),soundBox=node('input');soundBox.type='checkbox';soundBox.checked=sound;soundBox.onchange=()=>{sound=soundBox.checked;ui?.setSound(sound);tone('win');};soundLabel.append(soundBox,node('span','','전투 효과음'));body.append(soundLabel);
  const actions=node('div','modal-actions'),exp=node('button','','진행 파일 저장'),label=node('label','import-label','진행 파일 불러오기'),input=node('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>1000000)throw Error('파일이 너무 큽니다.');const data=JSON.parse(await file.text());if(data.schema!==1||!data.story||!Array.isArray(data.story.choices))throw Error('게임 저장 파일이 아닙니다.');game=createGame(data);selected=null;target=null;logs=[];close();render();toast('진행 파일을 불러왔습니다.');}catch(e){toast(e.message||'파일을 불러오지 못했습니다.');}};label.append(input);exp.onclick=downloadSave;actions.append(exp,label);body.append(actions);const details=node('details');details.style.marginTop='24px';details.append(node('summary','','게임을 처음부터 다시 시작'));const reset=node('button','danger','현재 게임 진행 지우기');reset.style.marginTop='14px';reset.onclick=()=>{game=createGame();selected=null;target=null;logs=[];close();render();toast('새 이야기를 시작합니다.');};details.append(node('p','modal-copy','게임 진행·코인·장비를 초기화합니다. 먼저 진행 파일을 저장할 수 있습니다.'),reset);body.append(details);modal('게임 설정',body,'SETTINGS');}
 $('inventory-button').onclick=openInventory;$('shop-button').onclick=openShop;$('journal-button').onclick=openJournal;$('help-button').onclick=openHelp;$('settings-button').onclick=openSettings;
 document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName))return;if(game.phase==='story'&&['Enter',' '].includes(e.key)){e.preventDefault();if(!game.ready)$('next-line').click();else if(game.compact)document.querySelector('#choice-list [data-kind=advance]')?.click();}if(game.phase==='battle'&&['1','2','3','4'].includes(e.key)){e.preventDefault();$({'1':'attack-button','2':'skill-button','3':'guard-button','4':'item-button'}[e.key]).click();}});
 document.addEventListener('visibilitychange',()=>{player.setPaused(document.hidden||$('modal').open);if(document.hidden){auto=false;updateAuto();} });
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches)player.setEnabled(false);});
 window.addEventListener('pagehide',e=>{persist();auto=false;if(e.persisted)player.setPaused(true);else{resize.disconnect();ui?.destroy();director.destroy();player.destroy();}});window.addEventListener('pageshow',e=>{if(e.persisted){player.setPaused(!!document.querySelector('dialog[open]'));render();}});
 ui=new ArcadeUI({art,name,appearance,describe:itemDescription,toast,onEquip:id=>{if(game.equip(id)){persist();render();}},onUpgrade:id=>{if(game.upgrade(id)){tone('win');persist();render();}},onUse:id=>{if(!busy&&game.phase==='battle')perform('item',{item:id,ally:selected});},onPause:paused=>{auto=false;updateAuto();player.setPaused(document.hidden||paused);},onEnter:()=>render(),onSound:()=>{sound=!sound;ui.setSound(sound);tone('win');},onNewGame:()=>{const body=node('div');body.append(node('p','modal-copy','현재 진행을 지우고 첫 시나리오부터 시작합니다. 이어서 플레이하려면 창을 닫고 ‘이어하기’를 누르세요.'));const confirm=node('button','gem-button','새 이야기 시작');confirm.onclick=()=>{game=createGame();selected=null;target=null;logs=[];close();ui.picked=null;ui.enter();};body.append(confirm);modal('새 게임',body,'NEW GAME');}});
 window.addEventListener('resize',renderMap);render();ui.initialTitle();if(!storage)toast('브라우저 저장을 사용할 수 없습니다. 설정에서 진행 파일을 보관하세요.');
}
start().then(()=>window.dispatchEvent(new Event('pinn-game-ready'))).catch(e=>{$('scene-title').textContent='게임을 불러오지 못했습니다';$('scene-goal').textContent='로컬 서버에서 다시 열어 주세요. '+e.message;console.error(e);window.dispatchEvent(new CustomEvent('pinn-game-error',{detail:e.message}));});
