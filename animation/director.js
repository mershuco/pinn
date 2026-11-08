import {MotionPlayer} from './player.js';
import {ACTIONS} from './library.js';
import {makeSprite} from './sprites.js';
export class StoryDirector {
 constructor(host,{manifest,entities,atlases,enabled=true,quality='balanced',player=null}) {
  this.host=host;this.manifest=manifest;this.entities=entities;this.atlases=atlases;this.profiles=new Map(manifest.profiles.map(p=>[p.id,p]));this.ownsPlayer=!player;this.player=player||new MotionPlayer(host,{enabled,quality});this.position=null;this.sceneId=null;this.current=null;
  this.dialogObserver=new MutationObserver(()=>this.player.setPaused(document.hidden||!!document.querySelector('dialog[open]')));this.dialogObserver.observe(document.body,{attributes:true,subtree:true,attributeFilter:['open']});
 }
 actor(id){return [...this.host.querySelectorAll('[data-actor]')].find(e=>e.dataset.actor===id);}
 clearProps(){this.host.querySelectorAll('.scene-item-pop').forEach(e=>e.remove());}
 show(scene,lineIndex){const key=scene.id+':'+lineIndex;if(key===this.position)return;const changed=scene.id!==this.sceneId;this.player.reset();this.clearProps();this.position=key;this.sceneId=scene.id;
  const text=scene.lines[lineIndex].text;
  this.current=this.manifest.cues.find(c=>c.scene===scene.id&&text.includes(c.when))||null;
  if(changed)for(const element of this.host.querySelectorAll('[data-actor]'))this.player.play(element,'enter',{profile:this.profiles.get(element.dataset.actor),withEffect:false});
  if(this.current)this.playCurrent(changed?230:0);
 }
 playCurrent(delay=0){if(!this.current||!this.player.enabled)return false;const cue=this.current;this.player.reset();this.clearProps();
  const play=()=>{const actor=this.actor(cue.actor),target=cue.target?this.actor(cue.target):null;if(!actor)return;
   this.player.play(actor,cue.action,{profile:this.profiles.get(cue.actor),target,effect:cue.effect,distance:cue.action==='walk'?18:0});
   if(cue.item){const entity=this.entities.get(cue.item);if(!entity)return;const pop=makeSprite(entity,this.atlases[entity.atlas],{className:'scene-item-pop'});const point=this.player.point(actor);pop.style.left=Math.min(.86,Math.max(.12,point.x))*100+'%';pop.style.top='14%';pop.setAttribute('aria-label',entity.name);pop.title=entity.name;this.host.append(pop);
    const label=document.createElement('span');label.className='scene-item-name';label.textContent=entity.name;pop.append(label);
    this.player.play(pop,'acquire',{profile:this.profiles.get(cue.item),effect:cue.effect,withEffect:false});
    this.player.schedule(()=>pop.remove(),Math.max(1400,ACTIONS[cue.action].duration+250));
   }
  };
  if(delay)this.player.schedule(play,delay);else play();return true;
 }
 clear(){this.player.reset();this.clearProps();this.position=null;this.sceneId=null;this.current=null;}
 setEnabled(enabled){this.player.setEnabled(enabled);if(!enabled)this.clearProps();}
 destroy(){this.clear();this.dialogObserver.disconnect();if(this.ownsPlayer)this.player.destroy();}
}
