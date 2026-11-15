const surfaceCache=new Map();
function makeUnrollSurface(){
 const key=pipeNow().pipe_id;if(surfaceCache.has(key))return surfaceCache.get(key);
 const rows=profileNow().rows,w=1400,h=280,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d'),image=ctx.createImageData(w,h),field=new Float32Array(w*h),low=Math.min(...rows.map(r=>r.forecast_mm)),high=pipeNow().passport.nominal_wall_mm;
 const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7+Number(key)%997)*43758.5453;return n-Math.floor(n)};
 const noise=(x,y)=>{const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,s=u*u*(3-2*u),t=v*v*(3-2*v);return (hash(a,b)*(1-s)+hash(a+1,b)*s)*(1-t)+(hash(a,b+1)*(1-s)+hash(a+1,b+1)*s)*t};
 for(let x=0;x<w;x++){
  const index=x/(w-1)*(rows.length-1),base=Math.floor(index),fraction=index-base;
  let value=0;for(let k=-3;k<=3;k++)value+=(rows[Math.max(0,Math.min(rows.length-1,base+k))].forecast_mm*(1-fraction)+rows[Math.max(0,Math.min(rows.length-1,base+k+1))].forecast_mm*fraction)/7;
  const severity=Math.max(0,Math.min(1,(high-value)/(high-low||1))),center=.49+Math.sin(x/w*17)*.065+Math.sin(x/w*39)*.028;
  for(let y=0;y<h;y++){
   const n=noise(x/38,y/25)*.52+noise(x/13,y/11)*.3+noise(x/4,y/4)*.18;
   const distance=(y/h-center)/(.10+severity*.13),strength=Math.exp(-distance*distance*2)*(severity*.9+.1)*(n*.85+.5);
   field[y*w+x]=strength;
   const rust=Math.max(0,Math.min(1,(strength-.19)*1.7)),grain=hash(x,y)*5,brush=Math.sin(y*2.4)*1.5;
   const steel=[37,45,50],copper=[174,74,29],i=(y*w+x)*4;
   for(let c=0;c<3;c++)image.data[i+c]=steel[c]+(copper[c]-steel[c])*rust+grain+brush;
   image.data[i+3]=255;
  }
 }
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const v=field[y*w+x],next=field[y*w+x+1],down=field[(y+1)*w+x];
  for(const level of [.12,.25,.4,.58,.76])if((v-level)*(next-level)<0||(v-level)*(down-level)<0){const i=(y*w+x)*4;image.data[i]=Math.min(230,image.data[i]+68);image.data[i+1]+=51;image.data[i+2]+=38;break}
 }
 ctx.putImageData(image,0,0);ctx.lineWidth=1;
 for(let i=0;i<=16;i++){const x=Math.round(i*w/16)+.5;ctx.strokeStyle='#c6d1d319';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();ctx.strokeStyle='#0e141777';ctx.beginPath();ctx.moveTo(x+3,0);ctx.lineTo(x+3,h);ctx.stroke()}
 for(let i=1;i<4;i++){ctx.strokeStyle='#d2d7d319';ctx.beginPath();ctx.moveTo(0,i*h/4+.5);ctx.lineTo(w,i*h/4+.5);ctx.stroke()}
 surfaceCache.set(key,canvas);return canvas;
}
function showSurfaceMarker(row,preview=false){
 const marker=$('surface-marker'),position=(row.start_m+row.end_m)/2/pipeNow().passport.length_m*100;
 marker.hidden=false;marker.style.left=position+'%';marker.classList.toggle('preview',preview);marker.classList.toggle('at-start',position<16);marker.classList.toggle('at-end',position>84);
 $('surface-value').innerHTML='<span>Участок '+row.segment_id+' · '+rangeText(row)+'</span><strong>'+fmt(row.forecast_mm)+' <small>мм</small></strong>';
}
function renderUnrollSurface(){
 const canvas=$('surface-canvas'),texture=makeUnrollSurface();canvas.width=texture.width;canvas.height=texture.height;canvas.getContext('2d').drawImage(texture,0,0);
 const rows=profileNow().rows,p=pipeNow();$('surface-end').textContent=fmt(p.passport.length_m,0)+' м';
 const surface=$('surface-map');surface.setAttribute('aria-valuemin',rows[0].segment_id);surface.setAttribute('aria-valuemax',rows.at(-1).segment_id);surface.setAttribute('aria-valuenow',selectionActive?selectedSegment:rows[0].segment_id);surface.setAttribute('aria-valuetext',selectionActive?'Участок '+selectedSegment+', '+rangeText(rowNow())+', '+fmt(rowNow().forecast_mm)+' мм':'Выберите участок');
 if(selectionActive)showSurfaceMarker(rowNow());else $('surface-marker').hidden=true;
}
function surfaceRow(event){const box=$('surface-map').getBoundingClientRect(),distance=Math.max(0,Math.min(.999999,(event.clientX-box.left)/box.width))*pipeNow().passport.length_m;return profileNow().rows.find(r=>distance>=r.start_m&&distance<r.end_m)||profileNow().rows.at(-1)}
$('surface-map').addEventListener('pointermove',event=>{if(event.pointerType==='mouse')showSurfaceMarker(surfaceRow(event),true)});
$('surface-map').addEventListener('pointerleave',()=>{if(selectionActive)showSurfaceMarker(rowNow());else $('surface-marker').hidden=true});
$('surface-map').addEventListener('click',event=>chooseQueueSegment(surfaceRow(event).segment_id));
$('surface-map').addEventListener('keydown',event=>{
 const rows=profileNow().rows,index=selectionActive?rows.findIndex(r=>r.segment_id===selectedSegment):0;
 const target={ArrowLeft:Math.max(0,index-1),ArrowRight:Math.min(rows.length-1,index+1),Home:0,End:rows.length-1}[event.key];
 if(target!==undefined){event.preventDefault();chooseQueueSegment(rows[target].segment_id)}
});
