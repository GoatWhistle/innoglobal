let selectionActive=false,inspectionPhase='idle';
let workspaceData,activePipeIndex=0,selectedSegment=131,chartScope='local',comparison='',sceneMode='route',chatTrigger=null;
const chatSessions=new Map();
const $=id=>document.getElementById(id);
const fmt=(v,d=2)=>v==null?'Нет данных':new Intl.NumberFormat('ru-RU',{maximumFractionDigits:d,minimumFractionDigits:d}).format(v);
const date=v=>v?new Date(v+'T12:00:00').toLocaleDateString('ru-RU'):'Нет данных';
const escapeText=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pipeNow=()=>workspaceData.pipes.items[activePipeIndex];
const profileNow=()=>workspaceData.profiles[String(pipeNow().pipe_id)];
const rowNow=()=>profileNow().rows.find(r=>r.segment_id===selectedSegment);
const rangeText=r=>`${fmt(r.start_m,0)}–${fmt(r.end_m,0)} м`;
const priorityRows=()=>profileNow().rows.filter(r=>r.priority_rank!=null).sort((a,b)=>a.priority_rank-b.priority_rank);
function metric(label,value,primary=false){return `<dt${primary?' class="primary-reading"':''}>${label}</dt><dd${primary?' class="primary-reading"':''}>${value}</dd>`;}
function openPipe(index){
 if(!workspaceData){message('Данные ещё загружаются');return;}
 storeDraft();toggleCharts(false);activePipeIndex=index;selectedSegment=pipeNow().thinnest_segment_id;comparison=pipeNow().last_observed_run||'nominal';chartScope='local';
 transition(()=>{$('overview').style.display='none';$('detail').style.display='block';document.body.classList.add('workspace-open');renderWorkspace();setSceneMode('route');clearSelection();});window.scrollTo(0,0);
}
function back(){clearTimeout(inspectionTimer);window.materialDetail?.cancelInspection();storeDraft();toggleChat(false);transition(()=>{$('detail').style.display='none';$('overview').style.display='block';document.body.classList.remove('workspace-open');});history.replaceState(null,'',location.pathname+location.search);}
function renderWorkspace(){
 const p=pipeNow(),pr=profileNow();$('direction').textContent=p.passport.direction.replaceAll(' - ',' — ');$('pipeid').textContent=p.pipe_id;$('subtitle').textContent=p.passport.section_name+' / '+date(p.target_date);
 $('distance-input').placeholder=pr.rows[0].segment_id+'–'+pr.rows.at(-1).segment_id;$('distance-input').min=pr.rows[0].segment_id;document.querySelector('.segment-entry').style.setProperty('--segment-digits',String(pr.rows.at(-1).segment_id).length);
 $('comparison-select').innerHTML=`<option value="nominal">Номинал ${fmt(p.passport.nominal_wall_mm)} мм</option>`+pr.run_dates.map(d=>`<option value="${d}">ВТД ${date(d)}</option>`).join('');$('comparison-select').value=comparison;
 window.materialDetail?.name(p.passport.direction);renderSegment();setChartScope(chartScope);renderQueue();renderPassport();renderChat();
}
function renderSegment(){
 const p=pipeNow(),r=rowNow(),last=r.observations.at(-1),base=comparison==='nominal'?p.passport.commissioned_at:comparison;
 $('segment-number').textContent=r.segment_id;$('segment-range').textContent=rangeText(r);
 const baseline=comparison==='nominal'?p.passport.nominal_wall_mm:r.observations.find(o=>o.run_date===comparison)?.residual_mm;
 $('segment-metrics').innerHTML=metric('Мин. стенка',fmt(r.forecast_mm)+' мм',true)+metric('Номинал',fmt(p.passport.nominal_wall_mm)+' мм')+metric('P10 / P90',fmt(r.p10_mm)+'–'+fmt(r.p90_mm)+' мм')+metric(comparison==='nominal'?'База: номинал':'ВТД '+date(comparison),baseline==null?'Нет данных':fmt(baseline)+' мм')+metric('Горизонт',Math.round((Date.parse(p.target_date)-Date.parse(base))/86400000)+' дн.')+metric('В очереди',r.priority_rank==null?'Вне очереди':r.priority_rank+' / '+p.priority_count);
 $('distance-input').value=r.segment_id;$('distance-input').max=profileNow().rows.at(-1).segment_id;$('queue-count').textContent=p.priority_count;
 if(selectionActive)$('chat-scope').value='segment';updateChatContext();
 $('elevation-summary').textContent='Высота '+fmt(r.elevation_m,1)+' м / уклон '+fmt(r.slope_pct,1)+'%'+(r.is_low_point?' / понижение':'');
 window.materialDetail?.corrosionMap(profileNow().rows,p.passport.length_m);window.materialDetail?.select(r.start_m/p.passport.length_m);renderCharts();renderEvidence();if(sceneMode==='unroll')renderUnroll();
 document.querySelectorAll('.queue-row').forEach(el=>el.classList.toggle('selected',Number(el.dataset.segment)===selectedSegment));
 history.replaceState(null,'',location.pathname+location.search+'#pipe='+p.pipe_id+'&segment='+r.segment_id);
}
function selectSegment(id){clearTimeout(inspectionTimer);if(!profileNow().rows.some(r=>r.segment_id===id))return;selectionActive=true;$('detail').classList.remove('entry-empty');$('chat-scope').options[0].disabled=false;selectedSegment=id;renderSegment();updateInspectionAction();}
function stepSegment(delta){const rows=profileNow().rows,index=rows.findIndex(r=>r.segment_id===selectedSegment),next=rows[index+delta];if(next)chooseQueueSegment(next.segment_id);}
function jumpDistance(){const val=Number($('distance-input').value);const r=profileNow().rows.find(r=>val>=r.start_m&&val<r.end_m);if(r)selectSegment(r.segment_id);else message('Расстояние за пределами трубы');}
function toggleQueue(open=$('priority-panel').hidden){if(open)toggleChat(false);$('priority-panel').hidden=!open;document.querySelector('.queue-trigger').setAttribute('aria-expanded',String(open));if(!open&&$('priority-panel').contains(document.activeElement))document.querySelector('.queue-trigger').focus();}
function renderQueue(){
 let rows=priorityRows();if($('queue-order').value==='distance')rows.sort((a,b)=>a.start_m-b.start_m);
 if($('queue-kind').value==='groups'){
  const ordered=[...rows].sort((a,b)=>a.start_m-b.start_m),groups=[];for(const r of ordered){const g=groups.at(-1);if(g&&Math.abs(g.end-r.start_m)<.1){g.end=r.end_m;g.rows.push(r);}else groups.push({start:r.start_m,end:r.end_m,rows:[r]});}
  if($('queue-order').value==='priority')groups.sort((a,b)=>Math.min(...a.rows.map(r=>r.forecast_mm))-Math.min(...b.rows.map(r=>r.forecast_mm)));
  $('priority-list').innerHTML=groups.map(g=>{const min=g.rows.reduce((a,b)=>a.forecast_mm<b.forecast_mm?a:b);return `<button class="queue-row" data-segment="${min.segment_id}" onclick="chooseQueueSegment(${min.segment_id})"><span class="queue-location"><strong>${fmt(g.start,0)}–${fmt(g.end,0)} м</strong><small>${g.rows.length} участков</small></span><span class="queue-thickness">${fmt(min.forecast_mm)}</span></button>`;}).join('');
 }else $('priority-list').innerHTML=rows.map(r=>`<button class="queue-row${selectionActive&&r.segment_id===selectedSegment?' selected':''}" data-segment="${r.segment_id}" onclick="chooseQueueSegment(${r.segment_id})"><span class="queue-location"><strong>Участок ${r.segment_id}</strong><small>${rangeText(r)}</small></span><span class="queue-thickness">${fmt(r.forecast_mm)}</span></button>`).join('');
}
function setComparison(value){comparison=value;renderSegment();}
function setChartScope(value){chartScope=value;$('scope-local').classList.toggle('active',value==='local');$('scope-full').classList.toggle('active',value==='full');renderCharts();}
function chartRows(){const rows=profileNow().rows,index=rows.findIndex(r=>r.segment_id===selectedSegment);return chartScope==='full'?rows:rows.slice(Math.max(0,index-4),Math.min(rows.length,index+5));}
function renderCharts(){
 if($('pipe-charts').hidden)return;
 const rows=chartRows(),p=pipeNow(),w=Math.max(280,$('thickness-chart').clientWidth),h=190,left=40,right=w-12,top=14,bottom=158,minX=rows[0].start_m,maxX=rows.at(-1).end_m;
 const x=v=>left+(v-minX)/(maxX-minX)*(right-left),maxY=Math.max(p.passport.nominal_wall_mm,...rows.map(r=>r.p90_mm),...rows.flatMap(r=>r.observations.map(o=>o.residual_mm||0)))*1.08,y=v=>bottom-v/maxY*(bottom-top);
 let grid='',band='',forecast='',observations='',hits='';
 for(let i=0;i<4;i++){const v=maxY*i/3,py=y(v);grid+=`<line x1="${left}" x2="${right}" y1="${py}" y2="${py}" stroke="#30382d"/><text x="0" y="${py+4}">${fmt(v,1)}</text>`;}
 for(const r of rows){const a=x(r.start_m),b=x(r.end_m),v=r.observations.find(o=>o.run_date===comparison)?.residual_mm,obs=comparison==='nominal'?p.passport.nominal_wall_mm:v;band+=`<rect x="${a}" y="${y(r.p90_mm)}" width="${Math.max(.6,b-a)}" height="${Math.max(.5,y(r.p10_mm)-y(r.p90_mm))}" fill="#bfcab4" opacity=".12"/>`;forecast+=`M${a},${y(r.forecast_mm)}H${b}`;if(obs!=null)observations+=`M${a},${y(obs)}H${b}`;hits+=`<rect class="chart-hit" role="button" tabindex="0" aria-label="${rangeText(r)}, ${fmt(r.forecast_mm)} мм" onclick="chooseQueueSegment(${r.segment_id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();chooseQueueSegment(${r.segment_id})}" x="${a}" y="${top}" width="${Math.max(1,b-a)}" height="${bottom-top}"><title>${rangeText(r)} / ${fmt(r.forecast_mm)} мм</title></rect>`;}
 const selected=rowNow(),selX=x((selected.start_m+selected.end_m)/2),marker=selX>=left&&selX<=right?`<line x1="${selX}" x2="${selX}" y1="${top}" y2="${bottom}" stroke="#b6c6a5" stroke-dasharray="3 4"/><circle cx="${selX}" cy="${y(selected.forecast_mm)}" r="3" fill="#fff"/>`:'';
 $('thickness-chart').innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="group" aria-label="Прогноз толщины и обследования, мм"><text x="0" y="10">мм</text>${grid}${band}<path d="${observations}" fill="none" stroke="#a18568" stroke-width="1.4"/><path d="${forecast}" fill="none" stroke="#e6eade" stroke-width="1.8"/>${marker}${hits}<text x="${left}" y="183">${fmt(minX,0)} м</text><text x="${right}" y="183" text-anchor="end">${fmt(maxX,0)} м</text></svg>`;
 $('comparison-legend').textContent=comparison==='nominal'?'Номинал':'ВТД '+date(comparison);
 const elevations=rows.map(r=>r.elevation_m).filter(v=>v!=null),low=Math.min(...elevations)-.3,high=Math.max(...elevations)+.3,ey=v=>75-(v-low)/(high-low)*55;
 let path='',epoints='';for(const r of rows){if(r.elevation_m==null)continue;const xx=x((r.start_m+r.end_m)/2),yy=ey(r.elevation_m);path+=(path?'L':'M')+xx+','+yy;if(r.segment_id===selectedSegment)epoints+=`<circle cx="${xx}" cy="${yy}" r="3" fill="#bbc9aa"/>`;}
 $('elevation-chart').innerHTML=`<svg viewBox="0 0 ${w} 105" role="img" aria-label="Высотный профиль, метры"><line x1="${left}" x2="${right}" y1="75" y2="75" stroke="#30382d"/><path d="${path}" fill="none" stroke="#849478" stroke-width="1.5"/>${epoints}<text x="0" y="24">${fmt(high,1)}</text><text x="0" y="78">${fmt(low,1)}</text><text x="${left}" y="100">${fmt(minX,0)} м</text><text x="${right}" y="100" text-anchor="end">${fmt(maxX,0)} м</text></svg>`;
}
function renderEvidence(){
 const p=pipeNow(),r=rowNow(),detail=workspaceData.details[p.pipe_id+'/'+r.segment_id];
 $('observations-table').innerHTML=r.observations.length?`<div class="table-scroll"><table><thead><tr><th>Дата</th><th>Стенка, мм</th><th>Дефекты</th><th>Глубина, %</th></tr></thead><tbody>${r.observations.map(o=>`<tr><td>${date(o.run_date)}</td><td>${fmt(o.residual_mm)}</td><td>${o.n_metal_loss}</td><td>${fmt(o.max_depth_pct,1)}</td></tr>`).join('')}</tbody></table></div>`:'<p>Предыдущего ВТД нет.</p>';
 $('features-table').innerHTML=detail?.features?.length?`<div class="table-scroll"><table><thead><tr><th>Признак</th><th>Участок</th><th>Медиана</th><th>Важность</th></tr></thead><tbody>${detail.features.map(f=>`<tr><td>${escapeText(workspaceData.featureNames[f.name]||f.name)}</td><td>${fmt(f.value)}</td><td>${fmt(f.pipe_median)}</td><td>${fmt(f.share*100,1)}%</td></tr>`).join('')}</tbody></table></div>`:'<p>Нет данных о признаках.</p>';
}
function renderPassport(){const p=pipeNow(),v=p.passport;$('passport-data').innerHTML=metric('Труба',p.pipe_id)+metric('Длина',fmt(v.length_m,0)+' м')+metric('Диаметр',fmt(v.diameter_mm,0)+' мм')+metric('Сталь',escapeText(v.steel_grade))+metric('Среда',escapeText(v.medium))+metric('Ввод',date(v.commissioned_at))+metric('Внутреннее покрытие',v.has_inner_coating?'Есть':'Нет')+metric('Ингибитор',v.is_inhibited?'Есть':'Нет')+metric('Отбраковочная стенка',fmt(v.reject_wall_mm)+' мм');$('source-note').textContent='Модель '+p.predictor+'. Снимок '+profileNow().snapshot_id+'. Прогноз на '+date(p.target_date)+'. Номинал — паспорт; обследования — ВТД. Сохранённые данные API для просмотра макета.';}
function setSceneMode(mode){sceneMode=mode;$('detail').classList.toggle('unroll-active',mode==='unroll');$('material-detail').hidden=mode==='unroll';$('unroll-view').hidden=mode!=='unroll';window.materialDetail?.cut(mode==='cut');[['outside','route'],['unroll-button','unroll']].forEach(([id,value])=>$(id).classList.toggle('active',mode===value));if(mode==='unroll')renderUnroll();updateInspectionAction();}
function renderUnroll(){
 renderUnrollSurface();
 const rows=profileNow().rows,low=Math.min(...rows.map(r=>r.forecast_mm)),high=pipeNow().passport.nominal_wall_mm;
 const color=v=>{const t=Math.max(0,Math.min(1,(v-low)/(high-low||1)));const a=[196,128,82],b=[56,65,73];return 'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')+')';};
 const groups=[];for(let i=0;i<rows.length;i+=50){const group=rows.slice(i,i+50);groups.push('<div class="unroll-row"><span class="unroll-distance">'+fmt(group[0].start_m,0)+' м</span><div class="unroll-cells">'+group.map(r=>`<button class="${selectionActive&&r.segment_id===selectedSegment?'selected':''}" style="background:${color(r.forecast_mm)}" title="Участок ${r.segment_id} · ${rangeText(r)} · ${fmt(r.forecast_mm)} мм" aria-label="Участок ${r.segment_id}, ${rangeText(r)}, ${fmt(r.forecast_mm)} мм" onclick="chooseQueueSegment(${r.segment_id})"></button>`).join('')+'</div><span class="unroll-distance end">'+fmt(group.at(-1).end_m,0)+' м</span></div>');}
 $('unroll-grid').innerHTML=groups.join('');document.querySelector('.unroll-scale').innerHTML='<span>'+fmt(low)+' мм</span><i></i><span>'+fmt(high)+' мм</span>';
}
function resetScene(){window.materialDetail?.reset();if(!selectionActive)window.materialDetail?.clearSelection();}
function toggleFocus(){const on=$('detail').classList.toggle('scene-focused');$('focus-scene').setAttribute('aria-pressed',on);$('focus-scene').textContent=on?'Обычный вид':'Крупнее';}
function toggleChat(open){const drawer=$('chat-drawer');$('detail').classList.toggle('chat-visible',open);$('chat-resume').hidden=true;storeDraft();updateChatContext();if(open){toggleQueue(false);chatTrigger=document.activeElement;drawer.inert=false;drawer.classList.add('open');$('chat-open').setAttribute('aria-expanded','true');requestAnimationFrame(()=>requestAnimationFrame(()=>{if(drawer.classList.contains('open'))$('chat-text').focus();}));}else{drawer.classList.remove('open');drawer.inert=true;$('chat-open').setAttribute('aria-expanded','false');if(chatTrigger?.isConnected)chatTrigger.focus();}}
function sessionNow(){const key=String(pipeNow().pipe_id);if(!chatSessions.has(key))chatSessions.set(key,{draft:'',messages:[]});return chatSessions.get(key);}
function storeDraft(){if(workspaceData&&$('chat-text'))sessionNow().draft=$('chat-text').value;}
function renderChat(){const session=sessionNow();$('chat-text').value=session.draft;updateChatSend();updateChatContext();if(session.messages.length)$('chat-history').innerHTML=session.messages.map(m=>`<div class="chat-message ${m.error?'error':''}"><small>${m.error?'Соединение':'Вы'}</small>${escapeText(m.text)}</div>`).join('');else $('chat-history').innerHTML='<div class="chat-empty"><h3>Что проверим?</h3><div class="chat-suggestions"><button onclick="suggestQuestion(\'Объясни приоритет этого участка\')">Приоритет участка</button><button onclick="suggestQuestion(\'Сравни с последним ВТД\')">Изменения после ВТД</button><button onclick="suggestQuestion(\'Сравни этот участок с соседними\')">Соседние участки</button></div></div>';updateChatSuggestions();}
function suggestQuestion(text){$('chat-text').value=text;storeDraft();updateChatSend();$('chat-text').focus();}
function sendQuestion(){const text=$('chat-text').value.trim();if(!text)return;const session=sessionNow(),context=$('chat-scope').value==='pipe'?'Вся труба':rangeText(rowNow());session.messages.push({text:context+'\n'+text},{error:true,text:'Ассистент не подключён к этому макету. Вопрос сохранён; ответ не сформирован.'});session.draft='';renderChat();$('chat-history').scrollTop=$('chat-history').scrollHeight;}
function downloadData(priorities){const rows=priorities?priorityRows():profileNow().rows;const csv='pipe_id,segment_id,start_m,end_m,forecast_mm,p10_mm,p90_mm,priority_rank\n'+rows.map(r=>[pipeNow().pipe_id,r.segment_id,r.start_m,r.end_m,r.forecast_mm,r.p10_mm,r.p90_mm,r.priority_rank??''].join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=pipeNow().pipe_id+(priorities?'-priorities':'-forecast')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('chat-drawer').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();toggleChat(false);}if(event.key==='Tab'){const items=[...$('chat-drawer').querySelectorAll('button,textarea,select')].filter(el=>!el.disabled),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(workspaceData&&$('detail').style.display==='block')renderCharts();},100);});
window.onSceneReady=()=>{if(workspaceData&&$('detail').style.display==='block'){window.materialDetail.corrosionMap(profileNow().rows,pipeNow().passport.length_m);window.materialDetail.name(pipeNow().passport.direction);if(selectionActive)window.materialDetail.select(rowNow().start_m/pipeNow().passport.length_m);else window.materialDetail.clearSelection();}};
(async()=>{try{const bytes=Uint8Array.from(atob($('workspace-snapshot').textContent.trim()),c=>c.charCodeAt(0));workspaceData=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());document.documentElement.dataset.workspaceReady='true';const params=new URLSearchParams(location.hash.slice(1)),index=workspaceData.pipes.items.findIndex(p=>String(p.pipe_id)===params.get('pipe'));if(index>=0){openPipe(index);}}catch(error){console.error(error);message('Не удалось загрузить данные макета. Обновите страницу.');}})();

document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('chat-drawer').classList.contains('open')){event.preventDefault();toggleChat(false);}});

let inspectionTimer;
function scheduleInspection(){document.querySelector('.segment-entry').classList.add('editing');document.querySelector('.segment-entry').classList.remove('submitted');clearTimeout(inspectionTimer);$('segment-input-note').textContent='';$('distance-input').setAttribute('aria-invalid','false');}
function inspectSegment(){clearTimeout(inspectionTimer);const input=$('distance-input'),raw=input.value.trim(),id=Number(raw),rows=profileNow().rows;let error='';if(input.validity.badInput)error='Введите целый номер участка';else if(!raw)error='Введите номер участка';else if(!Number.isInteger(id))error='Введите целый номер участка';else if(!rows.some(r=>r.segment_id===id))error='Введите номер от '+rows[0].segment_id+' до '+rows.at(-1).segment_id;input.setAttribute('aria-invalid',String(Boolean(error)));$('segment-input-note').textContent=error;if(error){input.focus({preventScroll:true});return;}selectSegment(id);document.querySelector('.segment-entry').classList.remove('editing');document.querySelector('.segment-entry').classList.toggle('submitted',document.querySelector('.segment-entry').matches(':hover'));input.blur();if(sceneMode==='route')window.materialDetail?.inspect(rowNow().start_m/pipeNow().passport.length_m);else if(sceneMode==='unroll')document.querySelector('#unroll-grid .selected')?.scrollIntoView({block:'nearest',behavior:'smooth'});}

window.onInspectionPhase=phase=>{inspectionPhase=phase;updateInspectionAction();const labels={approach:'Осмотр нижней стенки',corrosion:'Область коррозии',opening:'Раскрытие стенки',leak:'Поток через дефект'};$('inspection-status').hidden=phase==='idle';$('inspection-phase').textContent=labels[phase]||'';};

function clearSelection(){document.querySelector('.segment-entry').classList.remove('editing','submitted');selectionActive=false;clearTimeout(inspectionTimer);$('detail').classList.add('entry-empty');$('distance-input').value='';$('distance-input').setAttribute('aria-invalid','false');$('segment-input-note').textContent='';toggleQueue(false);window.materialDetail?.clearSelection();$('chat-context').textContent=pipeNow().passport.direction;$('chat-scope').value='pipe';$('chat-scope').options[0].disabled=true;history.replaceState(null,'',location.pathname+location.search+'#pipe='+pipeNow().pipe_id);}

document.addEventListener('pointerdown',event=>{if(!event.target.closest('.queue-menu'))toggleQueue(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('priority-panel').hidden){event.preventDefault();toggleQueue(false);}});

document.querySelector('.segment-entry').addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'&&selectionActive)cancelSegmentEdit();event.currentTarget.classList.remove('submitted');});

function chooseQueueSegment(id){selectSegment(id);toggleQueue(false);if(sceneMode==='route')window.materialDetail?.inspect(rowNow().start_m/pipeNow().passport.length_m);}

function updateInspectionAction(){$('inspect-again').hidden=!selectionActive||sceneMode!=='route'||inspectionPhase!=='idle';}
function inspectCurrentSegment(){if(selectionActive&&sceneMode==='route')window.materialDetail?.inspect(rowNow().start_m/pipeNow().passport.length_m);}
function cancelSegmentEdit(){const form=document.querySelector('.segment-entry');$('distance-input').value=selectionActive?selectedSegment:'';$('distance-input').setAttribute('aria-invalid','false');$('segment-input-note').textContent='';form.classList.remove('editing');form.classList.toggle('submitted',form.matches(':hover'));$('distance-input').blur();}
document.querySelector('.segment-entry').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelSegmentEdit();}});
document.querySelector('.segment-entry').addEventListener('focusout',event=>{if(!event.currentTarget.contains(event.relatedTarget))cancelSegmentEdit();});
document.querySelector('.segment-entry>div').addEventListener('click',event=>{if(event.target.closest('button')||event.target===$('distance-input'))return;$('distance-input').focus();$('distance-input').select();});

function minimizeChat(){toggleChat(false);$('chat-resume').hidden=false;$('chat-resume').focus();}
function updateChatSend(){$('chat-submit').disabled=!$('chat-text').value.trim();}
function updateChatContext(){if(!workspaceData)return;const scoped=selectionActive&&$('chat-scope').value==='segment';$('chat-context').textContent=scoped?'Участок '+selectedSegment+' · '+rangeText(rowNow()):pipeNow().passport.direction+' · вся труба';updateChatSuggestions();}
$('chat-text').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();sendQuestion();}});

function updateChatSuggestions(){const host=document.querySelector('.chat-suggestions');if(!host)return;const scoped=selectionActive&&$('chat-scope').value==='segment';const items=scoped?['Объяснить приоритет участка','Сравнить с последним ВТД','Проверить соседние участки']:['Какие участки проверить первыми?','Что известно о состоянии трубы?','Каких данных не хватает?'];host.innerHTML=items.map(text=>'<button onclick="suggestQuestion('+escapeText(JSON.stringify(text))+')">'+escapeText(text)+'</button>').join('');}

function toggleCharts(open=$('pipe-charts').hidden){$('pipe-charts').hidden=!open;$('charts-toggle').setAttribute('aria-expanded',String(open));$('charts-toggle').classList.toggle('active',open);if(open){renderCharts();$('pipe-charts').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}
document.querySelector('.segment-entry').addEventListener('pointerenter',event=>{if(event.pointerType!=='mouse'||!selectionActive)return;event.currentTarget.classList.remove('submitted');$('distance-input').focus({preventScroll:true});});

function setChatSide(left){$('detail').classList.toggle('chat-left',left);$('chat-side').setAttribute('aria-label',left?'Переместить чат вправо':'Переместить чат влево');$('chat-side').title=left?'Переместить чат вправо':'Переместить чат влево';}
function setChatWidth(width){const next=Math.round(Math.max(280,Math.min(480,width,innerWidth*.45)));$('detail').style.setProperty('--chat-width',next+'px');document.querySelector('.chat-resizer').setAttribute('aria-valuenow',String(next));}
const chatHeader=document.querySelector('.chat-top'),chatResizer=document.querySelector('.chat-resizer');
let chatDrag=null;
chatHeader.addEventListener('pointerdown',event=>{if(event.target.closest('button')||innerWidth<=700||event.button!==0)return;chatDrag={id:event.pointerId,start:event.clientX};chatHeader.setPointerCapture(event.pointerId);chatHeader.classList.add('dragging');});
chatHeader.addEventListener('pointermove',event=>{if(!chatDrag)return;if(Math.abs(event.clientX-chatDrag.start)>30)setChatSide(event.clientX<innerWidth/2);});
function finishChatDrag(){chatDrag=null;chatHeader.classList.remove('dragging');}
chatHeader.addEventListener('pointerup',finishChatDrag);chatHeader.addEventListener('pointercancel',finishChatDrag);
let chatResize=null;
chatResizer.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();chatResize={x:event.clientX,width:$('chat-drawer').getBoundingClientRect().width};chatResizer.setPointerCapture(event.pointerId);document.body.classList.add('resizing-chat');});
chatResizer.addEventListener('pointermove',event=>{if(!chatResize)return;const direction=$('detail').classList.contains('chat-left')?1:-1;setChatWidth(chatResize.width+(event.clientX-chatResize.x)*direction);});
function finishChatResize(){chatResize=null;document.body.classList.remove('resizing-chat');}
chatResizer.addEventListener('pointerup',finishChatResize);chatResizer.addEventListener('pointercancel',finishChatResize);
chatResizer.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();const left=$('detail').classList.contains('chat-left');setChatWidth(event.key==='Home'?320:$('chat-drawer').getBoundingClientRect().width+(event.key==='ArrowRight'?1:-1)*(left?1:-1)*24);});
