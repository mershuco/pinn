// Visual presentation only. These clips never change combat or story state.
export const ACTIONS = Object.freeze({
 idle:{label:'대기',duration:1800}, enter:{label:'등장',duration:520,impact:.35}, walk:{label:'걷기',duration:900},
 attack:{label:'공격',duration:820,impact:.43}, cast:{label:'능력 발동',duration:1180,impact:.48},
 guard:{label:'방어',duration:1050,impact:.28}, hit:{label:'피격',duration:560,impact:.08},
 dodge:{label:'회피',duration:680}, jump:{label:'도약',duration:850}, fall:{label:'쓰러짐',duration:940,impact:.65},
 victory:{label:'승리',duration:1300,impact:.4}, teleport:{label:'순간 이동',duration:1100,impact:.46},
 acquire:{label:'획득',duration:1150,impact:.35}, activate:{label:'아이템 발동',duration:1250,impact:.4},
 consume:{label:'소모',duration:1000,impact:.45}, equip:{label:'장착',duration:1000,impact:.35}
});
export const EFFECTS = Object.freeze({
 slash:{label:'청백 검격',color:'#a9e5f4',shape:'slash'}, judgment:{label:'심판의 불꽃',color:'#ffa66c',shape:'judgment'},
 flame:{label:'화염',color:'#ff9f59',shape:'flame'}, blackflame:{label:'흑염',color:'#b590ef',shape:'flame'},
 frost:{label:'냉기 파편',color:'#b4e7f5',shape:'frost'}, lightning:{label:'백청 뇌전',color:'#9de4fa',shape:'lightning'},
 shield:{label:'강철 방벽',color:'#b4cbd5',shape:'shield'}, heal:{label:'회복',color:'#bfe5b6',shape:'heal'},
 mana:{label:'마력 회복',color:'#92c9f1',shape:'heal'}, poison:{label:'독과 점액',color:'#abc785',shape:'poison'},
 thread:{label:'거미줄 구속',color:'#e5d2a4',shape:'thread'}, swarm:{label:'곤충 군집',color:'#bdd18c',shape:'swarm'},
 water:{label:'해상 파도',color:'#8bbfdc',shape:'water'}, shot:{label:'투사체·포탑',color:'#eecf8e',shape:'shot'},
 impact:{label:'타격·분진',color:'#d9bda0',shape:'impact'}, seal:{label:'봉인 고리',color:'#e3cd9e',shape:'seal'},
 insight:{label:'독해·페이지',color:'#b9d5df',shape:'pages'}, portal:{label:'차원 이동',color:'#b4b4ec',shape:'portal'},
 summon:{label:'소환',color:'#c9c5ed',shape:'summon'}, soul:{label:'영혼의 빛',color:'#f3d99c',shape:'soul'},
 craft:{label:'수선·단조',color:'#f1c790',shape:'craft'}, pickup:{label:'획득·코인',color:'#e3cf8d',shape:'pickup'},
 spring:{label:'마계의 봄',color:'#d6e3ae',shape:'spring'}
});
export const CHARACTER_ACTIONS=['idle','enter','walk','attack','cast','guard','hit','dodge','jump','fall','victory','teleport'];
export const ITEM_ACTIONS=['idle','acquire','activate','consume','equip'];
const k=(offset,transform,opacity=1)=>({offset,transform,opacity});
export function keyframes(action, direction=1) {
 const d=direction<0?-1:1, t=(x=0,y=0,r=0,sx=1,sy=sx)=>`translate(${x*d}px, ${y}px) rotate(${r*d}deg) scale(${sx}, ${sy})`;
 switch(action){
 case 'idle':return[k(0,t()),k(.5,t(0,-4,-.6,1.007,1.015)),k(1,t())];
 case 'enter':return[k(0,t(-26,8,-5,.92),0),k(.65,t(3,-2,1,1.02)),k(1,t())];
 case 'walk':return[k(0,t()),k(.18,t(9,-7,3,1,.97)),k(.37,t(21,0,-3,1,1.02)),k(.55,t(32,-7,3,1,.97)),k(.73,t(21,0,-3)),k(1,t())];
 case 'attack':return[k(0,t()),k(.2,t(-12,3,-9,.95,1.02)),k(.4,t(35,-5,13,1.08,.94)),k(.5,t(43,-2,9,1.04,.96)),k(.66,t(10,2,-3,.98)),k(1,t())];
 case 'cast':return[k(0,t()),k(.25,t(0,2,-4,.98,1.02)),k(.46,t(0,-12,1,1.05)),k(.66,t(0,-8,-1,1.02)),k(1,t())];
 case 'guard':return[k(0,t()),k(.2,t(-5,4,-4,1.04,.96)),k(.4,t(-13,5,-7,1.03,.95)),k(.62,t(-5,3,-3)),k(1,t())];
 case 'hit':return[k(0,t()),k(.15,t(-15,2,-8,.96)),k(.28,t(-8,-1,4)),k(.43,t(-12,0,-4)),k(.6,t(-4,1,2)),k(1,t())];
 case 'dodge':return[k(0,t()),k(.23,t(-48,-2,-13,.92),.65),k(.5,t(-56,-3,-10,.96),.6),k(.8,t(-10,0,2)),k(1,t())];
 case 'jump':return[k(0,t()),k(.13,t(0,6,0,1.05,.92)),k(.4,t(10,-48,-6,.97,1.04)),k(.58,t(15,-52,-2)),k(.86,t(8,6,3,1.06,.92)),k(1,t())];
 case 'fall':return[k(0,t()),k(.2,t(-6,2,-8)),k(.65,t(-12,18,-24,.92),.7),k(1,t(-14,22,-28,.88),0)];
 case 'victory':return[k(0,t()),k(.22,t(0,4,0,1.03,.96)),k(.4,t(0,-20,-5,1.03)),k(.58,t(0,1,2)),k(.75,t(0,-5,-1)),k(1,t())];
 case 'teleport':return[k(0,t()),k(.28,t(0,-7,0,.65,1.1),.3),k(.43,t(0,-10,0,.1,1.2),0),k(.58,t(25,-12,0,.1,1.2),0),k(.8,t(3,-4,0,1.03),1),k(1,t())];
 case 'acquire':return[k(0,t(0,15,0,.55),0),k(.3,t(0,-12,-6,1.12)),k(.55,t(0,-5,3,.98)),k(1,t())];
 case 'activate':return[k(0,t()),k(.2,t(0,-5,-4,.96)),k(.4,t(0,-12,4,1.15)),k(.62,t(0,-7,-2,1.04)),k(1,t())];
 case 'consume':return[k(0,t()),k(.3,t(0,-14,-12,1.08)),k(.6,t(0,-25,6,.72),.5),k(1,t(0,-42,0,.2),0)];
 case 'equip':return[k(0,t(0,4,0,.86),.3),k(.3,t(0,-8,-4,1.1)),k(.6,t(0,-2,3,1.03)),k(1,t())];
 default:throw new Error(`Unknown animation: ${action}`);
 }
}
export function effectForAction(action,profile) {
 if(['guard'].includes(action))return 'shield';
 if(action==='hit')return 'impact';
 if(action==='acquire')return 'pickup';
 if(action==='teleport')return 'portal';
 if(action==='victory')return 'spring';
 if(action==='equip')return 'craft';
 return profile.effect;
}
export function seededRandom(seed=1) {let value=seed>>>0;return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
export function profileFor(entity) {
 const id=entity.id,item=entity.item||id;
 let effect='impact',idle='breathe';
 const groups={
 slash:['dokja-coat','junghyeok','heewon','jihye','sword-saint','jun-gyeong','namwoon','dog-martial','punisher','broken-faith','broken-faith-active','unbroken-faith','four-tiger-sword','mikazuki','totsuka','ame-no-murakumo','kusanagi','jincheon','black-heaven','stone-hog-spike','dragon-bone'],
 insight:['dokja-office','handong','leesung','jeongmin','phone-original','phone-repaired','novel-text','novel-revision','midday-tryst','simulacrum'],
 judgment:['heewon-judgment','uriel','judgment-sword'],blackflame:['sooyoung','sooyoung-avatar','abyss-dragon','abyss-jade'],
 flame:['lesser-ignir','sulfur-mummy','mana-stove','ancient-dragon-heart'],frost:['iceflower','ice-elemental','ice-pill'],
 lightning:['kyrgios','hayoung'],shield:['hyunsung','hyunsung-steel','steel-master','metal-kong','reinforced-suit','old-iron-shield','straw-mat'],
 heal:['seolhwa','forest-essence','hp-potion','great-pill','awakening-drug','serpent-sake'],mana:['mp-potion','mana-bracelet'],
 poison:['antinous','insect-human','hammer-seahorse-mucus','monkey-lung'],thread:['sangah','mat-spider','none'],
 swarm:['gilyoung','mantis','molecricket','titanoptera','insect-eggs'],summon:['yoosung','yoosung-disaster','chimera-dragon','beast-fruit'],
 water:['sunshin','sea-serpent','sea-commander'],shot:['pildu','defense-master','robin-bow'],seal:['sookyung','youngran','nirvana','mandala','prayer-beads','paljuryeong','absolute-bracelet'],
 portal:['secret-plotter','dream-eater','white-coat','black-coat','hermit-cloak','face-change'],
 soul:['biyoo','bihyung','dokkaebi-egg','soul','specter','specter-stone','persephone','hades'],
 craft:['aileen','maker','factory','giant-soldier','anvil-stone','story-metal','random-box','story-fusion-box'],
 pickup:['coin-ui','sangpyeong','wish-ticket','sixth-man','pocket-watch','stats-ampoule','trex-dna'],
 spring:['story-spring'],
 };
 for(const [key,ids] of Object.entries(groups))if(ids.includes(id)||ids.includes(item)){effect=key;break;}
 if(entity.kind==='item'&&effect==='impact')effect=['crest','star-gems','ganpyeongui','yongjon'].includes(id)?'seal':'soul';
 if(id.startsWith('flag-'))effect='pickup';
 if(['dokja-demon','asmodeus','demon-orb','demon-heart'].includes(id))effect='blackflame';
 if(['surya'].includes(id))effect='flame';
 if(entity.kind==='item'||['bihyung','biyoo','dokgak','baul','yeonggi','humpback','specter','secret-plotter','dream-eater','titanoptera','ice-elemental','soul'].includes(id))idle='float';
 if(['factory','giant-soldier','hyunsung-steel','metal-kong','sentinel-golem','bronze-doll'].includes(id))idle='heavy';
 return {id,kind:entity.kind,effect,idle,color:EFFECTS[effect].color,actions:entity.kind==='item'?[...ITEM_ACTIONS]:[...CHARACTER_ACTIONS,...(entity.kind==='equipment'?['equip']:[])]};
}
