"""Extract the approved 4x4 slash sheet using measured body/foot anchors.
Usage: python tools/extract_sword_slash.py path/to/sheet.png
"""
from pathlib import Path
import sys
from PIL import Image

# (torso center x, hood top y, foot baseline y) measured on 1254x1254 master.
ANCHORS = [(166,94,282),(481,90,284),(748,77,280),(1102,70,277),
           (123,380,577),(470,390,572),(747,380,566),(1089,355,573),
           (191,684,893),(508,688,882),(801,693,888),(1090,675,891),
           (147,970,1210),(465,970,1209),(777,968,1210),(1095,970,1214)]
sheet = Image.open(sys.argv[1]).convert('RGBA')
assert sheet.size == (1254,1254), 'Anchor measurements require the approved master.'
out = Path(__file__).resolve().parents[1] / 'assets/sprites/player/SwordSlash'
for i,(cx,head,foot) in enumerate(ANCHORS):
    col,row = i%4,i//4
    left,top = round(col*sheet.width/4),round(row*sheet.height/4)
    right,bottom = round((col+1)*sheet.width/4),round((row+1)*sheet.height/4)
    # The next row starts its windup trail above the nominal grid boundary.
    if row == 2: bottom = 920
    if row == 3: top = 920
    cell = sheet.crop((left,top,right,bottom))
    scale = 278/(foot-head)
    cell = cell.resize((round(cell.width*scale),round(cell.height*scale)),Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA',(600,550))
    pos = (round(300-(cx-left)*scale),round(450-(foot-top)*scale))
    assert pos[0]>=0 and pos[1]>=0 and pos[0]+cell.width<=600 and pos[1]+cell.height<=550, (i,pos,cell.size)
    canvas.alpha_composite(cell,pos)
    canvas.save(out/f'elden2d_slash_{i+1:02}.png')
print('Extracted 16 frames, common body height 278, foot baseline 450.')
