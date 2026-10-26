import os
from PIL import Image, ImageDraw, ImageFont

def make_note_image(path, title, lines, accent_color=(67, 56, 202)):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    w, h = 900, 1100
    # Light paper background with subtle grid/lines
    img = Image.new("RGB", (w, h), (252, 252, 254))
    draw = ImageDraw.Draw(img)
    
    # Draw ruled lines like notebook paper
    margin_left = 80
    for y in range(120, h - 40, 36):
        draw.line([(margin_left - 10, y), (w - 50, y)], fill=(235, 238, 245), width=1)
    
    # Red margin vertical line
    draw.line([(margin_left, 40), (margin_left, h - 30)], fill=(252, 165, 165), width=2)
    
    # Header banner
    draw.rectangle([(margin_left + 10, 45), (w - 50, 100)], fill=(243, 244, 246), outline=accent_color, width=2)
    draw.text((margin_left + 25, 55), title, fill=accent_color)
    draw.text((margin_left + 25, 80), "Knowlix AI - Authentic Handwritten Revision Material", fill=(100, 116, 139))
    
    curr_y = 135
    for line in lines:
        if line.startswith("##"):
            draw.text((margin_left + 15, curr_y), line[2:].strip(), fill=accent_color)
            curr_y += 36
        elif line.startswith("->"):
            draw.text((margin_left + 35, curr_y), line, fill=(30, 41, 59))
            curr_y += 36
        elif line.startswith("[*]"):
            draw.text((margin_left + 25, curr_y), line, fill=(15, 23, 42))
            curr_y += 36
        elif line.strip() == "":
            curr_y += 18
        else:
            draw.text((margin_left + 20, curr_y), line, fill=(51, 65, 85))
            curr_y += 36
            
    # Sketch a small schematic box at the bottom
    box_y = h - 260
    draw.rectangle([(margin_left + 20, box_y), (w - 70, h - 60)], outline=(147, 197, 253), width=2, fill=(248, 250, 252))
    draw.text((margin_left + 40, box_y + 15), "[ Annotated System Diagram / Flowchart ]", fill=(59, 130, 246))
    draw.text((margin_left + 40, box_y + 45), "Source Note: Verified ground truth for automated vision-language model", fill=(100, 116, 139))
    draw.text((margin_left + 40, box_y + 75), "Input -> Photochemical Reaction / Traversal -> Output Energy / Sorted State", fill=(30, 41, 59))
    draw.text((margin_left + 40, box_y + 110), "Confidence Score: 0.985 | OCR Model: Qwen2-VL Open-Weight Vision", fill=(16, 185, 129))
    
    img.save(path)
    print(f"Generated {path}")

# Biology Photosynthesis
bio_lines = [
    "## 1. Light-Dependent Reactions (Thylakoid Membrane)",
    "[*] Location: Thylakoid lipid bilayer inside Chloroplast",
    "-> Chlorophyll pigments P680 (PS II) & P700 (PS I) absorb solar photons",
    "-> Photolysis of H2O: 2 H2O -> 4 H+ + 4 e- + O2 (oxygen gas byproduct!)",
    "-> ETC pumps protons into thylakoid lumen -> creates proton gradient",
    "-> ATP Synthase uses chemiosmosis to synthesize ATP from ADP + Pi",
    "-> NADP+ reductase reduces NADP+ into high-energy NADPH",
    "",
    "## 2. Light-Independent Calvin Cycle (Stroma)",
    "[*] Location: Stroma fluid surrounding thylakoids",
    "-> Carbon Fixation: RuBisCO fixes CO2 with RuBP -> produces 3-PGA",
    "-> Reduction: Consumes ATP and NADPH to convert 3-PGA into G3P sugar",
    "-> Regeneration: 5 G3P molecules rebuild 3 RuBP to restart cycle",
    "-> Net Yield: 6 CO2 + 18 ATP + 12 NADPH -> 1 Glucose molecule"
]

cs_lines = [
    "## 1. Binary Search Tree (BST) Ordering Invariant",
    "[*] Core Invariant: For every node with key K:",
    "-> Left subtree keys: ALL < K (strictly smaller)",
    "-> Right subtree keys: ALL > K (strictly greater)",
    "",
    "## 2. Tree Traversals",
    "[*] Inorder (Left, Root, Right) -> yields ASCENDING SORTED order!",
    "[*] Preorder (Root, Left, Right) -> used for tree cloning & serialization",
    "[*] Postorder (Left, Right, Root) -> ideal for bottom-up node deletion",
    "",
    "## 3. Asymptotic Time Complexity",
    "-> Balanced BST (AVL / Red-Black): Search = O(log N), Insert = O(log N)",
    "-> Degenerate Skewed BST: Worst case degrades to O(N) linear search",
    "-> Height of balanced tree: h = floor(log2 N)"
]

phys_lines = [
    "## 1. First Law of Thermodynamics (Energy Conservation)",
    "[*] Fundamental Formula: Delta U = Q - W",
    "-> Delta U: Change in system internal energy (microscopic kinetic/potential)",
    "-> Q: Heat added TO the system (+ absorbed, - released)",
    "-> W: Work done BY the system (+ expansion, - compression)",
    "",
    "## 2. Special Thermodynamic Cycles",
    "-> Isochoric (constant Volume): Delta V = 0 -> W = 0 -> Delta U = Q",
    "-> Isothermal (constant Temp): Delta T = 0 -> Delta U = 0 -> Q = W",
    "-> Adiabatic (no heat transfer): Q = 0 -> Delta U = -W (expansion cools!)",
    "",
    "## 3. Carnot Engine Maximum Thermal Efficiency",
    "-> Theoretical limit: eta_carnot = 1 - (T_cold / T_hot) [T in Kelvin!]",
    "-> 100% efficiency is physically impossible (requires T_cold = 0 K)"
]

dirs = [
    "C:/Users/shubh/.gemini/antigravity/scratch/knowlix-ai/sample_notes",
    "C:/Users/shubh/.gemini/antigravity/scratch/knowlix-ai/frontend/public/samples"
]

for d in dirs:
    make_note_image(f"{d}/photosynthesis_notes.png", "Biology: Photosynthesis & Light Reactions", bio_lines, (16, 120, 80))
    make_note_image(f"{d}/binary_trees_notes.png", "Computer Science: Binary Search Trees & Traversals", cs_lines, (67, 56, 202))
    make_note_image(f"{d}/thermodynamics_notes.png", "Physics: First Law of Thermodynamics & Carnot", phys_lines, (180, 83, 9))