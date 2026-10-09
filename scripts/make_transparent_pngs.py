import os
import sys
from PIL import Image

def extract_alpha_matte(input_path, output_path, bg_color=(255, 255, 255), tolerance=20, feather=15):
    """
    High-precision background removal using flood fill and antialiased alpha matte.
    Preserves interior white/specular highlights by only removing background connected to borders.
    """
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()

    # 1. Flood fill from corners and edges to find background mask
    visited = bytearray(width * height)
    bg_mask = bytearray(width * height) # 255 for bg, 0 for fg

    def is_bg(r, g, b):
        dr = abs(r - bg_color[0])
        dg = abs(g - bg_color[1])
        db = abs(b - bg_color[2])
        # Color distance from pure white/studio bg
        return dr <= tolerance and dg <= tolerance and db <= tolerance

    # Seed queue from all perimeter pixels that match bg
    queue = []
    for x in range(width):
        for y in [0, height - 1]:
            r, g, b, _ = pixels[x, y]
            if is_bg(r, g, b):
                queue.append((x, y))
                visited[y * width + x] = 1
                bg_mask[y * width + x] = 255
    for y in range(height):
        for x in [0, width - 1]:
            if not visited[y * width + x]:
                r, g, b, _ = pixels[x, y]
                if is_bg(r, g, b):
                    queue.append((x, y))
                    visited[y * width + x] = 1
                    bg_mask[y * width + x] = 255

    # BFS flood fill
    head = 0
    while head < len(queue):
        cx, cy = queue[head]
        head += 1
        for nx, ny in ((cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)):
            if 0 <= nx < width and 0 <= ny < height:
                idx = ny * width + nx
                if not visited[idx]:
                    visited[idx] = 1
                    nr, ng, nb, _ = pixels[nx, ny]
                    if is_bg(nr, ng, nb):
                        bg_mask[idx] = 255
                        queue.append((nx, ny))

    # 2. Antialiased edge feathering
    # For pixels adjacent to bg_mask, compute alpha based on lightness / distance
    out_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    out_pixels = out_img.load()

    for y in range(height):
        for x in range(width):
            idx = y * width + x
            r, g, b, _ = pixels[x, y]

            if bg_mask[idx] == 255:
                # Fully transparent background
                out_pixels[x, y] = (r, g, b, 0)
            else:
                # Check distance to bg_mask within radius of 2 pixels for antialiasing
                near_bg = False
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < width and 0 <= ny < height:
                            if bg_mask[ny * width + nx] == 255:
                                near_bg = True
                                break
                    if near_bg:
                        break

                if near_bg:
                    # Near boundary: calculate smooth alpha based on color distance from bg
                    diff = max(abs(r - bg_color[0]), abs(g - bg_color[1]), abs(b - bg_color[2]))
                    if diff < tolerance:
                        alpha = 0
                    elif diff < tolerance + feather:
                        alpha = int(255 * (diff - tolerance) / feather)
                    else:
                        alpha = 255
                    # De-fringe: suppress white edge tint
                    if alpha < 255 and alpha > 0:
                        # scale rgb slightly towards actual item color
                        out_pixels[x, y] = (min(255, int(r * 0.95)), min(255, int(g * 0.95)), min(255, int(b * 0.95)), alpha)
                    else:
                        out_pixels[x, y] = (r, g, b, alpha)
                else:
                    out_pixels[x, y] = (r, g, b, 255)

    # Save as PNG
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    out_img.save(output_path, "PNG")
    print(f"Processed: {output_path} | Size: {width}x{height} | Alpha: YES | Mode: {out_img.mode}")

if __name__ == "__main__":
    assets = [
        (
            r"C:\Users\owais\.gemini\antigravity-ide\brain\4373bed5-a5a0-48fe-ba7e-d13937c7d6ce\hero_cafe_cup_1791572838975.jpg",
            r"public/images/cafe/hero-cup.png",
            18, 12
        ),
        (
            r"C:\Users\owais\.gemini\antigravity-ide\brain\4373bed5-a5a0-48fe-ba7e-d13937c7d6ce\glass_coffee_cup_1791572860391.jpg",
            r"public/images/cafe/glass-cup.png",
            15, 10
        ),
        (
            r"C:\Users\owais\.gemini\antigravity-ide\brain\4373bed5-a5a0-48fe-ba7e-d13937c7d6ce\coffee_pour_vertical_1791572895581.jpg",
            r"public/images/cafe/coffee-pour.png",
            16, 12
        ),
        (
            r"C:\Users\owais\.gemini\antigravity-ide\brain\4373bed5-a5a0-48fe-ba7e-d13937c7d6ce\coffee_pour_stream_1791572877790.jpg",
            r"public/images/cafe/coffee-splash.png",
            16, 12
        ),
        (
            r"C:\Users\owais\.gemini\antigravity-ide\brain\4373bed5-a5a0-48fe-ba7e-d13937c7d6ce\coffee_beans_cluster_1791572912449.jpg",
            r"public/images/cafe/coffee-beans.png",
            20, 15
        ),
        (
            r"C:\Users\owais\.gemini\antigravity-ide\brain\4373bed5-a5a0-48fe-ba7e-d13937c7d6ce\flaky_croissant_1791572952610.jpg",
            r"public/images/cafe/croissant.png",
            18, 12
        ),
        (
            r"C:\Users\owais\.gemini\antigravity-ide\brain\4373bed5-a5a0-48fe-ba7e-d13937c7d6ce\latte_art_cup_1791573078601.jpg",
            r"public/images/cafe/espresso-cup.png",
            18, 12
        )
    ]

    for inp, outp, tol, fth in assets:
        if os.path.exists(inp):
            extract_alpha_matte(inp, outp, tolerance=tol, feather=fth)
        else:
            print(f"Warning: {inp} not found!")
