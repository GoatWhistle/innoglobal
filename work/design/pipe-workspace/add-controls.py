from pathlib import Path
p=Path('.superdesign/tmp/fleet-workspace.html');s=p.read_text();a=s.index(' if(detail){let pointer;');b=s.index(" host.dataset.renderer='webgl'",a);s=s[:a]+Path('.superdesign/tmp/scene-controls.js').read_text()+s[b:]
s=s.replace('if(!inspection){const axis=', 'if(!inspection&&!manualView){const axis=')
s=s.replace('updateLiquid(delta);renderer.render','updateLiquid(delta);tickControls(delta);renderer.render')
s=s.replace('function clearInspection(){inspection=null;', 'function clearInspection(){manualView=false;inspection=null;')
s=s.replace('return{clearSelection()', 'return{zoom:zoomBy,fit:fitView,clearSelection()')
p.write_text(s)
