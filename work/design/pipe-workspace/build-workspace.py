from pathlib import Path
import json,gzip,base64,re
s=Path('.superdesign/tmp/saved-slosh-waves.html').read_text()
a=s.index('<section class="detail" id="detail">');b=s.index('</main>',a)
s=s[:a]+Path('.superdesign/tmp/workspace.html').read_text()+s[b:]
s=s.replace('</style>',Path('.superdesign/tmp/workspace.css').read_text()+Path('.superdesign/tmp/unroll-surface.css').read_text()+'</style>')
d=json.loads(Path('.superdesign/tmp/workspace-data.json').read_text());d['featureNames']=json.loads(Path('frontend/src/shared/i18n/locales/ru/model.json').read_text())['feature'];encoded=base64.b64encode(gzip.compress(json.dumps(d,ensure_ascii=False,separators=(',',':')).encode())).decode()
s=s.replace('</body>','<script id="workspace-snapshot" type="application/octet-stream">'+encoded+'</script><script>'+Path('.superdesign/tmp/workspace.js').read_text()+Path('.superdesign/tmp/unroll-surface.js').read_text()+'</script></body>')
s=s.replace('let label=makeLabel(name);group.add(label);','let label=makeLabel(name);group.add(label);let marker;if(detail){marker=new THREE.Mesh(new THREE.TorusGeometry(.735,.012,8,96),new THREE.MeshBasicMaterial({color:0xcdd9c1,transparent:true,opacity:.65}));marker.rotation.y=Math.PI/2;group.add(marker);}')
s=s.replace('host.dataset.renderer=\'webgl\';return{cut(on)',"host.dataset.renderer='webgl';return{select(fraction){if(marker)marker.position.x=-5.1+Math.max(0,Math.min(1,fraction))*10.2;},cut(on)")
s=s.replace('window.materialDetail=detail;','window.materialDetail=detail;window.onSceneReady?.();')
Path('.superdesign/tmp/fleet-workspace.html').write_text(s)
print('HTML bytes',len(s),'snapshot compressed',len(encoded))

import runpy
runpy.run_path('.superdesign/tmp/add-inspection.py')

runpy.run_path('.superdesign/tmp/refine-fluid.py')

runpy.run_path('.superdesign/tmp/refine-corrosion.py')

runpy.run_path('.superdesign/tmp/add-controls.py')

s=Path('.superdesign/tmp/fleet-workspace.html').read_text()
s=s.replace('<head>','<head><script>try{document.documentElement.dataset.theme=localStorage.getItem("duppel-theme")==="dark"?"dark":"light"}catch{document.documentElement.dataset.theme="light"}</script>',1)
s=s.replace('</head>','<style>'+Path('.superdesign/tmp/theme.css').read_text()+'</style></head>',1)
light='data:image/svg+xml;base64,'+base64.b64encode(Path('docs/brand/wordmark-light.svg').read_bytes()).decode()
dark='data:image/svg+xml;base64,'+base64.b64encode(Path('docs/brand/wordmark-dark.svg').read_bytes()).decode()
s=s.replace('class="logo"','class="logo" data-light="'+light+'" data-dark="'+dark+'"',1)
s=s.replace('</header>','<button class="theme-toggle" type="button" aria-label="Включить тёмную тему"></button></header>',1)
s=s.replace('</body>','<script>'+Path('.superdesign/tmp/theme.js').read_text()+'</script></body>',1)
Path('.superdesign/tmp/fleet-workspace.html').write_text(s)
