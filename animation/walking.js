import {WALK_CYCLES} from './walk-data.js';
import {assetUrl} from './resources.js';

export function walkSheetFor(element,profile){return WALK_CYCLES[element.dataset.entity||element.dataset.actor||profile?.id]||null;}
export function walkFrameKeys(sheet,direction=1){
 const sign=direction<0?-1:1,ratio=sheet.width/sheet.columns/(sheet.height/sheet.rows),width=sheet.scale*ratio/sheet.sourceRatio;
 return [...sheet.frames,sheet.frames[0]].map((f,i)=>({
  offset:i/sheet.frameCount,easing:'steps(1,end)',
  image:{left:-f.column*100+'%',top:-f.row*100+'%'},
  alignment:{left:(sheet.sourceAnchor-(f.anchor-.5)*width*sign)*100+'%',top:(sheet.sourceGround-f.ground*sheet.scale)*100+'%'}
 }));
}
// A cancellable group with the same lifecycle surface as a Web Animation.
export class WalkingClip {
 constructor(cell,sheet,{duration=sheet.cycleMs,direction=1,distance=0,loop=false,cycles=2}={}){
  this.cell=cell;this.sheet=sheet;this.hold=true;this.animations=[];this.cancelled=false;this.paused=false;this.poseFinished=false;
  this.original=cell.querySelector(':scope > img');this.originalVisibility=this.original?.style.visibility||'';
  this.finished=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
  this.layer=document.createElement('div');this.layer.className='walk-layer';this.layer.hidden=true;
  this.shadow=document.createElement('div');this.shadow.className='walk-foot-shadow';this.shadow.style.top=sheet.sourceGround*100+'%';
  this.frame=document.createElement('div');this.frame.className='walk-frame';
  const ratio=(sheet.width/sheet.columns)/(sheet.height/sheet.rows);
  this.frame.style.width=sheet.scale*ratio/sheet.sourceRatio*100+'%';this.frame.style.height=sheet.scale*100+'%';this.frame.style.transform=`translateX(-50%) scaleX(${direction<0?-1:1})`;
  this.image=document.createElement('img');this.image.src=assetUrl('assets/'+sheet.path);this.image.alt='';this.image.setAttribute('aria-hidden','true');this.image.draggable=false;this.image.style.width=sheet.columns*100+'%';this.frame.append(this.image);this.layer.append(this.shadow,this.frame);cell.append(this.layer);
  const keys=walkFrameKeys(sheet,direction),iterations=loop&&distance===0?Infinity:Math.max(1,Math.min(10,Math.round(cycles))),timing={duration,iterations,easing:'linear',fill:'both'};
  this.image.decode().then(()=>{
   if(this.cancelled)return;this.layer.hidden=false;if(this.original)this.original.style.visibility='hidden';cell.dataset.walking='true';
   const frames=this.image.animate(keys.map(k=>({offset:k.offset,easing:k.easing,...k.image})),timing);
   const align=this.frame.animate(keys.map(k=>({offset:k.offset,easing:k.easing,...k.alignment})),timing);
   const travel=cell.animate([{transform:'translateX(0px)'},{transform:`translateX(${distance*(direction<0?-1:1)}px)`}],{duration:duration*(iterations===Infinity?1:iterations),iterations:iterations===Infinity?Infinity:1,easing:'linear',fill:'forwards'});
   const shadow=this.shadow.animate([{opacity:.25,transform:'translateX(-50%) scaleX(1)'},{opacity:.4,transform:'translateX(-50%) scaleX(.88)'},{opacity:.25,transform:'translateX(-50%) scaleX(1)'}],{...timing,duration:duration/2,iterations:iterations===Infinity?Infinity:iterations*2});
   this.animations=[frames,align,travel,shadow];const start=document.timeline.currentTime;for(const a of this.animations){a.startTime=start;if(this.paused)a.pause();}
   frames.finished.then(()=>{if(!this.cancelled)this.resolve();}).catch(()=>{});
  }).catch(error=>{if(!this.cancelled){this.cancel();console.error('Walk sprite could not be loaded',error);}});
 }
 pause(){this.paused=true;if(!this.poseFinished)for(const a of this.animations)a.pause();}
 play(){this.paused=false;if(!this.poseFinished)for(const a of this.animations)a.play();}
 finishPose(){if(this.cancelled||this.poseFinished)return;this.poseFinished=true;this.layer.remove();delete this.cell.dataset.walking;if(this.original)this.original.style.visibility=this.originalVisibility;for(const a of this.animations)if(a.effect?.target!==this.cell)a.cancel();this.animations=this.animations.filter(a=>a.effect?.target===this.cell);}
 cancel(){if(this.cancelled)return;this.cancelled=true;for(const a of this.animations)a.cancel();this.layer.remove();delete this.cell.dataset.walking;if(this.original)this.original.style.visibility=this.originalVisibility;this.reject(new DOMException('Walk canceled','AbortError'));}
}
