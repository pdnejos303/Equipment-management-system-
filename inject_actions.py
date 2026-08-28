import os, re
f = r'src\app\(features)\test-device\actions.ts'
with open(f, 'r', encoding='utf-8') as file:
    content = file.read()

if 'eventEmitter' not in content:
    content = content.replace('import { z } from "zod";', 'import { z } from "zod";\nimport { eventEmitter } from "@/lib/eventEmitter";')

# Inject eventEmitter.emit("update"); at the end of mutating actions
actions = ['addTestDevice', 'removeTestDevice', 'updateTestDeviceNote', 'borrowDevice', 'returnDevice', 'borrowMultipleDevices', 'returnMultipleDevices']

# Quick regex to inject before the closing brace of each async function if it contains prisma update/create
# Since we know the file, we can just replace the closing brace of the transaction or update
content = content.replace('data: { isTestDevice: true },\n  });', 'data: { isTestDevice: true },\n  });\n  eventEmitter.emit("update");')
content = content.replace('data: { isTestDevice: false },\n  });', 'data: { isTestDevice: false },\n  });\n  eventEmitter.emit("update");')
content = content.replace('data: { testDeviceNote: note },\n  });', 'data: { testDeviceNote: note },\n  });\n  eventEmitter.emit("update");')
content = content.replace('data: { status: "ACTIVE" },\n    })\n  ]);\n}', 'data: { status: "ACTIVE" },\n    })\n  ]);\n  eventEmitter.emit("update");\n}')
content = content.replace('data: { status: "AVAILABLE" },\n    })\n  ]);\n}', 'data: { status: "AVAILABLE" },\n    })\n  ]);\n  eventEmitter.emit("update");\n}')

# Multiples have updateMany
content = content.replace('data: { status: "ACTIVE" },\n    })\n  ]);', 'data: { status: "ACTIVE" },\n    })\n  ]);\n  eventEmitter.emit("update");')
content = content.replace('data: { status: "AVAILABLE" },\n    })\n  ]);', 'data: { status: "AVAILABLE" },\n    })\n  ]);\n  eventEmitter.emit("update");')

with open(f, 'w', encoding='utf-8') as file:
    file.write(content)
