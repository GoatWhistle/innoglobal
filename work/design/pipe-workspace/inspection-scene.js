const defectRoot=new THREE.Group();group.add(defectRoot);defectRoot.visible=false;
const outline=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2,r=1+.06*Math.sin(a*7)+.035*Math.cos(a*11),z=.14*Math.sin(a)*r;outline.push(new THREE.Vector3(.25*Math.cos(a)*r,-Math.sqrt(.72*.72-z*z),z));}
const defectLip=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outline,true),96,.004,8,true),new THREE.MeshStandardMaterial({color:0x282720,metalness:.65,roughness:.4}));defectRoot.add(defectLip);
const discharge=new THREE.Group();defectRoot.add(discharge);discharge.position.set(0,-.69,0);
const streamMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 p;varying vec3 n;void main(){p=vec3(-position.y*1.6,position.x,position.z);n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:oilFragment,side:THREE.DoubleSide});
const meniscus=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),streamMaterial);meniscus.scale.set(.115,.15,.105);meniscus.renderOrder=4;discharge.add(meniscus);
const streamGeometry=new THREE.CylinderGeometry(1,1,1,24,72,true);const stream=new THREE.Mesh(streamGeometry,streamMaterial);stream.renderOrder=4;discharge.add(stream);
const streamBase=streamGeometry.attributes.position.array.slice();const streamPoints=streamGeometry.attributes.position;
const drops=[];for(let i=0;i<7;i++){const drop=new THREE.Mesh(new THREE.SphereGeometry(.026+i*.002,16,12),streamMaterial);drop.renderOrder=4;discharge.add(drop);drops.push(drop);}
const outletNormal=new THREE.Vector3();
function animateDischarge(time,opening){streamMaterial.uniforms.time.value=time;meniscus.scale.set(.115*Math.max(.02,opening),.15*Math.max(.02,opening),.105*Math.max(.02,opening));discharge.quaternion.copy(group.quaternion).invert();outletNormal.set(0,-1,0).applyQuaternion(group.quaternion);const length=3.8;
 for(let i=0;i<streamPoints.count;i++){const x=streamBase[i*3],u=.5-streamBase[i*3+1],z=streamBase[i*3+2],speed=Math.sqrt(1+u*7),pulse=1+.12*Math.sin(u*19-time*4.5)+.055*Math.sin(u*37-time*7.3),radius=(.083/Math.sqrt(speed))*(1-.38*u)*pulse*Math.max(.08,opening),neck=1-.28*Math.pow(Math.sin(u*11-time*3.2),8)*u;const bend=.035*u*u*Math.sin(time*1.1-u*3);const exit=-.13+.28*(1-Math.exp(-u*14));streamPoints.setXYZ(i,x*radius*neck+bend+outletNormal.x*exit,-u*length+outletNormal.y*exit,z*radius*(1+.15*Math.sin(u*13-time*2.3))+outletNormal.z*exit);}
 streamPoints.needsUpdate=true;streamGeometry.computeVertexNormals();
 for(let i=0;i<drops.length;i++){const age=(time*.65+i*.143)%1,drop=drops[i];drop.position.set(.02*Math.sin(i*2.7)+.035*age,-2.5-age*.5-age*age*1.8,.025*Math.cos(i*3.1));drop.scale.set(.8,1.25+age*.9,.8);drop.visible=opening>.2;}
}
let inspection=null,inspectionElapsed=0,inspectionPhase='';
const ease=v=>1-Math.pow(1-Math.max(0,Math.min(1,v)),3);
function clearInspection(){inspection=null;inspectionElapsed=0;inspectionPhase='';host.dataset.inspection='idle';defectRoot.visible=false;if(marker)marker.visible=false;label.visible=host.clientWidth>=600;wallMat.uniforms.corrosion.value=0;wallMat.uniforms.rupture.value=0;wallMat.uniforms.overviewDamage.value=0;camera.zoom=1;camera.position.set(0,0,18);camera.lookAt(0,0,0);camera.updateProjectionMatrix();window.onInspectionPhase?.('idle');}
function startInspection(fraction){clearInspection();const target=-5.1+Math.max(0,Math.min(1,fraction))*10.2;wallMat.uniforms.defectX.value=target;defectRoot.position.x=target;wallMat.uniforms.cut.value=0;if(marker)marker.visible=false;label.visible=false;inspection={target,rotation:group.rotation.clone()};window.onInspectionPhase?.('approach');}
function tickInspection(dt,time){
 if(!inspection){if(defectRoot.visible)animateDischarge(time,1);return;}if(inspection.manual){animateDischarge(time,wallMat.uniforms.rupture.value);return;}inspectionElapsed+=dt;
 const t=reduced.matches?6.8:inspectionElapsed,a=ease(t/1.4),close=ease((t-2.2)/2),opening=ease((t-4.5)/1.4);
 group.rotation.set(THREE.MathUtils.lerp(inspection.rotation.x,-1.15,a),THREE.MathUtils.lerp(inspection.rotation.y,0,a),THREE.MathUtils.lerp(inspection.rotation.z,0,a));
 const zoom=1+close*1.7,cameraX=inspection.target*close,cameraY=-.12*a-.65*close;camera.zoom=zoom;camera.position.set(cameraX,cameraY,18);camera.lookAt(cameraX,cameraY,0);camera.updateProjectionMatrix();
 wallMat.uniforms.overviewDamage.value=1-close*.86;wallMat.uniforms.corrosion.value=.65+.35*a;wallMat.uniforms.rupture.value=opening;defectRoot.visible=t>4.5;defectLip.scale.set(opening,1,opening);stream.visible=t>4.55;animateDischarge(time,opening);
 const phase=t<1.4?'approach':t<4.2?'corrosion':t<5.9?'opening':'leak';if(phase!==inspectionPhase){inspectionPhase=phase;host.dataset.inspection=phase;window.onInspectionPhase?.(phase);}
}
