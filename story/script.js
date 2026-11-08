const $=id=>document.getElementById(id),node=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text||'';if(cls)e.className=cls;return e;};
try{
 const campaign=await(await fetch('story/campaign.json')).json();
 const audit=await(await fetch('story/webtoon-audit.json')).json();
 const comparisons=new Map(audit.findings.map(f=>[f.id,f]));
 for(const a of campaign.acts){const o=node('option',a.title);o.value=a.id;$('act').append(o);}
 function render(){const q=$('q').value.trim(),act=$('act').value;const scenes=campaign.scenes.filter(s=>(!act||s.act===act)&&(!q||[s.title,...s.lines.map(l=>l.speaker+' '+l.text)].some(t=>t.includes(q))));$('count').textContent=scenes.length+'개 장면';$('script').replaceChildren();
  for(const s of scenes){const article=node('article');article.id=s.id;article.append(node('h2',String(s.order).padStart(3,'0')+' · '+s.title),node('div',s.location+' / '+s.mode,'meta'));for(const line of s.lines){const row=node('div','','line');row.append(node('span',line.speaker,'speaker'),node('p',line.text,'text'));article.append(row);}if(s.choices.length>1||s.choices[0].reply)for(const c of s.choices)article.append(node('div',(c.kind==='reflect'?'다시 판단: ':'진행: ')+c.label+' — '+c.reply,'choice'));const details=node('details'),summary=node('summary','검토 정보');
   const comparison=s.webtoonComparison;
   const scope=comparison.scope==='beyond-public-adaptation'?'확인한 공개 웹툰에서 미각색 · 기존 소설 조사 기반':comparison.scope==='partially-adapted'?'거대 설화 성장 전제 일부만 웹툰에 각색됨 · 열차 전개는 미각색':'공개 웹툰 각색 범위 안 · 장면 전체 검증 완료를 의미하지 않음';
   details.append(summary,node('p',scope),node('p','소설 조사: '+s.source_ids.join(', ')+' · 소설 원문 전수 대조: 미완료 · 검증 항목: '+s.verification_items.join(', ')));
   for(const id of comparison.findingIds){const f=comparisons.get(id);details.append(node('p',id+' · '+f.subject+' — '+f.result));for(const ref of f.references){const a=node('a',ref.displayedEpisode+'화 · 본문 이미지 '+ref.panels.join(', ')+' / '+(ref.method==='official-panel-visually-reviewed'?'이미지 시각 대조':'본문 문자 위치 대조'));a.href='https://comic.naver.com/webtoon/detail?titleId=747269&no='+ref.episodeNo;a.target='_blank';a.rel='noopener noreferrer';details.append(a,node('br'));}}
   if(!comparison.findingIds.length)details.append(node('p','이 장면에 대한 선택 사실 대조 기록은 아직 없음.'));
   article.append(details);$('script').append(article);}}
 $('q').oninput=render;$('act').onchange=render;render();
}catch(error){$('count').textContent='로컬 서버에서 대본을 열어 주세요.';console.error(error);}
