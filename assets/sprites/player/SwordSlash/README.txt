Elden-2D sword slash frames
16 transparent PNGs, canvas 600x550.
01-04 down; 05-08 left; 09-12 right; 13-16 up.
Each row: windup, contact, follow-through, recovery.
Body height normalized to 278 px; foot baseline y=450.
Phaser origin (0.5, 308/550) keeps feet aligned with walking.
Playback: 90 ms per frame, one directional hit on contact.
Player reference: ../down/walk_down_01.png
Master: sword_slash_master.png
Regenerate frames: python tools/extract_sword_slash.py assets/sprites/player/SwordSlash/sword_slash_master.png
