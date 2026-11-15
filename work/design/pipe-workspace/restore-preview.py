from pathlib import Path
import shutil
import subprocess

source = Path(__file__).resolve().parent
root = source.parents[2]
target = root / '.superdesign' / 'tmp'
target.mkdir(parents=True, exist_ok=True)
for pattern in ('*.py', '*.js', '*.css', '*.html', '*.mjs'):
    for path in source.glob(pattern):
        if path.name not in ('restore-preview.py', 'preview.html'):
            shutil.copy2(path, target / path.name)
shutil.copy2(source / 'workspace-data.json', target / 'workspace-data.json')
subprocess.run(['python3', str(target / 'build-workspace.py')], cwd=root, check=True)
print(target / 'fleet-workspace.html')
