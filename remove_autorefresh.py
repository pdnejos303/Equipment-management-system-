import os, re
files = [
    r'src\app\(features)\assets\AssetsClient.tsx',
    r'src\app\(features)\overview\DashboardClient.tsx',
    r'src\app\(features)\in-use\InUseClient.tsx',
    r'src\app\(features)\bookings\BookingsClient.tsx',
    r'src\app\(features)\assignments\AssignmentsClient.tsx'
]
for f in files:
    if not os.path.exists(f): continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    content = re.sub(r'import \{\s*useAutoRefresh\s*\}\s*from\s*["\']@/lib/useAutoRefresh["\'];\n?', '', content)
    content = re.sub(r'\s*useAutoRefresh\(\d*\);(?:[ \t]*//[^\n]*)?\n', '\n', content)
    content = re.sub(r'\s*useAutoRefresh\(\);(?:[ \t]*//[^\n]*)?\n', '\n', content)
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
