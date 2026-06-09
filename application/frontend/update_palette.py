import re

tokens_path = "src/styles/tokens.css"
with open(tokens_path, "r") as f:
    text = f.read()

# Replace hexes
text = re.sub(r'--color-graphite-950:\s*#[a-f0-9A-F]+;', '--color-graphite-950: #2f0601;', text)
text = re.sub(r'--color-graphite-900:\s*#[a-f0-9A-F]+;', '--color-graphite-900: #553a41;', text)
text = re.sub(r'--color-graphite-800:\s*#[a-f0-9A-F]+;', '--color-graphite-800: #422930;', text) # derived darker plum

text = re.sub(r'--color-brass-500:\s*#[a-f0-9A-F]+;', '--color-brass-500: #32908f;', text) # Teal
text = re.sub(r'--color-brass-400:\s*#[a-f0-9A-F]+;', '--color-brass-400: #26c485;', text) # Mint
text = re.sub(r'--color-brass-300:\s*#[a-f0-9A-F]+;', '--color-brass-300: #7fd6af;', text) # Lighter mint

text = re.sub(r'--color-paper-50:\s*#[a-f0-9A-F]+;', '--color-paper-50: #a3e7fc;', text) # Light blue text
text = re.sub(r'--color-paper-0:\s*#[a-f0-9A-F]+;', '--color-paper-0: #c9f1fd;', text) 

# Replace RGB values
text = re.sub(r'--color-graphite-950-rgb:\s*[^;]+;', '--color-graphite-950-rgb: 47 6 1;', text)
text = re.sub(r'--color-graphite-900-rgb:\s*[^;]+;', '--color-graphite-900-rgb: 85 58 65;', text)
text = re.sub(r'--color-graphite-800-rgb:\s*[^;]+;', '--color-graphite-800-rgb: 66 41 48;', text)

text = re.sub(r'--color-brass-500-rgb:\s*[^;]+;', '--color-brass-500-rgb: 50 144 143;', text)
text = re.sub(r'--color-brass-400-rgb:\s*[^;]+;', '--color-brass-400-rgb: 38 196 133;', text)
text = re.sub(r'--color-brass-300-rgb:\s*[^;]+;', '--color-brass-300-rgb: 127 214 175;', text)

text = re.sub(r'--color-paper-50-rgb:\s*[^;]+;', '--color-paper-50-rgb: 163 231 252;', text)
text = re.sub(r'--color-paper-0-rgb:\s*[^;]+;', '--color-paper-0-rgb: 201 241 253;', text)

with open(tokens_path, "w") as f:
    f.write(text)

print("Palette updated!")
