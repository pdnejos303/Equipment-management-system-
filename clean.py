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
        
    # Remove all eventEmitter.emit("update");
    content = re.sub(r'eventEmitter\.emit\("update"\);\s*', '', content)
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
