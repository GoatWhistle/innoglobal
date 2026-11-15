import * as THREE from "three"
export const vertex = `varying vec3 p;varying vec3 n;void main(){p=position;n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
export const noise = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){return .55*noise(p)+.28*noise(p*2.03)+.12*noise(p*4.1)+.05*noise(p*8.3);}`
export const wallFragment = `varying vec3 p;varying vec3 n;uniform float cut;uniform float time;uniform sampler2D damageMap;uniform float overviewDamage;uniform float defectX;uniform float corrosion;uniform float rupture;${noise}
void main(){
 if(cut>.5&&p.z>0.&&p.y>-.12)discard;
 float d=length(vec2((p.x-defectX)/.52,p.z/.26));float jag=1.+.06*sin(atan(p.z,p.x-defectX)*7.);
 if(p.y<-.35&&d<rupture*jag*.49)discard;
 vec3 N=normalize(n);float facing=abs(N.z);float edge=pow(1.-facing,2.1);
 float drift=.012*sin(time*.19+p.x*.18);
 float soft=exp(-pow((N.y-.52-drift)*8.,2.));
 float strip=exp(-pow((N.y-.78-drift)*34.,2.));
 float underside=exp(-pow((N.y+.86)*23.,2.));
 float studio=.6+.4*cos(p.x*.38-.5);
 vec3 tint=vec3(.065,.092,.12)*(1.-edge*.72);
 vec3 color=tint+soft*vec3(.15,.18,.22)*studio+strip*vec3(.43,.5,.57)*studio+underside*vec3(.13,.19,.25);
 float grain=fbm(vec2(p.x*14.,p.z*22.));float corrosionMask=(1.-smoothstep(.45,1.65,d+(grain-.5)*.7))*smoothstep(-.3,-.65,p.y)*corrosion;
 float mapValue=texture2D(damageMap,vec2(clamp((p.x+4.4)/8.8,0.,1.),.5)).r;
 float lowerWall=(1.-smoothstep(.16,.5,abs(p.z)))*(1.-smoothstep(-.65,-.3,p.y));
 float surrounding=mapValue*lowerWall*(.25+.75*grain)*overviewDamage;
 corrosionMask=max(corrosionMask,surrounding);
 float pits=fbm(vec2(p.x*40.,p.z*55.));float cavities=smoothstep(.5,.68,pits);vec3 patina=mix(vec3(.18,.115,.065),vec3(.025,.028,.025),cavities);patina+=smoothstep(.46,.5,pits)*(1.-smoothstep(.5,.54,pits))*.1;color=mix(color,patina,corrosionMask);
 gl_FragColor=vec4(color,max(.13+edge*.65+soft*.13+strip*.38+underside*.17,corrosionMask*.94));
}`
export const oilFragment = `varying vec3 p;varying vec3 n;uniform float time;${noise}
void main(){
 float travel=p.x-time*.85;
 float swell=sin(travel*1.9)*.085+sin(travel*3.1+1.2)*.028;
 float deep=sin((p.x-time*.42)*1.4+2.)*.07;
 vec2 q=vec2(travel*.7,p.y*3.);
 float bulk=fbm(q+vec2(fbm(q*.8),fbm(q+4.))* .35);
 float ribbon=exp(-pow((p.y-.10-swell)*12.,2.));
 float under=exp(-pow((p.y+.23-deep)*10.,2.));
 float crest=exp(-pow((p.y-.18-swell)*38.,2.));
 vec3 N=normalize(n+vec3(cos(travel*1.9)*.045,(bulk-.5)*.15,0.));
 float shine=pow(max(dot(N,normalize(vec3(-.12,.8,1.))),0.),52.);
 vec3 color=mix(vec3(.0004,.0005,.00045),vec3(.0025,.003,.0027),bulk);
 color+=ribbon*vec3(.010,.012,.011)*(.55+.45*sin(travel*.8)*sin(travel*.8));
 color+=under*vec3(.004,.005,.0045);
 color+=crest*vec3(.12,.125,.112)*(.3+.7*bulk);
 color+=shine*vec3(.11,.12,.115);
 float thinEdge=pow(1.-abs(normalize(n).z),5.);color+=thinEdge*vec3(.012,.008,.002);color=pow(max(color,vec3(0.)),vec3(.4545))*.64;
 gl_FragColor=vec4(color,1.);
}`
export function cylinder(radius, length) {
  const g = new THREE.CylinderGeometry(radius, radius, length, 96, 1, true)
  g.rotateZ(Math.PI / 2)
  return g
}
export function makeLabel(text) {
  const canvas = document.createElement("canvas")
  canvas.width = 2048
  canvas.height = 256
  const c = canvas.getContext("2d")
  c.font = '500 112px "Manrope Variable", sans-serif'
  c.textBaseline = "middle"
  c.fillStyle = "#c4ccd1"
  c.fillText(text, 75, 128)
  c.fillRect(28, 64, 3, 120)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const geo = new THREE.PlaneGeometry(4.2, 0.525, 1, 24)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    pos.setZ(i, Math.sqrt(0.726 * 0.726 - y * y))
  }
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      opacity: 0.94,
      side: THREE.DoubleSide,
    }),
  )
  if (innerWidth < 600) mesh.visible = false
  mesh.position.x = -2.6
  mesh.renderOrder = 4
  return mesh
}
