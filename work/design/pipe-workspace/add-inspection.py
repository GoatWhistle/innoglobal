from pathlib import Path
p=Path('.superdesign/tmp/fleet-workspace.html');s=p.read_text()
if 'const defectRoot=' in s: raise SystemExit(0)
s=s.replace('varying vec3 p;varying vec3 n;uniform float cut;uniform float time;', 'varying vec3 p;varying vec3 n;uniform float cut;uniform float time;uniform float defectX;uniform float corrosion;uniform float rupture;${noise}')
s=s.replace('if(cut>.5&&p.z>0.&&p.y>-.12)discard;', '''if(cut>.5&&p.z>0.&&p.y>-.12)discard;
 float d=length(vec2((p.x-defectX)/.52,p.z/.26));float jag=1.+.06*sin(atan(p.z,p.x-defectX)*7.);
 if(p.y<-.35&&d<rupture*jag)discard;''')
s=s.replace('gl_FragColor=vec4(color,.13+edge*.65+soft*.13+strip*.38+underside*.17);', '''float corrosionMask=(1.-smoothstep(.75,1.45,d))*step(p.y,-.35)*corrosion;
 float pits=fbm(vec2(p.x*40.,p.z*55.));color=mix(color,vec3(.13,.075,.033)+pits*.045,corrosionMask);
 gl_FragColor=vec4(color,max(.13+edge*.65+soft*.13+strip*.38+underside*.17,corrosionMask*.94));''')
s=s.replace('uniforms:{cut:{value:0},time:{value:0}}','uniforms:{cut:{value:0},time:{value:0},defectX:{value:0},corrosion:{value:0},rupture:{value:0}}')
s=s.replace('let clock=2,lastTime=0;',Path('.superdesign/tmp/inspection-scene.js').read_text()+'\nlet clock=2,lastTime=0;')
s=s.replace('wallMat.uniforms.time.value=clock;renderer.render','wallMat.uniforms.time.value=clock;tickInspection(delta,clock);renderer.render')
s=s.replace("return{select(fraction){if(marker)","return{inspect:startInspection,cancelInspection:clearInspection,select(fraction){clearInspection();if(marker)")
s=s.replace('cut(on){wallMat.uniforms.cut.value','cut(on){clearInspection();wallMat.uniforms.cut.value')
s=s.replace('reset(){group.rotation.set(0,0,0);}','reset(){clearInspection();group.rotation.set(0,0,0);}')
s=s.replace('if(detail){let pointer;',"if(detail){let pointer;")
s=s.replace("host.addEventListener('pointerdown',e=>{pointer=","host.addEventListener('pointerdown',e=>{inspection=null;pointer=")
p.write_text(s)
