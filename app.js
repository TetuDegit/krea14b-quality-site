'use strict';
const METHODS={"G0":{"name":"Bicubic","label":"双三次插值基线","definition":"先按 1×（832 × 480）生成完整视频，再用 Bicubic 插值放大到 2×（1664 × 960）。","purpose":"对照目的：提供“生成后再放大”的基线。"},"G1":{"name":"CineScale","label":"CineScale-Krea · 逐级扩展","definition":"在低分辨率潜变量基础上逐级扩大生成网格；通过分块查询读取全局信息，并配合空间位置编码（AR-RoPE）。","purpose":"对照目的：观察逐级扩展与全局信息交互对高分辨率生成的影响。"},"G2":{"name":"FreeSwim","label":"FreeSwim-Krea · 全局与局部结合","definition":"在图像与潜变量之间缩放，结合全局分支和局部窗口分支，使整体结构与局部区域共同参与生成。","purpose":"对照目的：观察全局与局部双分支策略的表现。"},"G3":{"name":"SuperGen","label":"SuperGen-Krea · 草图与移动分块","definition":"以低分辨率草图提供结构，结合移动分块、重叠融合与区域缓存适配，组织高分辨率生成。","purpose":"对照目的：观察草图引导和分块细化策略；效果受本项目适配范围与预算限制。"},"G4":{"name":"Direct-2×","label":"直接在 2× 分辨率生成","definition":"从一开始就在 1664 × 960 对应的高分辨率网格上完成全部 5 个去噪步骤，使用官方历史对齐。","purpose":"对照目的：作为直接增加生成分辨率的参照。"},"G5":{"name":"1× → 2×","label":"第一步低分辨率，后四步高分辨率","definition":"第一步在 1× 网格预测，放大去噪预测后重新加噪，再在 2× 网格完成其余 4 步。","purpose":"对照目的：观察只把首个去噪步骤放在低分辨率的影响。“首步”不是视频第一帧。"},"G6":{"name":"MemRoPE","label":"MemRoPE-Krea · 历史记忆机制","definition":"维护起始、近期和长／短期历史记忆，以在线旋转位置编码（Online RoPE）组织时间位置；采用自身独立的历史机制。","purpose":"对照目的：观察历史记忆与时间位置处理对视频连续性的影响。"}};
const metricDescriptions={fast_vqa:'整体视频感知质量 · 本次标定为 0–1，越高越好；不是准确率。',patch_fgresq:'局部画面质量 · 本项目抽帧分块后平均，0–1 越高越好；不直接衡量运动连续性。',video_reward:'人类偏好奖励模型 · VQ 看画面、MQ 看运动、TA 看提示词匹配；Overall 为三项之和，均越高越好。'};
const state={data:null,config:null,catalog:null,batch:null,datasets:new Map(),selected:['G0','G4','G6'],sample:null,playing:false,starting:false,epoch:0,sort:'video_reward:Overall',direction:-1,clock:0};
const $=s=>document.querySelector(s);const all=s=>[...document.querySelectorAll(s)];
const fmt=(x,d=4)=>Number(x).toFixed(d);const seconds=t=>`00:${Math.floor(Math.max(0,t)).toString().padStart(2,'0')}`;
const item=(method)=>state.data.items.find(i=>i.method===method&&i.sample_id===state.sample);
const metricStat=(method,key)=>{const [metric,dim]=key.split(':');return state.data.summary[metric][method][dim];};
const videos=()=>all('#video-grid video');
let enlargedVideo=null;
function bufferedAhead(video){for(let n=0;n<video.buffered.length;n++){if(video.buffered.start(n)<=video.currentTime+.05&&video.buffered.end(n)>video.currentTime)return video.buffered.end(n)-video.currentTime;}return 0;}
function readyToStart(video){return !video.error&&video.readyState>=3&&bufferedAhead(video)>=Math.min(2,Math.max(0,video.duration-video.currentTime-.05));}
function status(message,error=false){$('#player-status').textContent=message;$('#player-status').classList.toggle('error',error);}
function pauseAll(message){videos().forEach(v=>v.pause());state.playing=false;state.starting=false;$('#play').textContent='▶ 同步播放';if(message)status(message);}
function setTime(t){for(const v of videos()){if(Number.isFinite(v.duration))v.currentTime=Math.min(t,Math.max(0,v.duration-.001));}$('#seek').value=t;$('#current-time').textContent=seconds(t);}
function localMedia(){return new URLSearchParams(location.search).get('media')==='local'||(!state.batch.published&&['localhost','127.0.0.1'].includes(location.hostname));}
function mediaURL(row){return localMedia()?`/media/${encodeURIComponent(row.asset)}`:`https://github.com/${state.config.repository}/releases/download/${state.batch.release_tag}/${encodeURIComponent(row.asset)}`;}
function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function renderHighlights(){const root=$('#highlights');root.replaceChildren();for(const [metric,dim,label] of [['fast_vqa','score','FAST-VQA · 最高均值'],['patch_fgresq','score','Patch-FGResQ · 最高均值'],['video_reward','Overall','VideoReward Overall · 最高均值']]){const ranked=state.data.methods.slice().sort((a,b)=>state.data.summary[metric][b][dim].mean-state.data.summary[metric][a][dim].mean);const g=ranked[0],value=state.data.summary[metric][g][dim].mean;const row=element('div','highlight');const copy=element('div');copy.append(element('span','highlight-label',label));const name=element('span','highlight-name');name.append(element('small','',g),document.createTextNode(METHODS[g].name));copy.append(name);row.append(copy,element('span','highlight-value',fmt(value,3)));root.append(row);}}
function renderCases(){const root=$('#case-tabs');root.replaceChildren();state.data.sample_ids.forEach((s,n)=>{const b=element('button','',`案例 ${String(n+1).padStart(2,'0')}`);b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(s===state.sample));b.addEventListener('click',()=>{state.sample=s;updateBatchContext();renderCases();renderVideos();});root.append(b);});}
function renderMethods(){const root=$('#method-picker');root.replaceChildren();state.data.methods.forEach(g=>{const b=element('button','method-chip');b.type='button';b.setAttribute('aria-pressed',String(state.selected.includes(g)));b.append(element('b','',g),document.createTextNode(METHODS[g].name));b.addEventListener('click',()=>{if(state.selected.includes(g)){if(state.selected.length===1){status('至少保留一种方法。');return;}state.selected=state.selected.filter(x=>x!==g);}else{if(state.selected.length===3){status('最多并排比较三种方法，请先取消一种。');return;}state.selected.push(g);state.selected.sort();}renderMethods();renderVideos();});root.append(b);});}
function renderVideos(){pauseAll();const epoch=++state.epoch;const root=$('#video-grid');root.replaceChildren();root.dataset.count=String(state.selected.length);const first=item(state.selected[0]);$('#prompt').textContent=first.prompt;$('#seed').textContent=`SEED ${first.seed}`;$('#play').disabled=true;$('#seek').value=0;$('#current-time').textContent='00:00';const mediaReady=state.batch.published||localMedia();status(mediaReady?'正在加载视频，首次播放需要少量缓冲…':'视频附件正在准备中，可先查看海报、提示词和评分。');
  state.selected.forEach(g=>{const row=item(g);const card=element('article','video-card');const caption=element('div','video-caption');const link=element('a','video-download','↗');link.href=mediaURL(row);link.target='_blank';link.rel='noopener';link.title=`打开 ${g} ${state.sample} 原始视频`;link.setAttribute('aria-label',link.title);caption.append(element('span','method-code',g),element('strong','',METHODS[g].name));const expand=element('button','video-expand','⤢ 放大查看');expand.type='button';expand.setAttribute('aria-label',`放大查看 ${g} ${METHODS[g].name}`);if(mediaReady)caption.append(expand,link);const video=document.createElement('video');expand.addEventListener('click',()=>openVideoViewer(row,video,expand));video.muted=true;video.defaultMuted=true;video.playsInline=true;video.preload='auto';video.poster=row.poster||`poster_${g}_${state.sample}.jpg`;if(mediaReady)video.src=mediaURL(row);video.setAttribute('aria-label',`${g} ${METHODS[g].name} ${state.sample}`);video.playbackRate=Number($('#speed').value);
    const ready=()=>{if(epoch!==state.epoch)return;const list=videos();const loaded=list.length&&list.every(readyToStart);$('#play').disabled=!(loaded||state.playing||state.starting);if(!state.playing&&!state.starting&&mediaReady&&!list.some(v=>v.error))status(loaded?'视频已就绪 · 点击同步播放。':`正在缓冲视频（${list.filter(readyToStart).length}/${list.length}），首次加载请稍候…`);};video.addEventListener('loadedmetadata',ready);video.addEventListener('canplay',ready);video.addEventListener('progress',ready);video.addEventListener('canplaythrough',ready);video.addEventListener('error',()=>{if(epoch!==state.epoch)return;pauseAll();$('#play').disabled=true;status('视频加载失败。请检查连接，或点击卡片右上角单独打开原文件。',true);});video.addEventListener('waiting',()=>{if(epoch===state.epoch&&state.playing&&!state.starting)pauseAll('视频正在缓冲，已暂停全部；就绪后点击同步播放继续。');});video.addEventListener('ended',()=>{if(epoch!==state.epoch)return;pauseAll('播放结束，可点击 ↺ 从头比较。');$('#seek').value=20;$('#current-time').textContent='00:20';});
    const scores=element('div','video-scores');[['FAST-VQA',row.scores.fast_vqa.score],['Patch-FGResQ',row.scores.patch_fgresq.score],['VR · Overall',row.scores.video_reward.Overall]].forEach(([k,v])=>{const span=element('span','',k);span.append(element('strong','',fmt(v,3)));scores.append(span);});card.append(caption,video,scores);root.append(card);});}
function openVideoViewer(row,video,trigger){
  if(enlargedVideo)return;
  pauseAll('正在单独查看视频。');
  const placeholder=document.createComment('video position');
  video.before(placeholder);
  enlargedVideo={video,placeholder,trigger,controls:video.controls};
  video.controls=true;
  $('#viewer-video').append(video);
  $('#viewer-title').textContent=`${row.method} · ${METHODS[row.method].name} · ${row.sample_id}`;
  $('#viewer-prompt').textContent=`${row.prompt} · SEED ${row.seed}`;
  $('#viewer-note').textContent='可单独播放、暂停或拖动进度。关闭后回到同一时间点继续对比。';
  $('#viewer-fullscreen').hidden=!(video.requestFullscreen||video.webkitEnterFullscreen||video.webkitRequestFullscreen);
  document.body.classList.add('viewer-open');
  $('#video-viewer').showModal();
}
function restoreVideoViewer(){
  const current=enlargedVideo;if(!current)return;
  enlargedVideo=null;
  current.video.pause();
  const position=current.video.currentTime;
  current.placeholder.replaceWith(current.video);
  current.video.controls=current.controls;
  document.body.classList.remove('viewer-open');
  if(Number.isFinite(position))setTime(position);
  const ready=videos().every(readyToStart);
  $('#play').disabled=!ready;
  pauseAll(ready?'已返回对比，可继续同步播放。':'已返回对比，等待视频缓冲…');
  current.trigger.focus({preventScroll:true});
}
async function fullscreenViewer(){
  const video=enlargedVideo?.video;if(!video)return;
  try{
    if(video.requestFullscreen)await video.requestFullscreen();
    else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();
    else if(video.webkitRequestFullscreen)video.webkitRequestFullscreen();
  }catch{ $('#viewer-note').textContent='当前浏览器未能进入全屏，可继续在放大窗口内查看。'; }
}
function setupVideoViewer(){
  const dialog=$('#video-viewer');
  $('#viewer-close').addEventListener('click',()=>dialog.close());
  $('#viewer-fullscreen').addEventListener('click',fullscreenViewer);
  dialog.addEventListener('close',restoreVideoViewer);
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
}
async function togglePlay(){if(state.playing){pauseAll('已暂停。');return;}const list=videos();if(!list.length)return;if(list[0].currentTime>=19.95)setTime(0);const startTime=list[0].currentTime;setTime(startTime);state.starting=true;state.playing=true;$('#play').textContent='Ⅱ 暂停全部';status('正在同步启动…');const epoch=state.epoch;const results=await Promise.allSettled(list.map(v=>v.play()));if(epoch!==state.epoch||!state.starting)return;if(results.some(r=>r.status==='rejected')){pauseAll('浏览器未能启动全部视频，请再次点击播放。');return;}setTime(startTime);status('同步播放中 · 浏览器近似同步。');setTimeout(()=>{if(epoch===state.epoch)state.starting=false;},900);}
function tick(now){const list=videos();if(state.playing&&list.length){const t=list[0].currentTime;$('#seek').value=t;$('#current-time').textContent=seconds(t);if(now-state.clock>1200){state.clock=now;list.slice(1).forEach(v=>{if(v.readyState>=2&&Math.abs(v.currentTime-t)>.3)v.currentTime=t;});}}requestAnimationFrame(tick);}
function renderRanking(){const key=$('#metric-select').value,[metric,dim]=key.split(':');$('#metric-description').textContent=metricDescriptions[metric];const rows=state.data.methods.slice().sort((a,b)=>metricStat(b,key).mean-metricStat(a,key).mean);const scale=metric==='video_reward'?Math.max(1,...rows.map(g=>metricStat(g,key).mean)):1;const root=$('#ranking');root.replaceChildren();rows.forEach(g=>{const s=metricStat(g,key),row=element('div','rank-row'),name=element('div','rank-name');name.append(element('b','',g),document.createTextNode(METHODS[g].name));const track=element('div','bar-track'),bar=element('div','bar');bar.style.width=`${Math.max(0,s.mean)/scale*100}%`;track.append(bar);const value=element('div','rank-value',fmt(s.mean,3));value.append(element('small','',`± ${fmt(s.sample_std,3)}`));row.append(name,track,value);root.append(row);});}
const columns=['fast_vqa:score','patch_fgresq:score','video_reward:VQ','video_reward:MQ','video_reward:TA','video_reward:Overall'];
function renderTable(){const body=$('#score-table tbody');body.replaceChildren();const rows=state.data.methods.slice().sort((a,b)=>state.direction*(metricStat(a,state.sort).mean-metricStat(b,state.sort).mean));const best=Object.fromEntries(columns.map(k=>[k,Math.max(...state.data.methods.map(g=>metricStat(g,k).mean))]));rows.forEach(g=>{const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.append(element('strong','',METHODS[g].name),element('small','',g));tr.append(th);columns.forEach(k=>{const s=metricStat(g,k),td=element('td',s.mean===best[k]?'best':'',fmt(s.mean));td.append(element('span','std',`± ${fmt(s.sample_std)}`));tr.append(td);});body.append(tr);});all('[data-sort]').forEach(b=>{const active=b.dataset.sort===state.sort;b.closest('th').setAttribute('aria-sort',active?(state.direction===-1?'descending':'ascending'):'none');});}
function renderDefinitions(){const root=$('#method-definitions');Object.entries(METHODS).forEach(([g,m])=>{const r=element('div','method-definition');const p=element('p');p.append(element('strong','',m.label),document.createElement('br'),document.createTextNode(m.definition),element('span','method-purpose',m.purpose));r.append(element('span','method-code',g),p);root.append(r);});}

async function loadDataset(batch) {
  if(state.datasets.has(batch.id)) return state.datasets.get(batch.id);
  const response=await fetch(batch.data,{cache:'no-cache'});
  if(!response.ok) throw Error('Batch data unavailable');
  const data=await response.json();
  if(data.items.length!==data.methods.length*data.sample_ids.length) throw Error('Incomplete dataset');
  const pairs=new Set(data.items.map(row=>`${row.method}:${row.sample_id}`));
  if(pairs.size!==data.items.length) throw Error('Duplicate video identity');
  state.datasets.set(batch.id,data);return data;
}
function renderBatchButtons() {
  const root=$('#batch-picker');root.replaceChildren();
  state.catalog.batches.forEach(batch=>{
    const button=element('button','batch-button');button.type='button';
    button.setAttribute('aria-pressed',String(batch.id===state.batch.id));
    button.append(element('strong','',batch.label),element('span','',`${batch.video_count}段视频 · 三项评分完成`));
    button.addEventListener('click',()=>switchBatch(batch.id));root.append(button);
  });
}
function updateBatchContext() {
  $('#active-batch-label').textContent=state.batch.label;
  $('#batch-note').textContent=`当前：${state.batch.label}。每批7种方法×5个案例；两批提示词不同，分别统计，不合并为每组n=10。`;
  $('#hero-batch-label').textContent=state.batch.label+' · 当前批次指标';
  $('#compare-batch-label').textContent=state.batch.label;
  all('[data-batch-download]').forEach(link=>{link.href=state.batch[link.dataset.batchDownload];});
  $('#release-link').href=state.batch.published?`https://github.com/${state.config.repository}/releases/tag/${state.batch.release_tag}`:`https://github.com/${state.config.repository}`;
  $('#release-link').textContent=state.batch.published?'当前批次视频附件 ↗':'视频附件准备中 ↗';
  const other=state.catalog.batches.find(batch=>batch.id!==state.batch.id);
  const companion=other&&state.datasets.get(other.id)?.items.find(row=>row.sample_id===state.sample);
  $('#other-prompt').textContent=companion?companion.prompt:'';
  $('#other-prompt-label').textContent=other?`同案例的${other.label}提示词`:'';
}
let batchSwitchEpoch=0;
async function switchBatch(id) {
  const batch=state.catalog.batches.find(row=>row.id===id);if(!batch||batch.id===state.batch?.id)return;
  const sequence=++batchSwitchEpoch;
  if(enlargedVideo){$('#video-viewer').close();restoreVideoViewer();}
  pauseAll();++state.epoch;$('#play').disabled=true;
  try{
    const data=await loadDataset(batch);if(sequence!==batchSwitchEpoch)return;
    state.batch=batch;state.data=data;
    if(!data.sample_ids.includes(state.sample))state.sample=data.sample_ids[0];
    state.selected=state.selected.filter(g=>data.methods.includes(g));if(!state.selected.length)state.selected=['G4'];
    const url=new URL(location.href);url.searchParams.set('batch',id);history.replaceState(null,'',url);
    renderBatchButtons();updateBatchContext();renderHighlights();renderCases();renderMethods();renderVideos();renderRanking();renderTable();
  }catch(error){status('该批次暂时无法读取，请重新选择。',true);console.error(error);}
}
function renderAllBatches() {
  const body=$('#all-batches-table tbody');body.replaceChildren();
  for(const batch of state.catalog.batches){
    const data=state.datasets.get(batch.id);if(!data)continue;
    for(const method of data.methods){
      const row=element('tr');row.append(element('td','',batch.label),element('th','',`${method} · ${METHODS[method].name}`));
      for(const key of columns){const [metric,dim]=key.split(':');const value=data.summary[metric][method][dim];row.append(element('td','',`${fmt(value.mean)} ± ${fmt(value.sample_std)}`));}
      body.append(row);
    }
  }
}

async function init(){try{const [catalogResponse,configResponse]=await Promise.all([fetch('batches.json',{cache:'no-cache'}),fetch('config.json',{cache:'no-cache'})]);if(!catalogResponse.ok||!configResponse.ok)throw Error('Data unavailable');state.catalog=await catalogResponse.json();state.config=await configResponse.json();await Promise.all(state.catalog.batches.map(loadDataset));const id=new URLSearchParams(location.search).get('batch')||state.catalog.default_batch;state.batch=state.catalog.batches.find(batch=>batch.id===id)||state.catalog.batches[0];state.data=state.datasets.get(state.batch.id);state.sample=state.data.sample_ids[0];setupVideoViewer();renderBatchButtons();updateBatchContext();renderHighlights();renderCases();renderMethods();renderVideos();renderRanking();renderTable();renderDefinitions();renderAllBatches();$('#play').addEventListener('click',togglePlay);$('#restart').addEventListener('click',()=>{pauseAll();setTime(0);status('已回到开头。');});$('#seek').addEventListener('input',e=>{pauseAll();setTime(Number(e.target.value));status('已定位，点击同步播放继续。');});$('#speed').addEventListener('change',e=>videos().forEach(v=>v.playbackRate=Number(e.target.value)));$('#metric-select').addEventListener('change',renderRanking);$('#show-std').addEventListener('change',e=>$('#score-table').classList.toggle('hide-std',!e.target.checked));all('[data-sort]').forEach(b=>b.addEventListener('click',()=>{state.direction=state.sort===b.dataset.sort?-state.direction:-1;state.sort=b.dataset.sort;renderTable();}));$('#copy-prompt').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#prompt').textContent);$('#copy-prompt').textContent='已复制 ✓';setTimeout(()=>$('#copy-prompt').textContent='复制提示词 ↗',1700);}catch{status('请选中提示词文字后复制。');}});requestAnimationFrame(tick);}catch(error){status('数据加载失败，请通过网页服务打开此页面。',true);$('#prompt').textContent='评测数据暂时无法读取。';console.error(error);}}
init();
