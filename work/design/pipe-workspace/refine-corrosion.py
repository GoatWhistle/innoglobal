from pathlib import Path
p=Path('.superdesign/tmp/fleet-workspace.html');s=p.read_text()
s=s.replace('uniform float defectX;uniform float corrosion;', 'uniform sampler2D damageMap;uniform float overviewDamage;uniform float defectX;uniform float corrosion;')
s=s.replace('float pits=fbm(vec2(p.x*40.,p.z*55.));', '''float mapValue=texture2D(damageMap,vec2(clamp((p.x+5.1)/10.2,0.,1.),.5)).r;
 float lowerWall=(1.-smoothstep(.16,.5,abs(p.z)))*(1.-smoothstep(-.65,-.3,p.y));
 float surrounding=mapValue*lowerWall*(.25+.75*grain)*overviewDamage;
 corrosionMask=max(corrosionMask,surrounding);
 float pits=fbm(vec2(p.x*40.,p.z*55.));''')
s=s.replace(' const wallMat=new', ''' const damagePixels=new Uint8Array(2048*4);const damageMap=new THREE.DataTexture(damagePixels,2048,1);damageMap.needsUpdate=true;damageMap.minFilter=THREE.LinearFilter;damageMap.magFilter=THREE.LinearFilter;
 function corrosionMap(rows,length){damagePixels.fill(0);for(const row of rows){if(row.priority_rank==null)continue;const start=Math.floor(row.start_m/length*2047),end=Math.ceil(row.end_m/length*2047);for(let i=Math.max(0,start-10);i<=Math.min(2047,end+10);i++){const distance=Math.max(start-i,i-end,0);const value=Math.round(220*Math.exp(-distance*distance/24));damagePixels[i*4]=Math.max(damagePixels[i*4],value);damagePixels[i*4+3]=255;}}damageMap.needsUpdate=true;host.dataset.corrosionCount=rows.filter(r=>r.priority_rank!=null).length;}
 const wallMat=new''')
s=s.replace('defectX:{value:0},corrosion:', 'damageMap:{value:damageMap},overviewDamage:{value:0},defectX:{value:0},corrosion:')
s=s.replace('return{inspect:startInspection', 'return{corrosionMap,inspect:startInspection')
s=s.replace('window.flowPaused=reduced.matches;', 'window.flowPaused=false;')
s=s.replace('d<rupture*jag','d<rupture*jag*.49')
s=s.replace('return{corrosionMap,inspect:', 'return{clearSelection(){clearInspection();if(marker)marker.visible=false;wallMat.uniforms.corrosion.value=0;wallMat.uniforms.overviewDamage.value=0;},corrosionMap,inspect:')
s=s.replace('-5.1+', '-4.4+').replace('*10.2', '*8.8').replace('(p.x+5.1)/10.2', '(p.x+4.4)/8.8')
s=s.replace("e=>{inspection=null;pointer=", "e=>{if(inspection)inspection.manual=true;pointer=")
p.write_text(s)
