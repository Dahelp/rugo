from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"


def font(size):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/seguisb.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def make_icon(size):
    img = Image.new("RGBA", (size, size), "#102338")
    draw = ImageDraw.Draw(img)

    for y in range(size):
        t = y / max(1, size - 1)
        r = int(13 + 20 * t)
        g = int(31 + 48 * t)
        b = int(51 + 24 * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    pad = int(size * 0.14)
    block = [pad, pad, size - pad, size - pad]
    rounded_rect(draw, block, int(size * 0.16), "#f5b51b", "#fff3ad", max(2, int(size * 0.018)))

    stud_r = int(size * 0.07)
    stud_y = pad + int(size * 0.15)
    for cx in (pad + int(size * 0.22), size - pad - int(size * 0.22)):
        draw.ellipse(
            [cx - stud_r, stud_y - stud_r, cx + stud_r, stud_y + stud_r],
            fill="#ffd95d",
            outline="#a85f00",
            width=max(1, int(size * 0.012)),
        )

    letter = "R"
    fnt = font(int(size * 0.48))
    bbox = draw.textbbox((0, 0), letter, font=fnt)
    tx = (size - (bbox[2] - bbox[0])) / 2
    ty = (size - (bbox[3] - bbox[1])) / 2 + int(size * 0.04)
    draw.text((tx + int(size * 0.018), ty + int(size * 0.018)), letter, font=fnt, fill=(85, 44, 0, 130))
    draw.text((tx, ty), letter, font=fnt, fill="#17253a")
    return img


def make_splash(width, height):
    img = Image.new("RGBA", (width, height), "#07111f")
    draw = ImageDraw.Draw(img)
    for y in range(height):
        t = y / max(1, height - 1)
        r = int(7 + 22 * t)
        g = int(17 + 40 * t)
        b = int(31 + 28 * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    logo_size = int(min(width, height) * 0.28)
    icon = make_icon(logo_size)
    img.alpha_composite(icon, ((width - logo_size) // 2, int(height * 0.24)))

    title = "RUGO"
    fnt = font(int(min(width, height) * 0.12))
    bbox = draw.textbbox((0, 0), title, font=fnt)
    tx = (width - (bbox[2] - bbox[0])) / 2
    ty = int(height * 0.24) + logo_size + int(height * 0.035)
    draw.text((tx + 4, ty + 5), title, font=fnt, fill=(0, 0, 0, 150))
    draw.text((tx, ty), title, font=fnt, fill="#ffd95d")
    return img.convert("RGB")


def save_icon_set():
    sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in sizes.items():
        target = RES / folder
        target.mkdir(parents=True, exist_ok=True)
        img = make_icon(size)
        img.save(target / "ic_launcher.png")
        img.save(target / "ic_launcher_round.png")
        img.save(target / "ic_launcher_foreground.png")


def save_splash_set():
    sizes = {
        "drawable": (1080, 1920),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
    }
    for folder, size in sizes.items():
        target = RES / folder
        target.mkdir(parents=True, exist_ok=True)
        make_splash(*size).save(target / "splash.png")


if __name__ == "__main__":
    save_icon_set()
    save_splash_set()
    print("Generated Android icon and splash assets.")
