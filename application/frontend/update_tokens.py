import re

tokens_path = "src/styles/tokens.css"
with open(tokens_path, "r") as f:
    text = f.read()

# Deepest Background
#2f0601
text = re.sub(r'--color-graphite-950:\s*#[a-f0-9A-F]+;', '--color-graphite-950: #2f0601;', text)
text = re.sub(r'--color-graphite-950-rgb:\s*[^;]+;', '--color-graphite-950-rgb: 47 6 1;', text)

text = re.sub(r'--color-graphite-900:\s*#[a-f0-9A-F]+;', '--color-graphite-900: #3a151b;', text) # Blend between 2f0601 and 553a41
text = re.sub(r'--color-graphite-900-rgb:\s*[^;]+;', '--color-graphite-900-rgb: 58 21 27;', text)

text = re.sub(r'--color-graphite-800:\s*#[a-f0-9A-F]+;', '--color-graphite-800: #553a41;', text) # Plum surface
text = re.sub(r'--color-graphite-800-rgb:\s*[^;]+;', '--color-graphite-800-rgb: 85 58 65;', text)

text = re.sub(r'--color-graphite-700:\s*#[a-f0-9A-F]+;', '--color-graphite-700: #6d4b53;', text) # Lighter plum
text = re.sub(r'--color-graphite-700-rgb:\s*[^;]+;', '--color-graphite-700-rgb: 109 75 83;', text)

# Borders and Secondary Accents (Teal)
text = re.sub(r'--color-stone-100:\s*#[a-f0-9A-F]+;', '--color-stone-100: #2f0601;', text) # Reset light bg to dark bg!
text = re.sub(r'--color-stone-100-rgb:\s*[^;]+;', '--color-stone-100-rgb: 47 6 1;', text)

text = re.sub(r'--color-stone-200:\s*#[a-f0-9A-F]+;', '--color-stone-200: #32908f;', text) # Teal
text = re.sub(r'--color-stone-200-rgb:\s*[^;]+;', '--color-stone-200-rgb: 50 144 143;', text)

# Text (White and Light Cyan)
text = re.sub(r'--color-paper-50:\s*#[a-f0-9A-F]+;', '--color-paper-50: #ffffff;', text) # Real white
text = re.sub(r'--color-paper-50-rgb:\s*[^;]+;', '--color-paper-50-rgb: 255 255 255;', text)

# Brand / Primary Accents (Mint and Cyan)
text = re.sub(r'--color-brass-500:\s*#[a-f0-9A-F]+;', '--color-brass-500: #1b8e61;', text) # Darker mint
text = re.sub(r'--color-brass-500-rgb:\s*[^;]+;', '--color-brass-500-rgb: 27 142 97;', text)

text = re.sub(r'--color-brass-400:\s*#[a-f0-9A-F]+;', '--color-brass-400: #26c485;', text) # Mint
text = re.sub(r'--color-brass-400-rgb:\s*[^;]+;', '--color-brass-400-rgb: 38 196 133;', text)

text = re.sub(r'--color-brass-300:\s*#[a-f0-9A-F]+;', '--color-brass-300: #a3e7fc;', text) # Cyan
text = re.sub(r'--color-brass-300-rgb:\s*[^;]+;', '--color-brass-300-rgb: 163 231 252;', text)

# Steel & Slate (Mid tones) -> Shift to Teal
text = re.sub(r'--color-steel-600:\s*#[a-f0-9A-F]+;', '--color-steel-600: #32908f;', text)
text = re.sub(r'--color-steel-600-rgb:\s*[^;]+;', '--color-steel-600-rgb: 50 144 143;', text)
text = re.sub(r'--color-slate-400:\s*#[a-f0-9A-F]+;', '--color-slate-400: #a3e7fc;', text)
text = re.sub(r'--color-slate-400-rgb:\s*[^;]+;', '--color-slate-400-rgb: 163 231 252;', text)


with open(tokens_path, "w") as f:
    f.write(text)

# Also fix index.css body background
index_path = "src/index.css"
with open(index_path, "r") as f:
    index_text = f.read()

index_text = re.sub(r'background:\s*var\(--color-stone-100\);', 'background: var(--color-graphite-950);', index_text)
with open(index_path, "w") as f:
    f.write(index_text)

print("Palette securely matched to Coolors with high-contrast text!")
