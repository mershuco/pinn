import {StorySession} from '../../story/runtime/engine.js';
import {Battle} from './battle.js';
import {ENCOUNTERS,GEAR,CONSUMABLES,SHOP} from '../data.js';
export const GAME_SAVE_KEY='pinn.readers-record.game.v1';
const count=n=>Number.isFinite(n)?Math.max(0,Math.min(9999,Math.floor(n))):0;
export class GameSession{
 constructor(campaign,saved=null){
  this.campaign=campaign;this.story=new StorySession(campaign,saved?.schema===1?saved.story:null);this.coins=80;this.bag={'hp-potion':3,'mp-potion':2};this.loadout={};this.upgrades={};this.phase=this.story.finished?'ending':'story';this.battle=null;this.pending=null;this.lastReward=null;this.battlesWon=0;
  if(saved?.schema!==1)return;
  this.coins=Number.isFinite(saved.coins)?Math.max(0,Math.min(1e9,Math.floor(saved.coins))):80;this.battlesWon=Math.min(count(saved.battlesWon),Object.keys(ENCOUNTERS).length);
  for(const [id,n] of Object.entries(saved.bag||{}))if(GEAR[id]||CONSUMABLES[id]||this.story.state.items[id]?.status==='recorded')this.bag[id]=count(n);
  for(const [id,n] of Object.entries(saved.upgrades||{}))if(GEAR[id]&&this.bag[id])this.upgrades[id]=Math.min(5,count(n));
  for(const [slot,id] of Object.entries(saved.loadout||{}))if(GEAR[id]?.slot===slot&&this.bag[id])this.loadout[slot]=id;
  const scene=this.story.scene;
  if(scene&&['battle','reward','defeat'].includes(saved.phase)&&scene.choices.some(c=>c.id===saved.pending&&c.kind==='advance')&&ENCOUNTERS[scene.id]){
   this.pending=saved.pending;this.makeBattle();this.battle.restore(saved.battle?.actions);this.phase=this.battle.result==='victory'?'reward':this.battle.result==='defeat'?'defeat':'battle';
   if(this.phase==='reward')this.lastReward=this.rewardFor(scene);
  }
 }
 get scene(){return this.story.scene;}
 get encounter(){return ENCOUNTERS[this.scene?.id]||null;}
 get complete(){return this.story.finished;}
 nextLine(){return this.phase==='story'&&this.story.nextLine();}
 readScene(){if(this.phase!=='story'||!this.scene)return false;this.story.line=this.scene.lines.length-1;return true;}
 rewardFor(scene){const combat=!!ENCOUNTERS[scene.id];return {coins:combat?65+scene.order*3:8+Math.floor(scene.order/4),items:[...(scene.effects?.grant||[])],potions:combat&&this.battlesWon%3===0?1:0};}
 choose(id){if(this.phase!=='story')return null;const choice=this.story.choose(id);if(!choice||choice.kind!=='advance')return choice;this.pending=id;if(this.encounter){this.makeBattle();this.phase='battle';}else this.completeScene();return choice;}
 makeBattle(){this.battle=new Battle(this.encounter,{order:this.scene.order,loadout:this.loadout,upgrades:this.upgrades,supplies:Object.fromEntries(Object.keys(CONSUMABLES).map(id=>[id,this.bag[id]||0])),judgmentFire:!!this.story.state.flags.uriel_descended||this.scene.order>=147});}
 syncBattle(){if(!this.battle?.result)return;this.phase=this.battle.result==='victory'?'reward':'defeat';if(this.phase==='reward')this.lastReward=this.rewardFor(this.scene);}
 command(action){if(this.phase!=='battle')return false;const accepted=this.battle.act(action);this.syncBattle();return accepted;}
 enemyTurn(){if(this.phase!=='battle')return false;const accepted=this.battle.enemyTurn();this.syncBattle();return accepted;}
 retry(){if(this.phase!=='defeat')return false;this.makeBattle();this.phase='battle';return true;}
 completeScene(){
  if(!['story','reward'].includes(this.phase)||!this.pending||!this.scene)return false;
  if(this.encounter&&this.phase!=='reward')return false;
  const reward=this.rewardFor(this.scene),oldConsumed=this.scene.effects?.consume||[];
  this.story.pending={scene:this.scene.id,choice:this.pending};if(!this.story.commit())return false;
  if(this.battle){for(const id of Object.keys(CONSUMABLES))this.bag[id]=this.battle.supplies[id]||0;this.battlesWon++;}
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
 save(){return {schema:1,story:this.story.save(),coins:this.coins,bag:{...this.bag},loadout:{...this.loadout},upgrades:{...this.upgrades},battlesWon:this.battlesWon,phase:this.phase,pending:this.pending,battle:this.battle?.save()||null};}
}
