import {StorySession} from '../../story/runtime/engine.js';
import {Battle} from './battle.js';
import {ENCOUNTERS,GEAR,CONSUMABLES,SHOP} from '../data.js';
import {STORY_BEATS,MAIN_BATTLE_COUNT,beatAt,beatView} from '../story-beats.js';
export const GAME_SAVE_KEY='pinn.readers-record.game.v1';
const count=n=>Number.isFinite(n)?Math.max(0,Math.min(9999,Math.floor(n))):0;
export class GameSession{
 constructor(campaign,saved=null,{compact=saved?.compact===1}={}){
  this.compact=compact;this.beats=STORY_BEATS;this.mainBattleCount=MAIN_BATTLE_COUNT;
  this.campaign=campaign;this.story=new StorySession(campaign,saved?.schema===1?saved.story:null);this.coins=80;this.bag={'hp-potion':3,'mp-potion':2};this.loadout={};this.upgrades={};this.phase=this.story.finished?'ending':'story';this.battle=null;this.pending=null;this.lastReward=null;this.battlesWon=0;
  if(saved?.schema!==1){if(this.compact)this.prepareBeat();return;}
  this.coins=Number.isFinite(saved.coins)?Math.max(0,Math.min(1e9,Math.floor(saved.coins))):80;this.battlesWon=Math.min(count(saved.battlesWon),Object.keys(ENCOUNTERS).length);
  for(const [id,n] of Object.entries(saved.bag||{}))if(GEAR[id]||CONSUMABLES[id]||this.story.state.items[id]?.status==='recorded')this.bag[id]=count(n);
  for(const [id,n] of Object.entries(saved.upgrades||{}))if(GEAR[id]&&this.bag[id])this.upgrades[id]=Math.min(5,count(n));
  for(const [slot,id] of Object.entries(saved.loadout||{}))if(GEAR[id]?.slot===slot&&this.bag[id])this.loadout[slot]=id;
  const scene=this.story.scene;
  if(scene&&['battle','reward','defeat'].includes(saved.phase)&&scene.choices.some(c=>c.id===saved.pending&&c.kind==='advance')&&ENCOUNTERS[scene.id]){
   this.pending=saved.pending;this.makeBattle();this.battle.restore(saved.battle?.actions);this.phase=this.battle.result==='victory'?'reward':this.battle.result==='defeat'?'defeat':'battle';
   if(this.phase==='reward')this.lastReward=this.rewardFor(scene);
  }
  if(this.compact){if(this.phase==='reward')this.lastReward=this.beatReward();else if(this.phase==='story')this.prepareBeat();}
 }
 get scene(){return this.story.scene;}
 get encounter(){return ENCOUNTERS[this.scene?.id]||null;}
 get complete(){return this.story.finished;}
 get beat(){return beatAt(this.story.index);}
 get progress(){return this.compact?this.beats.filter(b=>b.last<=this.story.index).length:this.story.index;}
 get total(){return this.compact?this.beats.length:this.campaign.scenes.length;}
 get ready(){return this.compact?this.phase==='story':this.story.ready;}
 get displayLine(){return this.compact?0:this.story.line;}
 get viewScene(){if(!this.compact)return this.scene;if(this.complete)return null;const view=beatView(this.campaign,this.beat);if(this.beat.encounter&&this.scene.order>this.beat.encounter){view.lines=[{speaker:'시나리오',text:this.beat.result}];view.choices[0].label='다음 사건';}return view;}
 nextLine(){return !this.compact&&this.phase==='story'&&this.story.nextLine();}
 readScene(){if(this.phase!=='story'||!this.scene)return false;if(!this.compact)this.story.line=this.scene.lines.length-1;return true;}
 rewardFor(scene,combat=!!ENCOUNTERS[scene.id]){return {coins:combat?65+scene.order*3:8+Math.floor(scene.order/4),items:[...(scene.effects?.grant||[])],potions:combat&&this.battlesWon%3===0?1:0};}
 choose(id){if(this.phase!=='story')return null;if(this.compact)return this.chooseBeat(id);const choice=this.story.choose(id);if(!choice||choice.kind!=='advance')return choice;this.pending=id;if(this.encounter){this.makeBattle();this.phase='battle';}else this.completeScene();return choice;}
 skipSource(){const choice=this.scene?.choices.find(c=>c.kind==='advance');if(!choice)throw Error('Cannot continue source story');this.story.line=this.scene.lines.length-1;this.story.choose(choice.id);this.pending=choice.id;if(!this.commitCurrent(false))throw Error('Source story dependency failed');}
 prepareBeat(){if(this.complete||this.phase!=='story')return;const focus=this.beat.encounter;if(focus)while(this.scene&&this.scene.order<focus)this.skipSource();}
 chooseBeat(id){const choice=this.viewScene?.choices.find(c=>c.id===id);if(!choice)return null;const beat=this.beat;if(beat.encounter&&this.scene.order<=beat.encounter){this.prepareBeat();this.story.line=this.scene.lines.length-1;const actual=this.scene.choices.find(c=>c.kind==='advance');this.story.choose(actual.id);this.pending=actual.id;this.makeBattle();this.phase='battle';}else{while(this.scene&&this.scene.order<=beat.last)this.skipSource();this.prepareBeat();}return choice;}
 beatReward(){if(!this.scene)return null;const beat=this.beat;if(this.scene.order<(beat.encounter||0))return this.rewardFor(this.scene);const items=new Set();let coins=0,potions=0;for(let i=this.story.index;i<beat.last;i++){const scene=this.campaign.scenes[i],reward=this.rewardFor(scene,i===this.story.index);coins+=reward.coins;potions+=reward.potions;for(const id of reward.items)items.add(id);for(const id of scene.effects?.consume||[])items.delete(id);}return {coins,items:[...items],potions};}
 makeBattle(){this.battle=new Battle(this.encounter,{order:this.scene.order,loadout:this.loadout,upgrades:this.upgrades,supplies:Object.fromEntries(Object.keys(CONSUMABLES).map(id=>[id,this.bag[id]||0])),judgmentFire:!!this.story.state.flags.uriel_descended||this.scene.order>=147});}
 syncBattle(){if(!this.battle?.result)return;this.phase=this.battle.result==='victory'?'reward':'defeat';if(this.phase==='reward')this.lastReward=this.compact?this.beatReward():this.rewardFor(this.scene);}
 command(action){if(this.phase!=='battle')return false;const accepted=this.battle.act(action);this.syncBattle();return accepted;}
 enemyTurn(){if(this.phase!=='battle')return false;const accepted=this.battle.enemyTurn();this.syncBattle();return accepted;}
 retry(){if(this.phase!=='defeat')return false;this.makeBattle();this.phase='battle';return true;}
 completeScene(){
  if(!['story','reward'].includes(this.phase)||!this.pending||!this.scene)return false;
  if(this.encounter&&this.phase!=='reward')return false;
  if(!this.compact)return this.commitCurrent(!!this.battle);
  if(this.phase!=='reward')return false;const beat=this.beat,order=this.scene.order,reward=this.lastReward;if(!this.commitCurrent(true))return false;
  if(order>=(beat.encounter||0))while(this.scene&&this.scene.order<=beat.last)this.skipSource();this.prepareBeat();this.lastReward=reward;return true;
 }
 commitCurrent(combat){
  const reward=this.rewardFor(this.scene,combat),oldConsumed=this.scene.effects?.consume||[];
  this.story.pending={scene:this.scene.id,choice:this.pending};if(!this.story.commit())return false;
  if(combat&&this.battle){for(const id of Object.keys(CONSUMABLES))this.bag[id]=this.battle.supplies[id]||0;this.battlesWon++;}
  this.coins+=reward.coins;for(const id of reward.items)this.bag[id]=(this.bag[id]||0)+1;
  for(const id of oldConsumed){delete this.bag[id];for(const [slot,equipped] of Object.entries(this.loadout))if(equipped===id)delete this.loadout[slot];}
  if(reward.potions)this.bag['hp-potion']=(this.bag['hp-potion']||0)+1;
  this.lastReward=reward;this.pending=null;this.battle=null;this.phase=this.complete?'ending':'story';return true;
 }
 canManage(){return ['story','ending'].includes(this.phase);}
 buy(id){if(!this.canManage()||!SHOP.includes(id))return false;const price=(CONSUMABLES[id]||GEAR[id]).price;if(this.coins<price||GEAR[id]&&this.bag[id])return false;this.coins-=price;this.bag[id]=(this.bag[id]||0)+1;return true;}
 equip(id){if(!this.canManage()||!this.bag[id]||!GEAR[id])return false;const slot=GEAR[id].slot;this.loadout[slot]=this.loadout[slot]===id?null:id;return true;}
 upgradeCost(id){return 70+45*(this.upgrades[id]||0);}
 upgrade(id){if(!this.canManage()||!this.bag[id]||!GEAR[id]||(this.upgrades[id]||0)>=5||this.coins<this.upgradeCost(id))return false;this.coins-=this.upgradeCost(id);this.upgrades[id]=(this.upgrades[id]||0)+1;return true;}
 save(){return {schema:1,...(this.compact?{compact:1}:{}),story:this.story.save(),coins:this.coins,bag:{...this.bag},loadout:{...this.loadout},upgrades:{...this.upgrades},battlesWon:this.battlesWon,phase:this.phase,pending:this.pending,battle:this.battle?.save()||null};}
}
