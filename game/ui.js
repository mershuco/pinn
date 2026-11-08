import {HEROES,GEAR,CONSUMABLES} from './data.js';
import {statsFor} from './runtime/battle.js';
const $=id=>document.getElementById(id),n=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
export class ArcadeUI{
 constructor({art,name,appearance,describe,toast,onEquip,onUpgrade,onUse,onNewGame,onPause,onEnter,onSound}){
  Object.assign(this,{art,name,appearance,describe,toast,onEquip,onUpgrade,onUse,onNewGame,onPause,onEnter,onSound});this.filter='all';this.page=0;this.picked=null;this.game=null;this.selected=null;this.portraitId=null;
  document.querySelectorAll('[data-bag-filter]').forEach(button=>button.onclick=()=>{this.filter=button.dataset.bagFilter;this.page=0;this.renderBag();});
  $('bag-prev').onclick=()=>{if(this.page>0){this.page--;this.renderBag();}};$('bag-next').onclick=()=>{this.page++;this.renderBag();};$('inspect-close').onclick=()=>{this.picked=null;this.renderInspector();this.renderBag();};
  for(const slot of document.querySelectorAll('[data-slot]')){
   slot.addEventListener('dragover',event=>{if(!this.game.canManage())return;event.preventDefault();slot.classList.add('drop-ready');});
   slot.addEventListener('dragleave',()=>slot.classList.remove('drop-ready'));
   slot.addEventListener('drop',event=>{event.preventDefault();slot.classList.remove('drop-ready');const id=event.dataTransfer.getData('text/plain');if(!this.game.canManage())return;if(GEAR[id]?.slot!==slot.dataset.slot){this.toast('이 장비를 놓을 수 있는 칸이 아닙니다.');return;}if(this.game.loadout[slot.dataset.slot]===id)return;this.onEquip(id);});
   slot.onclick=()=>{const id=this.game.loadout[slot.dataset.slot];if(id){this.picked=id;this.renderInspector();this.renderBag();}else this.toast('가방의 장비를 이 칸으로 끌어 놓으세요.');};
  }
  $('quick-potion').onclick=()=>{if(this.game.phase==='battle')this.onUse('hp-potion');else {this.picked='hp-potion';this.renderInspector();this.renderBag();}};
  $('quick-potion').addEventListener('dragover',event=>{if(this.game.phase==='battle'&&!this.busy){event.preventDefault();$('quick-potion').classList.add('drop-ready');}});
  $('quick-potion').addEventListener('dragleave',()=>$('quick-potion').classList.remove('drop-ready'));
  $('quick-potion').addEventListener('drop',event=>{event.preventDefault();$('quick-potion').classList.remove('drop-ready');const id=event.dataTransfer.getData('text/plain');if(CONSUMABLES[id]&&this.game.phase==='battle'&&!this.busy)this.onUse(id);});
  for(const id of ['map-button','arena-map-button'])$(id).onclick=()=>this.openMap();
  $('map-close').onclick=()=>$('world-map').close();$('world-map').addEventListener('close',()=>this.onPause(!!document.querySelector('dialog[open]')));
  $('home-button').onclick=()=>this.openTitle();$('start-game').onclick=()=>this.enter();
  $('title-new-game').onclick=()=>this.onNewGame();$('title-screen').addEventListener('cancel',event=>event.preventDefault());$('title-screen').addEventListener('close',()=>this.onPause(!!document.querySelector('dialog[open]')));
  $('sound-button').onclick=$('title-sound').onclick=()=>this.onSound();
  this.resize=new ResizeObserver(()=>this.fitArt());this.resize.observe($('arcade-shell'));this.resize.observe($('title-screen'));
 }
 fitArt(){for(const holder of document.querySelectorAll('.ui-art')){const cell=holder.querySelector('.sprite-cell');if(!cell)continue;const ratio=Number(cell.dataset.ratio),height=Math.min(holder.clientHeight,holder.clientWidth/ratio)*(holder.dataset.equipment ? .76 : 1);if(height>0){cell.style.height=height+'px';cell.style.width=height*ratio+'px';}}}
 figure(id,cls=''){return this.art(id,'ui-art '+cls);}
 openTitle(){
  if(!this.game)return;if(this.busy){this.toast('현재 동작이 끝난 뒤 열 수 있습니다.');return;}this.picked=null;$('item-inspector').hidden=true;this.onPause(true);
  const progress=this.game.story.index>0||this.game.story.line>0||!!this.game.battle;$('start-game').textContent=progress?'이어하기':'새 게임';$('title-new-game').textContent=progress?'새 게임':'이어하기';$('title-new-game').disabled=!progress;
  if(!$('title-hero').firstChild){$('title-hero').append(this.figure('dokja-coat','title-figure'));$('title-enemy-left').append(this.figure('dark-keeper','title-figure'));$('title-enemy-right').append(this.figure('demon-baron','title-figure'));}
  if(!$('title-screen').open)$('title-screen').showModal();requestAnimationFrame(()=>this.fitArt());
 }
 enter(){try{sessionStorage.setItem('pinn.readers-record.ui.started','true');}catch{}$('title-screen').close();this.onPause(false);this.onEnter();}
 initialTitle(){let started=false;try{started=sessionStorage.getItem('pinn.readers-record.ui.started')==='true';}catch{}if(!started)this.openTitle();}
 openMap(){if(!this.game||this.busy){this.toast('현재 동작이 끝난 뒤 열 수 있습니다.');return;}this.onPause(true);if(!$('world-map').open)$('world-map').showModal();}
 setSound(enabled){for(const id of ['sound-button','title-sound']){$(id).setAttribute('aria-pressed',String(enabled));$(id).setAttribute('aria-label',enabled?'효과음 끄기':'효과음 켜기');$(id).style.filter=enabled?'':'saturate(.65)';}}
 quantity(id){return this.game.battle?.supplies[id]??this.game.bag[id]??0;}
 render(game,selected,busy=false,target=null){this.game=game;this.selected=selected;this.target=target;this.busy=busy;$('arcade-shell').dataset.phase=game.phase;this.renderEquipment();this.renderBag();this.renderInspector();this.renderPortrait();$('npc-idle-note').hidden=['story','battle'].includes(game.phase);requestAnimationFrame(()=>this.fitArt());}
 hero(){const current=this.game.battle?.heroes.find(h=>h.uid===this.selected)||this.game.battle?.heroes.find(h=>h.hp>0)||this.game.battle?.heroes[0];if(current)return current;const id=this.game.viewScene?.cast.find(id=>HEROES[id])||'dokja-coat';return {...statsFor(id,this.game.viewScene?.order||153,this.game.loadout,this.game.upgrades),hp:null,mp:null};}
 renderEquipment(){
  if(!this.game)return;const hero=this.hero(),id=this.appearance(hero.id),body=$('equip-avatar');if(body.dataset.entity!==id){body.dataset.entity=id;body.replaceChildren(this.figure(id,'equip-figure'));}
  $('hud-name').textContent=hero.name;$('hud-hp').textContent=hero.hp??hero.maxHp;$('hud-hp').title=(hero.hp??hero.maxHp)+' / '+hero.maxHp;$('hud-attack').textContent=hero.atk;$('hud-defense').textContent=hero.def;$('hud-mp').textContent=hero.mp??hero.maxMp;
  const enemy=this.game.battle?.enemies.find(e=>e.uid===this.target)||this.game.battle?.enemies.find(e=>e.hp>0)||this.game.battle?.enemies[0];$('battle-hud').hidden=!enemy;if(enemy){$('hud-hero-name').textContent=hero.name;$('hud-hero-health').textContent=hero.hp+' / '+hero.maxHp;$('hud-hero-bar').style.width=hero.hp/hero.maxHp*100+'%';$('hud-target-name').textContent=this.name(enemy.id);$('hud-target-health').textContent=enemy.hp+' / '+enemy.maxHp;$('hud-target-bar').style.width=enemy.hp/enemy.maxHp*100+'%';}$('home-button').querySelector('use').setAttribute('href',this.game.battle?'#i-pause':'#i-home');$('home-button').setAttribute('aria-label',this.game.battle?'일시정지 메뉴':'타이틀 화면');
  const xp=this.game.story.index%6*20;$('xp-label').textContent=xp+' / 120';$('xp-fill').style.width=xp/120*100+'%';
  for(const slot of document.querySelectorAll('[data-slot]')){const id=this.game.loadout[slot.dataset.slot];slot.querySelector('.item-art')?.remove();if(id)slot.append(this.figure(id,'item-art'));slot.title=id?this.name(id)+' · '+this.describe(id):({weapon:'무기',armor:'방어구',charm:'보조 장비'}[slot.dataset.slot])+' · 장비를 끌어 놓으세요';slot.disabled=this.busy;}
  const potions=this.game.battle?.supplies['hp-potion']??this.game.bag['hp-potion']??0;$('quick-potion-count').textContent=potions;$('quick-potion').disabled=this.busy||potions===0;$('quick-potion').querySelector('.item-art')?.remove();if(potions>0)$('quick-potion').append(this.figure('hp-potion','item-art'));
 }
 renderBag(){
  if(!this.game)return;const items=Object.keys(this.game.bag).map(id=>[id,this.quantity(id)]).filter(([id,amount])=>amount>0&&(this.filter==='all'||this.filter==='gear'&&GEAR[id]||this.filter==='items'&&CONSUMABLES[id]));
  const pages=Math.max(1,Math.ceil(items.length/12));this.page=Math.max(0,Math.min(pages-1,this.page));$('bag-page').textContent=(this.page+1)+' / '+pages;$('bag-prev').disabled=this.page===0;$('bag-next').disabled=this.page===pages-1;
  $('bag-grid').replaceChildren();document.querySelectorAll('[data-bag-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bagFilter===this.filter)));
  for(let i=0;i<12;i++){
   const entry=items[this.page*12+i],cell=n('button','bag-cell'+(!entry?' empty':''));cell.dataset.bagSlot=i;
   if(entry){const [id,count]=entry;cell.dataset.item=id;cell.setAttribute('aria-label',this.name(id)+' · '+count+'개');cell.title=this.name(id)+'\n'+this.describe(id);cell.setAttribute('aria-pressed',String(this.picked===id));cell.append(this.figure(id,'item-art'));if(count>1)cell.append(n('span','bag-count',count));if(this.game.upgrades[id])cell.append(n('span','bag-enhance','+'+this.game.upgrades[id]));if(Object.values(this.game.loadout).includes(id))cell.append(n('span','bag-equipped','◆'));
    cell.draggable=!this.busy&&(!!GEAR[id]&&this.game.canManage()||!!CONSUMABLES[id]&&this.game.phase==='battle');cell.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/plain',id);event.dataTransfer.effectAllowed='move';});cell.onclick=()=>{this.picked=this.picked===id?null:id;this.renderInspector();this.renderBag();requestAnimationFrame(()=>this.fitArt());};
   }else{cell.disabled=true;cell.setAttribute('aria-label','빈 가방 칸');}$('bag-grid').append(cell);
  }
 }
 renderInspector(){
  const id=this.picked;if(!id||!(this.quantity(id)>0)){$('item-inspector').hidden=true;return;}$('item-inspector').hidden=false;$('inspect-art').replaceChildren(this.figure(id,'item-art'));$('inspect-name').textContent=this.name(id);$('inspect-description').textContent=this.describe(id);$('inspect-count').textContent='보유 '+this.quantity(id)+'개'+(this.game.upgrades[id]?' · 강화 +'+this.game.upgrades[id]:'');$('inspect-actions').replaceChildren();
  if(GEAR[id]){const equipped=Object.values(this.game.loadout).includes(id),equip=n('button','gem-button',equipped?'장착 해제':'장착');equip.id='quick-equip';equip.disabled=!this.game.canManage()||this.busy;equip.onclick=()=>this.onEquip(id);const upgrade=n('button','gem-button',(this.game.upgrades[id]||0)>=5?'최대 강화':'강화 · '+this.game.upgradeCost(id));upgrade.id='quick-upgrade';upgrade.disabled=!this.game.canManage()||this.busy||(this.game.upgrades[id]||0)>=5||this.game.coins<this.game.upgradeCost(id);upgrade.onclick=()=>this.onUpgrade(id);$('inspect-actions').append(equip,upgrade);}
  else if(CONSUMABLES[id]){const use=n('button','gem-button','사용');use.id='quick-use';use.disabled=this.game.phase!=='battle'||this.busy||!(this.game.battle?.supplies[id]>0);use.onclick=()=>{this.picked=null;this.renderInspector();this.onUse(id);};$('inspect-actions').append(use);if(this.game.phase!=='battle')$('inspect-actions').append(n('small','','전투 중 사용할 수 있습니다.'));}
  else $('inspect-actions').append(n('small','','이야기의 진행에 따라 사용됩니다.'));
 }
 renderPortrait(speaker=null){
  if(!this.game)return;const line=this.game.viewScene?.lines[this.game.displayLine];speaker||=this.game.phase==='battle'?this.hero().name:line?.speaker||'비형';const cast=this.game.viewScene?.cast||[];const id=cast.find(id=>this.name(id).startsWith(speaker))||(this.game.phase==='battle'?this.hero().id:'bihyung');if(id===this.portraitId)return;this.portraitId=id;$('npc-art').replaceChildren(this.figure(id,'portrait-art'));$('npc-name').textContent=speaker==='기록'?'비형 · 이야기의 안내자':speaker;
 }
 destroy(){this.resize.disconnect();}
}
