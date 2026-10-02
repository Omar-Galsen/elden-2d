"""Extract the approved pierce master with measured character/foot anchors.
Usage: python tools/extract_player_pierce.py assets/sprites/player/PlayerPierce/player_pierce_master.png
"""
from pathlib import Path
import sys
from PIL import Image

# Torso center x, hood top y, boot baseline y on the approved 1254px sheet.
ANCHORS = [(158,64,305),(485,67,305),(795,69,308),(1091,66,307),
           (132,365,579),(455,380,575),(793,376,577),(1105,365,578),
           (191,650,875),(472,668,864),(780,659,865),(1129,650,875),
           (153,970,1192),(475,974,1189),(773,967,1188),(1099,970,1192)]
sheet=Image.open(sys.argv[1]).convert('RGBA')
assert sheet.size==(1254,1254), 'Anchor measurements require the approved master.'
out=Path(__file__).resolve().parents[1]/'assets/sprites/player/PlayerPierce'
for i,(cx,head,foot) in enumerate(ANCHORS):
    col,row=i%4,i//4
    left,top=round(col*1254/4),round(row*1254/4)
    right,bottom=round((col+1)*1254/4),round((row+1)*1254/4)
    # Preserve thrust tips extending slightly into the transparent gutters.
    if row==1 and col==0: right=290
    if row==1 and col==1: left=295
    if row==2 and col==1: right=642
    if row==2 and col==2: left=642; right=970
    if row==2 and col==3: left=975
    if row==2: bottom=900
    if row==3: top=900
    cell=sheet.crop((left,top,right,bottom))
    scale=278/(foot-head)
    cell=cell.resize((round(cell.width*scale),round(cell.height*scale)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(600,550))
    pos=(round(300-(cx-left)*scale),round(450-(foot-top)*scale))
    assert min(pos)>=0 and pos[0]+cell.width<=600 and pos[1]+cell.height<=550,(i,pos,cell.size)
    canvas.alpha_composite(cell,pos)
    canvas.save(out/f'player_pierce_{i+1:02}.png')
print('Extracted 16 pierce frames, body height 278, foot baseline 450.')
