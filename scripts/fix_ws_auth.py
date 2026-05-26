import os
path = r'C:\Users\Trade\OneDrive\Attachments\Clip Aura\frontend\app\dashboard\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the WebSocket URL construction
old = 'const wsUrl = `${apiUrl.replace(/^http/, wsProtocol)}/ws/${localJob.id}?token=${accessToken}`'
new = 'const wsUrl = `${apiUrl.replace(/^http/, wsProtocol)}/ws/${localJob.id}`'
content = content.replace(old, new)

old2 = 'wsRef.current = new WebSocket(wsUrl);'
new2 = 'wsRef.current = new WebSocket(wsUrl, ["clipaura-auth", accessToken]);'
content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("QSP removed:", '?token=' in content)
print("Protocol added:", 'clipaura-auth' in content)
