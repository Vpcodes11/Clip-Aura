"""Apply ASS escaping to clipper.py"""
import os
path = r'C:\Users\Trade\OneDrive\Attachments\Clip Aura\app\rendering\clipper.py'

with open(path, 'rb') as f:
    c = f.read()

escape_func = b'''


def escape_ass_text(text: str) -> str:
    if not text:
        return text
    text = text.replace("\\\\", "\\\\\\\\")
    text = text.replace("{", "\\\\{")
    text = text.replace("}", "\\\\}")
    return text
'''

old = b'logger = logging.getLogger(__name__)\r\n\r\n\r\nSAFE_FONT_FALLBACKS'
new = b'logger = logging.getLogger(__name__)' + escape_func + b'\r\n\r\nSAFE_FONT_FALLBACKS'
result = c.replace(old, new, 1)
if result == c:
    print("FAIL: logger marker not found")
    idx = c.find(b'logger = logging')
    print("Found at", idx, repr(c[idx:idx+120]))
    raise SystemExit(1)
c = result

c = c.replace(b'{hook_headline.upper()}', b'{escape_ass_text(hook_headline.upper())}')
c = c.replace(b'{display_word} ', b'{escape_ass_text(display_word)} ')

with open(path, 'wb') as f:
    f.write(c)

# Verify
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
print("escape_ass_text defined:", "def escape_ass_text" in content)
print("escape on hook:", "escape_ass_text(hook_headline" in content)
print("escape on display_word:", content.count("escape_ass_text(display_word"))
