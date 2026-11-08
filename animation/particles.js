import {EFFECTS,seededRandom} from './library.js';
export const PARTICLE_LIMITS=Object.freeze({low:80,balanced:180,high:300});
const TAU=Math.PI*2;
export function createParticles(effect,options={}) {
 if(!EFFECTS[effect])throw new Error(`Unknown effect: ${effect}`);
 const {x=.5,y=.55,seed=1,quality='balanced'}=options,r=seededRandom(seed),type=EFFECTS[effect].shape;
 const count=Math.min(PARTICLE_LIMITS[quality]||180,type==='spring'?65:type==='flame'?42:type==='swarm'?25:30);
 return Array.from({length:count},(_,i)=>{
  const angle=r()*TAU,speed=.04+r()*.18;
  let vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed*.8,gravity=.16,shape='spark',life=.42+r()*.75;
  if(['flame','judgment'].includes(type)){vy=-.08-r()*.2;vx=(r()-.5)*.12;gravity=-.04;shape='ember';life=.5+r()*.65;}
  if(type==='frost'){shape='shard';gravity=.13;}
  if(type==='heal'){vx=(r()-.5)*.09;vy=-.08-r()*.1;gravity=-.03;shape='cross';life=.6+r()*.6;}
  if(type==='pages'){shape='page';vy=-.06-r()*.15;gravity=-.02;life=.8+r()*.5;}
  if(type==='swarm'){shape='bug';gravity=0;life=.8+r()*.45;}
  if(type==='spring'){shape='petal';vx=-.04+r()*.14;vy=-.03-r()*.17;gravity=.035;life=1+r()*.6;}
  if(['poison','soul','pickup'].includes(type)){shape=type==='pickup'?'diamond':'mote';vy=-.03-r()*.18;gravity=type==='soul'?-.02:.06;}
  if(['impact','craft','shot'].includes(type))gravity=.3;
  return {x,y,vx,vy,gravity,life,age:0,size:2+r()*4,rotation:r()*TAU,spin:(r()-.5)*5,color:EFFECTS[effect].color,shape,phase:r()*TAU,index:i};
 });
}
export function stepParticles(particles,dt) {
 const delta=Math.max(0,Math.min(dt,.05));
 return particles.filter(p=>p.age+delta<p.life).map(p=>({...p,age:p.age+delta,x:p.x+p.vx*delta,y:p.y+p.vy*delta,vy:p.vy+p.gravity*delta,rotation:p.rotation+p.spin*delta}));
}
export class ParticleStage {
 constructor(host,{quality='balanced',enabled=true}={}) {
  this.host=host;this.quality=quality;this.enabled=enabled;this.paused=false;this.destroyed=false;this.particles=[];this.bursts=[];this.raf=0;this.last=0;this.sequence=0;this.speed=1;
  this.canvas=document.createElement('canvas');this.canvas.className='motion-canvas';this.canvas.setAttribute('aria-hidden','true');host.append(this.canvas);this.ctx=this.canvas.getContext('2d');
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
 }
 resize(){const r=this.host.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);const d=Math.min(window.devicePixelRatio||1,2);this.dpr=d;this.canvas.width=Math.round(this.width*d);this.canvas.height=Math.round(this.height*d);this.draw();}
 emit(effect,options={}) {
  if(!EFFECTS[effect])throw new Error(`Unknown effect: ${effect}`);
  if(this.destroyed||!this.enabled||this.paused||!this.ctx)return false;
  const opts={x:.5,y:.55,sourceX:.25,sourceY:.58,scale:1,...options};opts.seed??=++this.sequence;
  const max=PARTICLE_LIMITS[this.quality]||180,newParticles=createParticles(effect,{...opts,quality:this.quality});
  this.particles.push(...newParticles);this.particles=this.particles.slice(-max);
  this.bursts.push({effect,...opts,age:0,life:effect==='spring'?1.7:1.25});this.bursts=this.bursts.slice(-6);this.wake();return true;
 }
 wake(){if(!this.raf&&this.enabled&&!this.paused&&!this.destroyed){this.last=performance.now();this.raf=requestAnimationFrame(t=>this.tick(t));}}
 tick(now){this.raf=0;if(this.destroyed||!this.enabled||this.paused)return;const dt=Math.min((now-this.last)/1000,.05)*this.speed;this.last=now;
  this.particles=stepParticles(this.particles,dt);this.bursts=this.bursts.map(b=>({...b,age:b.age+dt})).filter(b=>b.age<b.life);this.draw();
  if(this.particles.length||this.bursts.length)this.raf=requestAnimationFrame(t=>this.tick(t));
 }
 draw(){const c=this.ctx;if(!c)return;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);if(!this.enabled)return;
  for(const b of this.bursts)this.drawBurst(c,b);
  const scale=Math.min(this.width,this.height)/460;
  for(const p of this.particles){const t=p.age/p.life,alpha=Math.min(1,p.age*18)*(1-t);c.save();c.translate(p.x*this.width,p.y*this.height);c.rotate(p.rotation);c.scale(scale,scale);c.globalAlpha=alpha;c.fillStyle=p.color;c.strokeStyle='#10202ac0';c.lineWidth=1;
   const z=p.size*(p.shape==='ember'?1-t*.65:1);
   c.beginPath();
   switch(p.shape){
   case 'cross':c.rect(-z,-1,z*2,2);c.rect(-1,-z,2,z*2);break;
   case 'shard':c.moveTo(0,-z*2);c.lineTo(z*.6,z);c.lineTo(-z*.5,z*.4);c.closePath();break;
   case 'diamond':c.moveTo(0,-z*1.4);c.lineTo(z,0);c.lineTo(0,z*1.4);c.lineTo(-z,0);c.closePath();break;
   case 'petal':c.ellipse(0,0,z*.6,z*1.5,.2,0,TAU);break;
   case 'page':c.rect(-z,-z*1.5,z*1.6,z*2.2);break;
   case 'bug':{const flutter=Math.sin(p.age*50+p.phase);c.ellipse(-z*.65,0,z*.65,z*.3+Math.abs(flutter)*z*.5,0,0,TAU);c.ellipse(z*.65,0,z*.65,z*.3+Math.abs(flutter)*z*.5,0,0,TAU);break;}
   case 'spark':c.rect(-z*1.5,-.9,z*3,1.8);break;
   default:c.ellipse(0,0,z*.5,z,0,0,TAU);
   }
   c.fill();if(['page','shard','petal'].includes(p.shape))c.stroke();c.restore();
  }
 }
 drawBurst(c,b){const info=EFFECTS[b.effect],t=b.age/b.life,fade=Math.max(0,1-t),s=Math.min(this.width,this.height)/460*b.scale;
  c.save();c.translate(b.x*this.width,b.y*this.height);c.scale(s,s);c.globalAlpha=Math.min(1,b.age*15)*fade;c.lineCap='round';c.lineJoin='round';c.strokeStyle=info.color;c.fillStyle=info.color;c.lineWidth=2;
  const ink=(path,width=3)=>{c.beginPath();path();c.strokeStyle='#14202a';c.lineWidth=width+3;c.stroke();c.strokeStyle=info.color;c.lineWidth=width;c.stroke();};
  const ring=(radius,sy=1)=>{c.save();c.scale(1,sy);c.beginPath();c.arc(0,0,radius,0,TAU);c.stroke();c.restore();};
  switch(info.shape){
  case 'slash':{
   c.rotate(-.65+t*.7);const reach=52+Math.sin(Math.min(1,t*2)*Math.PI*.65)*72;
   c.beginPath();c.moveTo(-reach,-50);c.quadraticCurveTo(reach*1.15,-35,reach,48);c.quadraticCurveTo(reach*.3,-6,-reach,-50);c.fill();
   ink(()=>{c.moveTo(-reach,-57);c.quadraticCurveTo(reach*1.2,-48,reach+7,40);},2);
   if(t<.5){c.globalAlpha*=.8;ink(()=>{c.moveTo(-40,20);c.lineTo(38,-16);},4);}break;}
  case 'judgment':
  case 'flame':{
   const n=info.shape==='judgment'?9:7;
   for(let i=0;i<n;i++){const x=(i-(n-1)/2)*15,h=(45+Math.sin(i*2.3)*18)*(Math.sin(t*Math.PI)*.65+.6);
    c.globalAlpha=fade*(.45+(i%2)*.25);c.beginPath();c.moveTo(x-13,35);c.bezierCurveTo(x-30,0,x+14,-h*.5,x-3,-h);c.bezierCurveTo(x+36,-h*.3,x+8,14,x+17,35);c.fill();
   }
   if(info.shape==='judgment'){ink(()=>{c.moveTo(0,-95);c.lineTo(0,48);c.moveTo(-30,-55);c.lineTo(30,-55);},4);ring(65+t*30,.35);}break;}
  case 'frost':{
   for(let i=0;i<7;i++){const a=i/7*TAU;c.save();c.rotate(a);ink(()=>{c.moveTo(0,-12);c.lineTo(0,-65-t*35);c.moveTo(-9,-40);c.lineTo(0,-51);c.lineTo(9,-40);},2);c.restore();}ring(30+t*50);break;}
  case 'lightning':{
   const r=seededRandom(b.seed);for(let j=0;j<3;j++){ink(()=>{c.moveTo(-65+j*40,-100);for(let i=1;i<9;i++)c.lineTo((r()-.5)*60+j*30-30,-100+i*24);},j===0?4:2);}ring(28+t*55,.3);break;}
  case 'shield':{
   c.save();c.scale(1,1.22);ink(()=>{c.moveTo(0,-72);c.lineTo(54,-48);c.lineTo(45,22);c.quadraticCurveTo(32,50,0,68);c.quadraticCurveTo(-32,50,-45,22);c.lineTo(-54,-48);c.closePath();},3);
   c.globalAlpha*=.16;c.fill();c.restore();ink(()=>{c.moveTo(0,-42);c.lineTo(0,40);c.moveTo(-28,-6);c.lineTo(28,-6);},2);break;}
  case 'heal':{
   ring(40+t*42,.28);ink(()=>{c.moveTo(0,-45);c.lineTo(0,-12);c.moveTo(-16,-28);c.lineTo(16,-28);},5);
   for(let i=0;i<3;i++){c.save();c.rotate(i*TAU/3+t);c.beginPath();c.arc(0,0,55+t*20,.2,1.4);c.stroke();c.restore();}break;}
  case 'poison':{
   for(let i=0;i<6;i++){c.beginPath();c.ellipse(Math.sin(i*5)*46,20-Math.cos(i*2)*22-t*30,15+t*12,20+t*8,0,0,TAU);c.globalAlpha=fade*.2;c.fill();}c.globalAlpha=fade;ring(20+t*45,.3);break;}
  case 'thread':{
   const radius=45+t*38;for(let i=0;i<9;i++){const a=i*TAU/9;ink(()=>{c.moveTo(0,0);c.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);},1.3);}for(const n of [.35,.65,1]){c.beginPath();for(let i=0;i<=9;i++){const a=i*TAU/9;c.lineTo(Math.cos(a)*radius*n,Math.sin(a)*radius*n);}c.stroke();}break;}
  case 'swarm':{ring(30+t*50,.4);for(let i=0;i<3;i++){c.save();c.rotate(t*3+i*TAU/3);ink(()=>{c.moveTo(35,0);c.quadraticCurveTo(65,-35,20,-50);},1.5);c.restore();}break;}
  case 'water':{
   for(let i=0;i<4;i++){ink(()=>{c.moveTo(-100,30+i*10);for(let j=0;j<=12;j++){const x=-100+j*17;c.lineTo(x,Math.sin(j*.65-t*8+i*.8)*17+20+i*10);}},3-i*.4);}break;}
  case 'shot':{
   const dx=(b.sourceX-b.x)*this.width/s,dy=(b.sourceY-b.y)*this.height/s,travel=Math.min(1,b.age/.22);
   ink(()=>{c.moveTo(dx*(1-travel),dy*(1-travel));c.lineTo(dx*(1-travel)+dx*.14,dy*(1-travel)+dy*.14);},5);
   if(travel===1){ring(8+t*37);ink(()=>{c.moveTo(-24,-24);c.lineTo(24,24);c.moveTo(-24,24);c.lineTo(24,-24);},2);}break;}
  case 'impact':case 'craft':{
   const r=seededRandom(b.seed);for(let i=0;i<9;i++){const a=i*TAU/9,rad=32+r()*35+t*25;ink(()=>{c.moveTo(Math.cos(a)*12,Math.sin(a)*12);c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);},i%2?2:4);}if(info.shape==='craft')ring(55+t*20,.3);break;}
  case 'seal':case 'summon':case 'portal':{
   c.save();c.rotate(t*(info.shape==='portal'?1.6:.3));ring(55+t*20,info.shape==='summon'?.45:1.2);ring(45+t*20,info.shape==='summon'?.45:1.2);
   for(let i=0;i<8;i++){c.save();c.rotate(i*TAU/8);ink(()=>{c.moveTo(0,-68);c.lineTo(0,-76);c.moveTo(-4,-72);c.lineTo(4,-72);},2);c.restore();}c.restore();
   if(info.shape==='summon'){ink(()=>{c.moveTo(-24,12);c.lineTo(0,-32);c.lineTo(24,12);c.closePath();},2);}break;}
  case 'pages':{
   for(let i=0;i<4;i++){c.save();c.translate((i-1.5)*26,Math.sin(t*5+i)*12-30);c.rotate((i-1.5)*.2);c.fillStyle='#e5e8dd';c.fillRect(-12,-20,24,32);c.strokeStyle='#4f6d7a';c.strokeRect(-12,-20,24,32);for(let j=0;j<3;j++){c.beginPath();c.moveTo(-7,-12+j*7);c.lineTo(7,-12+j*7);c.stroke();}c.restore();}break;}
  case 'soul':{
   c.globalAlpha=fade*.2;c.beginPath();c.ellipse(0,-30,28+t*20,52+t*15,0,0,TAU);c.fill();c.globalAlpha=fade;ring(22+t*20,.45);c.beginPath();c.ellipse(0,-30-t*15,8,14,0,0,TAU);c.fill();break;}
  case 'pickup':{
   c.save();c.rotate(t*1.6);for(let i=0;i<6;i++){c.save();c.rotate(i*TAU/6);ink(()=>{c.moveTo(0,-27-t*20);c.lineTo(0,-45-t*25);},2);c.restore();}c.restore();ring(26+t*40,.4);break;}
  case 'spring':{
   const radius=60+t*95;ring(radius,.25);c.save();c.rotate(t*.4);for(let i=0;i<9;i++){const a=i*TAU/9;c.beginPath();c.ellipse(Math.cos(a)*radius,Math.sin(a)*radius*.6,7,18,a,0,TAU);c.fill();}c.restore();break;}
  }
  c.restore();
 }
 setQuality(q){if(!PARTICLE_LIMITS[q])return;this.quality=q;this.particles=this.particles.slice(-PARTICLE_LIMITS[q]);}
 setEnabled(enabled){this.enabled=!!enabled;if(!enabled)this.clear();}
 setPaused(paused){this.paused=!!paused;if(paused){cancelAnimationFrame(this.raf);this.raf=0;}else if(this.particles.length||this.bursts.length)this.wake();}
 clear(){cancelAnimationFrame(this.raf);this.raf=0;this.particles=[];this.bursts=[];this.draw();}
 destroy(){this.clear();this.destroyed=true;this.resizeObserver.disconnect();this.canvas.remove();}
}
