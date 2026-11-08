import {ACTIONS,keyframes,effectForAction} from './library.js';
import {ParticleStage} from './particles.js';
import {WalkingClip,walkSheetFor} from './walking.js';
export const MOTION_SAVE_KEY='pinn.readers-record.motion.v1';
export function readMotionPreference() {
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 try{const p=JSON.parse(localStorage.getItem(MOTION_SAVE_KEY));if(p&&typeof p.enabled==='boolean')return {enabled:!reduced&&p.enabled,quality:['low','balanced','high'].includes(p.quality)?p.quality:'balanced'};}catch{}
 return {enabled:!reduced,quality:'balanced'};
}
export class MotionPlayer {
 constructor(host,{enabled=true,quality='balanced'}={}) {
  this.host=host;this.enabled=enabled;this.paused=false;this.speed=1;this.epoch=0;this.timers=new Set();this.clips=new Map();this.fx=new ParticleStage(host,{enabled,quality});
  host.dataset.motionEnabled=String(enabled);host.dataset.motionPaused='false';
  this.visibility=()=>this.setPaused(document.hidden||!!document.querySelector('dialog[open]'));document.addEventListener('visibilitychange',this.visibility);
 }
 point(element){if(!element)return {x:.5,y:.58};const h=this.host.getBoundingClientRect(),r=element.getBoundingClientRect();return {x:(r.left+r.width*.5-h.left)/Math.max(1,h.width),y:(r.top+r.height*.58-h.top)/Math.max(1,h.height)};}
 schedule(fn,delay){const epoch=this.epoch;const timer=setTimeout(()=>{this.timers.delete(timer);if(epoch===this.epoch&&this.enabled&&!this.paused)fn();},delay/this.speed);this.timers.add(timer);return timer;}
 play(element,action,{profile,target=null,effect=null,onImpact=null,onFinish=null,direction=1,withEffect=true,loop=false,distance=0,cycles=2}={}) {
  if(!ACTIONS[action])throw new Error(`Unknown animation: ${action}`);
  if(!this.enabled||this.paused||!element)return false;
  const cell=element.querySelector('.sprite-cell')||element;
  this.clips.get(cell)?.cancel();
  const definition=ACTIONS[action],duration=definition.duration/this.speed;
  const sheet=action==='walk'?walkSheetFor(element,profile):null;
  const clip=sheet?new WalkingClip(cell,sheet,{duration,direction,loop,distance,cycles}):cell.animate(keyframes(action,direction),{duration,easing:'cubic-bezier(.25,.65,.3,1)',fill:'forwards',iterations:action==='idle'?Infinity:1});this.clips.set(cell,clip);element.dataset.action=action;
  const token=this.epoch;
  clip.finished.then(()=>{if(token!==this.epoch||this.clips.get(cell)!==clip)return;if(clip.hold){clip.finishPose();}else if(!['fall','consume'].includes(action)){this.clips.delete(cell);clip.cancel();}element.dataset.action='idle';onFinish?.();}).catch(()=>{});
  if(definition.impact!=null&&withEffect){this.schedule(()=>{
   const where=target||element,p=this.point(where),source=this.point(element),id=effect||effectForAction(action,profile||{effect:'impact'});
   this.fx.emit(id,{...p,sourceX:source.x,sourceY:source.y});
   if(target&&target!==element&&['attack','cast'].includes(action)&&['slash','judgment','flame','blackflame','frost','lightning','shot','impact','poison'].includes(id))this.play(target,'hit',{profile,withEffect:false});onImpact?.();
  },definition.duration*definition.impact);}
  return true;
 }
 burst(effect,element){const p=this.point(element);return this.fx.emit(effect,p);}
 setEnabled(enabled){this.enabled=!!enabled;this.host.dataset.motionEnabled=String(this.enabled);this.fx.setEnabled(this.enabled);if(!enabled)this.reset();}
 setPaused(paused){this.paused=!!paused;this.host.dataset.motionPaused=String(this.paused);this.fx.setPaused(this.paused);for(const clip of this.clips.values())paused?clip.pause():clip.play();}
 setSpeed(speed){this.speed=Math.min(2,Math.max(.5,Number(speed)||1));this.fx.speed=this.speed;}
 setQuality(quality){this.fx.setQuality(quality);}
 reset(){this.epoch++;for(const t of this.timers)clearTimeout(t);this.timers.clear();for(const clip of this.clips.values())clip.cancel();this.clips.clear();this.host.querySelectorAll('[data-action]').forEach(e=>e.dataset.action='idle');this.fx.clear();}
 destroy(){this.reset();this.fx.destroy();document.removeEventListener('visibilitychange',this.visibility);}
}
