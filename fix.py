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
    
    # Now, carefully inject it only in POST, PATCH, PUT, DELETE blocks right before returning a successful response
    # We can just look for `const <var> = await prisma.<model>.<action>` and insert it after.
    # Actually, the simplest way is to inject it at the end of the POST/PATCH/DELETE function.
    
    # A robust way: find blocks for POST, PATCH, PUT, DELETE
    def replacer(match):
        method_body = match.group(0)
        # inject before the last return NextResponse.json
        # find the last return NextResponse.json(..., { status: 200/201 }) or just return NextResponse.json(...)
        # It's tricky to parse. Let's just do a string replace on `return NextResponse.json(var)` if it's inside POST/PATCH/DELETE
        # Better: match.group(1) is the signature, match.group(2) is the body
        return method_body
        
    # Instead of regex, let's just do:
    # `const booking = await prisma.booking.create(...)`
    # Let's just find `await prisma.[a-zA-Z]+\.(create|update|delete|upsert)[^;]*;`
    content = re.sub(r'(await prisma\.[a-zA-Z]+\.(?:create|update|delete|upsert|updateMany|deleteMany)\(.*?\);)', r'\1\n    eventEmitter.emit("update");', content, flags=re.DOTALL)
    
    # Wait, prisma calls might be multiline.
    # It's easier to just match: `return NextResponse.json` inside POST/PATCH/DELETE but we don't have a full parser.
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
