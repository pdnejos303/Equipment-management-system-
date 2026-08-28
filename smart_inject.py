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
        
    lines = content.split('\n')
    new_lines = []
    
    in_mutation_method = False
    
    for line in lines:
        # Detect start of mutation method
        if re.search(r'export async function (POST|PATCH|PUT|DELETE)\(', line):
            in_mutation_method = True
        elif re.search(r'export async function GET\(', line):
            in_mutation_method = False
            
        # If in mutation method, and we see return NextResponse.json(...)
        # We only want to inject on successful returns. Usually `return NextResponse.json(booking)` or `return NextResponse.json(..., { status: 201 })`.
        # Error responses usually have `error:` inside or `{ status: 4xx/5xx }`.
        if in_mutation_method and 'return NextResponse.json(' in line:
            if 'error:' not in line and 'status: 4' not in line and 'status: 5' not in line:
                new_lines.append('    eventEmitter.emit("update");')
                
        new_lines.append(line)
        
    with open(f, 'w', encoding='utf-8') as file:
        file.write('\n'.join(new_lines))
