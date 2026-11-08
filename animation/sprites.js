import {assetUrl} from './resources.js';
export function makeSprite(entity,atlas,{root='assets/',className='motion-sprite'}={}) {
 const holder=document.createElement('div');holder.className=className;holder.dataset.entity=entity.id;
 const rig=document.createElement('div');rig.className='motion-rig';
 const cell=document.createElement('div');cell.className='sprite-cell';
 cell.style.aspectRatio=`${atlas.width/atlas.columns} / ${atlas.height/atlas.rows}`;
 cell.dataset.ratio=(atlas.width/atlas.columns)/(atlas.height/atlas.rows);
 const im=document.createElement('img');im.src=assetUrl(root+atlas.path);im.alt=entity.name;im.draggable=false;im.decoding='async';
 im.style.width=atlas.columns*100+'%';im.style.left=-entity.column*100+'%';im.style.top=-entity.row*100+'%';
 cell.append(im);rig.append(cell);holder.append(rig);return holder;
}
export function atlasMap(catalog,manifest) {return {...manifest.atlases,...Object.fromEntries(catalog.batches.map(b=>[b.id,b]))};}
