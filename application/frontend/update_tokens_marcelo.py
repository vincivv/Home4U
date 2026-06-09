import re

tokens_path = "src/styles/tokens.css"
with open(tokens_path, "r") as f:
    text = f.read()

# Deepest Background
# Pitch Black Studio
text = re.sub(r'--color-graphite-950:\s*#[a-f0-9A-F]+;', '--color-graphite-950: #050505;', text)
text = re.sub(r'--color-graphite-950-rgb:\s*[^;]+;', '--color-graphite-950-rgb: 5 5 5;', text)
text = re.sub(r'--color-stone-100:\s*#[a-f0-9A-F]+;', '--color-stone-100: #020202;', text) 
text = re.sub(r'--color-stone-100-rgb:\s*[^;]+;', '--color-stone-100-rgb: 2 2 2;', text)

# Cards / Elevated Surfaces (Dark Charcoal)
text = re.sub(r'--color-graphite-900:\s*#[a-f0-9A-F]+;', '--color-graphite-900: #0a0a0a;', text)
text = re.sub(r'--color-graphite-900-rgb:\s*[^;]+;', '--color-graphite-900-rgb: 10 10 10;', text)

text = re.sub(r'--color-graphite-800:\s*#[a-f0-9A-F]+;', '--color-graphite-800: #141414;', text)
text = re.sub(r'--color-graphite-800-rgb:\s*[^;]+;', '--color-graphite-800-rgb: 20 20 20;', text)

text = re.sub(r'--color-graphite-700:\s*#[a-f0-9A-F]+;', '--color-graphite-700: #1f1f1f;', text)
text = re.sub(r'--color-graphite-700-rgb:\s*[^;]+;', '--color-graphite-700-rgb: 31 31 31;', text)

# Borders (Very subtle gray)
text = re.sub(r'--color-stone-200:\s*#[a-f0-9A-F]+;', '--color-stone-200: #2a2a2a;', text) 
text = re.sub(r'--color-stone-200-rgb:\s*[^;]+;', '--color-stone-200-rgb: 42 42 42;', text)

# Text (Pure white and crisp off-white)
text = re.sub(r'--color-paper-50:\s*#[a-f0-9A-F]+;', '--color-paper-50: #ffffff;', text)
text = re.sub(r'--color-paper-50-rgb:\s*[^;]+;', '--color-paper-50-rgb: 255 255 255;', text)
text = re.sub(r'--color-paper-0:\s*#[a-f0-9A-F]+;', '--color-paper-0: #e0e0e0;', text)
text = re.sub(r'--color-paper-0-rgb:\s*[^;]+;', '--color-paper-0-rgb: 224 224 224;', text)

# Electric Marcelo Accents (Neon Lime Green from Earbuds video)
text = re.sub(r'--color-brass-500:\s*#[a-f0-9A-F]+;', '--color-brass-500: #99cc22;', text)
text = re.sub(r'--color-brass-500-rgb:\s*[^;]+;', '--color-brass-500-rgb: 153 204 34;', text)

text = re.sub(r'--color-brass-400:\s*#[a-f0-9A-F]+;', '--color-brass-400: #c3f833;', text) # Electric Lime
text = re.sub(r'--color-brass-400-rgb:\s*[^;]+;', '--color-brass-400-rgb: 195 248 51;', text)

text = re.sub(r'--color-brass-300:\s*#[a-f0-9A-F]+;', '--color-brass-300: #e0ff85;', text) # Glowing Lime
text = re.sub(r'--color-brass-300-rgb:\s*[^;]+;', '--color-brass-300-rgb: 224 255 133;', text)


with open(tokens_path, "w") as f:
    f.write(text)

# Fix atmosphere.css to match Marcelo's intense glowing aura
atmo_path = "src/styles/atmosphere.css"
with open(atmo_path, "r") as f:
    atmo = f.read()

# Change the orb colors to use the electric lime and a deep blue/cyan counter-glow
atmo = re.sub(r'--atmo-a:\s*rgb\(var\(--color-brass-400-rgb\) / 0.22\);', '--atmo-a: rgb(195 248 51 / 0.15);', atmo)
atmo = re.sub(r'--atmo-b:\s*rgb\(var\(--color-steel-600-rgb\)  / 0.18\);', '--atmo-b: rgb(34 204 255 / 0.1);', atmo) # electric cyan counter
atmo = re.sub(r'--atmo-c:\s*rgb\(var\(--color-graphite-700-rgb\) / 0.12\);', '--atmo-c: rgb(195 248 51 / 0.08);', atmo)

with open(atmo_path, "w") as f:
    f.write(atmo)

print("Marcelo Electric Palette injected successfully!")
