import {HEROES,GEAR,CONSUMABLES,levelFor} from '../data.js';
export function statsFor(id,order,loadout={},upgrades={}){
 const base=HEROES[id],level=levelFor(order),scale=1+(level-1)*.12,bonus={atk:0,def:0,hp:0,mp:0};
 for(const item of Object.values(loadout)){const g=GEAR[item];if(!g)continue;const factor=1+(upgrades[item]||0)*.22;for(const key of Object.keys(bonus))bonus[key]+=(g[key]||0)*factor;}
 return {...base,id,level,maxHp:Math.round((base.hp+bonus.hp)*scale),maxMp:Math.round(base.mp+bonus.mp),atk:Math.round((base.atk+bonus.atk)*scale),def:Math.round((base.def+bonus.def)*scale)};
}
export class Battle {
 constructor(config,{order=1,loadout={},upgrades={},supplies={},judgmentFire=false}={}){
  this.config=config;this.order=order;this.round=1;this.turn='heroes';this.result=null;this.actions=[];this.events=[];this.judgmentFire=judgmentFire;
  this.initialSupplies={...supplies};this.supplies={...supplies};
  this.heroes=config.heroes.map((id,i)=>{const s=statsFor(id,order,loadout,upgrades);return {...s,uid:'h'+i,hp:s.maxHp,mp:s.maxMp,guard:0,buff:0,acted:false};});
  const h=this.heroes,base=h.map(x=>statsFor(x.id,order)),atk=base.reduce((v,x)=>v+x.atk,0)/h.length,hp=base.reduce((v,x)=>v+x.maxHp,0)/h.length,scale=1+(levelFor(order)-1)*.12;
  this.enemies=config.enemies.map((id,i)=>{const maxHp=Math.round(atk*h.length*(config.mode==='survive'?12:config.boss?5.5:4.6)/config.enemies.length);return {id,uid:'e'+i,hp:maxHp,maxHp,atk:Math.round(hp*.18*h.length/config.enemies.length),def:Math.round(3*scale),guard:0,exposed:0,intent:i%3===0?'heavy':'attack'};});
 }
 get active(){return this.heroes.find(h=>h.hp>0&&!h.acted)||null;}
 emit(kind,actor,target,amount=0,effect=null){this.events.push({kind,actor,target,amount,effect});}
 damage(actor,target,mult=1,pierce=false,effect='slash'){
  const power=(actor.atk+(actor.buff||0))*mult*(target.exposed?1.25:1),amount=Math.max(1,Math.round((power-(pierce?0:target.def))*(target.guard?.45:1)));
  target.hp=Math.max(0,target.hp-amount);this.emit('damage',actor.uid,target.uid,amount,effect);
  if(!target.hp)this.emit('down',actor.uid,target.uid);return amount;
 }
 act(command,{replay=false}={}){
  if(this.result||this.turn!=='heroes')return false;
  const actor=this.heroes.find(h=>h.uid===command.actor)||this.active;if(!actor||actor.hp<=0||actor.acted)return false;
  const target=this.enemies.find(e=>e.uid===command.target&&e.hp>0)||this.enemies.find(e=>e.hp>0);
  if(!['attack','skill','guard','item'].includes(command.type))return false;
  if(command.type==='skill'&&actor.mp<actor.cost)return false;
  const item=CONSUMABLES[command.item];if(command.type==='item'&&(!item||!(this.supplies[command.item]>0)))return false;
  this.events=[];this.actions.push({...command,actor:actor.uid,target:target?.uid});
  if(command.type==='attack')this.damage(actor,target,1,false,'slash');
  if(command.type==='guard'){actor.guard=1;actor.mp=Math.min(actor.maxMp,actor.mp+5);this.emit('guard',actor.uid,actor.uid,0,'shield');}
  if(command.type==='skill'){
   actor.mp-=actor.cost;
   const effect=actor.id.startsWith('heewon')&&this.judgmentFire?'judgment':actor.effect;
   if(actor.type==='heal')for(const h of this.heroes.filter(h=>h.hp>0)){const amount=Math.min(h.maxHp-h.hp,Math.round(h.maxHp*.34));h.hp+=amount;this.emit('heal',actor.uid,h.uid,amount,'heal');}
   else if(actor.type==='shield')for(const h of this.heroes.filter(h=>h.hp>0)){h.guard=1;this.emit('guard',actor.uid,h.uid,0,'shield');}
   else if(actor.type==='area')for(const enemy of this.enemies.filter(e=>e.hp>0))this.damage(actor,enemy,1.45,false,effect);
   else {this.damage(actor,target,actor.type==='pierce'?1.65:2.15,actor.type==='pierce',effect);if(actor.type==='pierce')target.exposed=2;}
  }
  if(command.type==='item'){
   this.supplies[command.item]--;const friend=this.heroes.find(h=>h.uid===command.ally&&h.hp>0)||actor;
   if(item.heal){const amount=Math.min(friend.maxHp-friend.hp,Math.round(friend.maxHp*item.heal));friend.hp+=amount;this.emit('heal',actor.uid,friend.uid,amount,'heal');}
   if(item.mana){const amount=Math.min(friend.maxMp-friend.mp,Math.round(friend.maxMp*item.mana));friend.mp+=amount;this.emit('mana',actor.uid,friend.uid,amount,'mana');}
   if(item.buff){friend.buff+=item.buff;this.emit('buff',actor.uid,friend.uid,item.buff,'pickup');}
  }
  actor.acted=true;
  if(this.enemies.every(e=>!e.hp)){this.result='victory';return true;}
  if(!this.active)this.turn='enemies';return true;
 }
 enemyTurn(){
  if(this.result||this.turn!=='enemies')return false;this.events=[];
  for(const [i,enemy] of this.enemies.entries()){
   if(!enemy.hp)continue;const living=this.heroes.filter(h=>h.hp>0);if(!living.length)break;
   const target=living[(this.round+i-1)%living.length];
   if(enemy.intent==='charge')this.emit('charge',enemy.uid,enemy.uid,0,'flame');
   else this.damage(enemy,target,enemy.intent==='heavy'?1.9:1,false,enemy.intent==='heavy'?'flame':'impact');
   enemy.intent=(this.round+i)%3===0?'heavy':(this.round+i)%3===2?'charge':'attack';if(enemy.exposed)enemy.exposed--;
  }
  if(this.heroes.every(h=>h.hp===0)){this.result='defeat';return true;}
  if(this.config.mode==='survive'&&this.round>=this.config.rounds){this.result='victory';return true;}
  this.round++;for(const h of this.heroes){h.acted=false;h.guard=0;h.mp=Math.min(h.maxMp,h.mp+2);}this.turn='heroes';return true;
 }
 save(){return {actions:this.actions.map(a=>({...a})),initialSupplies:{...this.initialSupplies}};}
 restore(actions=[]){for(const action of (Array.isArray(actions)?actions:[]).slice(0,2000)){if(!action||typeof action!=='object'||this.result||!this.act(action,{replay:true}))break;if(this.turn==='enemies')this.enemyTurn();}this.events=[];return this;}
}
