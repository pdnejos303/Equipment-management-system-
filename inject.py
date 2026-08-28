import os, re
files = [
  r'src\app\api\bookings\route.ts',
  r'src\app\api\bookings\[id]\route.ts',
  r'src\app\api\assignments\route.ts',
  r'src\app\api\assignments\[id]\route.ts',
  r'src\app\api\assets\route.ts',
  r'src\app\api\assets\[id]\route.ts'
]
for f in files:
    if not os.path.exists(f): continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    if 'import { eventEmitter } from "@/lib/eventEmitter";' not in content:
        content = re.sub(r'(import .* from "next/server";)', r'\1\nimport { eventEmitter } from "@/lib/eventEmitter";', content)
    
    # We only want to inject on successful mutations
    content = re.sub(r'(return NextResponse\.json\([a-zA-Z0-9_{}]+(?:,\s*\{\s*status:\s*201\s*\})?\);)', r'eventEmitter.emit("update");\n    \1', content)
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
