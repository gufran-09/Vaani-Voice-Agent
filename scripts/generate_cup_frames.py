import os
from PIL import Image, ImageDraw, ImageFilter

def generate_clean_cup_frames():
    out_dir = 'public/images/cafe/frames'
    os.makedirs(out_dir, exist_ok=True)

    cup = Image.open('public/images/cafe/hero-cup.png').convert('RGBA')
    crema = Image.open('public/images/cafe/coffee-crema-surface.png').convert('RGBA')
    w, h = cup.size # 1024, 1024

    TOTAL_FRAMES = 24

    for idx in range(TOTAL_FRAMES):
        frame = cup.copy()
        cx = 445

        # Determine fill progress (0.0 to 1.0)
        if idx == 0:
            fill_pct = 0.0
        elif idx <= 20:
            fill_pct = idx / 20.0 # reaches 1.0 at frame 20
        else:
            fill_pct = 1.0 # hold full

        cy = int(395 - fill_pct * (395 - 325))
        rx = int(175 + fill_pct * (285 - 175))
        ry = int(58 + fill_pct * (95 - 58))

        # Draw liquid surface ellipse
        if fill_pct > 0.01:
            # Rotate crema slightly for fluid vortex motion
            crema_rot = crema.rotate(int(fill_pct * 110), resample=Image.Resampling.BICUBIC)
            crema_scaled = crema_rot.resize((rx * 2, ry * 2), Image.Resampling.LANCZOS)

            # Smooth elliptical mask
            mask = Image.new('L', (rx * 2, ry * 2), 0)
            md = ImageDraw.Draw(mask)
            md.ellipse([0, 0, rx * 2, ry * 2], fill=255)
            mask = mask.filter(ImageFilter.GaussianBlur(1.2))

            # Depth shadow when deep inside bowl
            if fill_pct < 0.85:
                darken = Image.new('RGBA', (rx * 2, ry * 2), (0, 0, 0, int((0.85 - fill_pct) * 85)))
                crema_scaled = Image.alpha_composite(crema_scaled, darken)

            frame.paste(crema_scaled, (cx - rx, cy - ry), mask)

            # Dark meniscus rim border
            draw = ImageDraw.Draw(frame)
            draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(40, 18, 8, int(190 * fill_pct)), width=2)

        # Steam wisps for full frames (idx >= 20)
        if idx >= 20:
            steam_layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            s_draw = ImageDraw.Draw(steam_layer)
            steam_w = int(285 * 1.5)
            steam_h = 180
            s_draw.ellipse([cx - steam_w // 2, 325 - steam_h, cx + steam_w // 2, 325 + 20], fill=(255, 255, 255, 35))
            steam_layer = steam_layer.filter(ImageFilter.GaussianBlur(16))
            frame = Image.alpha_composite(frame, steam_layer)

        # Resize to crisp 640x640 for rapid loading and silky 60fps rendering
        frame_optimized = frame.resize((640, 640), Image.Resampling.LANCZOS)

        frame_optimized.save(f'{out_dir}/cup_{idx:02d}.png', 'PNG', optimize=True)

    print(f'Generated {TOTAL_FRAMES} clean cup frames!')

if __name__ == '__main__':
    generate_clean_cup_frames()
