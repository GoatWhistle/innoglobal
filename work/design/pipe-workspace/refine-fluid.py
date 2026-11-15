from pathlib import Path
import re
p=Path('.superdesign/tmp/fleet-workspace.html');s=p.read_text()
a=s.index(' const oilVertex=');b=s.index('const oilMat=',a)
s=s[:a]+''' const oilVertex=`varying vec3 p;varying vec3 n;uniform float time;uniform vec2 slosh;uniform float agitation;uniform float motionTime;uniform vec3 liquidUp;uniform float fillPlane;uniform float gravityEnabled;
void main(){vec3 pos=position;float radial=max(length(liquidUp.yz),.001);vec2 up=liquidUp.yz/radial;vec2 side=vec2(-up.y,up.x);float h=dot(pos.yz,up),w=dot(pos.yz,side);float level=clamp((fillPlane-liquidUp.x*pos.x)/radial,-.584,.584);float wave=sin(w*8.-motionTime*4.2+pos.x*.9)*.62+sin(w*13.+motionTime*3.2-pos.x*1.3)*.26+sin(pos.x*2.8-motionTime*2.7)*.12;float ripple=sin((pos.x-time*.85)*1.9+w*2.)*.017+sin((pos.x-time*.42)*3.1)*.007;float surface=level+slosh.x*w+slosh.y*sin(pos.x*.6)+agitation*wave+ripple;
if(gravityEnabled>.5){h=min(h,clamp(surface,-.584,.584));float breadth=sqrt(max(.585*.585-h*h,0.));w=clamp(w,-breadth,breadth);pos.yz=up*h+side*w;}else{pos.y+=ripple;}
p=pos;n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);}`;''' +s[b:]
s=s.replace('motionTime:{value:0}},side:', 'motionTime:{value:0},liquidUp:{value:new THREE.Vector3(0,1,0)},fillPlane:{value:.22},gravityEnabled:{value:detail?1:0}},side:')
s=re.sub(r'if\(detail\)\{const points=oilGeometry.attributes.position;.*?oilGeometry.computeVertexNormals\(\);\}', '',s)
setup='''const liquidUp=new THREE.Vector3(0,1,0),targetUp=new THREE.Vector3(),inverseRotation=new THREE.Quaternion();
function updateLiquid(dt){if(!detail)return;inverseRotation.copy(group.quaternion).invert();targetUp.set(0,1,0).applyQuaternion(inverseRotation);liquidUp.lerp(targetUp,1-Math.exp(-dt*5)).normalize();const radial=Math.max(Math.hypot(liquidUp.y,liquidUp.z),.001);let lo=-6,hi=6;const area=h=>{const v=Math.max(-1,Math.min(1,h/.585));return (Math.asin(v)+v*Math.sqrt(1-v*v)+Math.PI/2)/Math.PI;};for(let j=0;j<18;j++){const mid=(lo+hi)/2;let volume=0;for(let i=0;i<32;i++)volume+=area((mid-liquidUp.x*((i+.5)/32-.5)*11.09)/radial);if(volume/32<area(.22))lo=mid;else hi=mid;}oilMat.uniforms.liquidUp.value.copy(liquidUp);oilMat.uniforms.fillPlane.value=(lo+hi)/2;host.dataset.liquidUp=liquidUp.toArray().map(v=>v.toFixed(3)).join(',');}
'''
s=s.replace('let agitation=0,motionTime=0;',setup+'let agitation=0,motionTime=0;')
s=s.replace('tickInspection(delta,clock);renderer.render','tickInspection(delta,clock);updateLiquid(delta);renderer.render')
s=s.replace('wallMat.uniforms.corrosion.value=0;','wallMat.uniforms.corrosion.value=0;')
s=s.replace('if(marker)marker.position.x=-5.1+Math.max(0,Math.min(1,fraction))*10.2;', 'if(marker){marker.position.x=-5.1+Math.max(0,Math.min(1,fraction))*10.2;wallMat.uniforms.defectX.value=marker.position.x;}')
s=s.replace('float corrosionMask=(1.-smoothstep(.75,1.45,d))*step(p.y,-.35)*corrosion;', 'float grain=fbm(vec2(p.x*14.,p.z*22.));float corrosionMask=(1.-smoothstep(.45,1.65,d+(grain-.5)*.7))*smoothstep(-.3,-.65,p.y)*corrosion;')
s=s.replace('color=mix(color,vec3(.13,.075,.033)+pits*.045,corrosionMask);', 'float cavities=smoothstep(.5,.68,pits);vec3 patina=mix(vec3(.18,.115,.065),vec3(.025,.028,.025),cavities);patina+=smoothstep(.46,.5,pits)*(1.-smoothstep(.5,.54,pits))*.1;color=mix(color,patina,corrosionMask);')
s=s.replace('function updateLiquid(dt){if(!detail)return;', 'function updateLiquid(dt){if(!detail)return;if(!inspection){const axis=new THREE.Vector3(1,0,0).applyQuaternion(group.quaternion),extentY=Math.abs(axis.y)*5.6+1.1,extentX=Math.abs(axis.x)*5.6+1.1;const fit=Math.min(1,(camera.top-camera.bottom)*.46/extentY,(camera.right-camera.left)*.46/extentX);camera.zoom=THREE.MathUtils.lerp(camera.zoom,fit,1-Math.exp(-dt*8));camera.updateProjectionMatrix();}')
p.write_text(s)
