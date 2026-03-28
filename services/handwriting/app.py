from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
import os
import random
import time
import uuid
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "images"
ASSETS_DIR = BASE_DIR / "assets"
OUTPUT_DIR.mkdir(exist_ok=True)

app = Flask(__name__)
CORS(app)

A4_WIDTH = 1240
A4_HEIGHT = 1754
MARGIN_X = 90
MARGIN_Y = 120
FONT_PATH = os.environ.get("HANDWRITING_FONT_PATH", str(ASSETS_DIR / "handwriting.ttf"))
PAPER_PATH = os.environ.get("HANDWRITING_PAPER_PATH", str(ASSETS_DIR / "paper.png"))


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if os.path.exists(FONT_PATH):
        try:
            return ImageFont.truetype(FONT_PATH, size=size)
        except Exception:
            pass
    return ImageFont.load_default()


def create_paper_background(width: int, height: int) -> Image.Image:
    if os.path.exists(PAPER_PATH):
        try:
            paper = Image.open(PAPER_PATH).convert("RGB")
            return paper.resize((width, height))
        except Exception:
            pass

    base = Image.new("RGB", (width, height), color=(250, 248, 240))
    noise = Image.effect_noise((width, height), 8).convert("L")
    noise_rgb = Image.merge("RGB", (noise, noise, noise))
    paper = Image.blend(base, noise_rgb, 0.07)

    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    line_color = (160, 185, 210, 40)
    for y in range(MARGIN_Y, height - MARGIN_Y, 80):
        draw.line((MARGIN_X, y, width - MARGIN_X, y), fill=line_color, width=1)

    paper = Image.alpha_composite(paper.convert("RGBA"), overlay).convert("RGB")
    return paper


def wrap_text(text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return []

    lines: list[str] = []
    current = ""
    for word in words:
        test_line = f"{current} {word}".strip()
        width = font.getbbox(test_line)[2]
        if width > max_width and current:
            lines.append(current)
            current = word
        else:
            current = test_line
    if current:
        lines.append(current)
    return lines


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/images/<path:filename>")
def images(filename):
    return send_from_directory(OUTPUT_DIR, filename)


@app.route("/generate", methods=["POST"])
def generate():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()

    if not text:
        return jsonify({"message": "Text is required"}), 400

    filename = f"{uuid.uuid4().hex}.png"
    output_path = OUTPUT_DIR / filename

    start = time.time()
    font = load_font(size=36)
    line_height = font.getbbox("Ag")[3] - font.getbbox("Ag")[1] + 14
    max_width = A4_WIDTH - (MARGIN_X * 2)

    lines = wrap_text(text, font, max_width)
    paper = create_paper_background(A4_WIDTH, A4_HEIGHT)
    draw = ImageDraw.Draw(paper)

    y = MARGIN_Y
    for line in lines:
        if y + line_height > A4_HEIGHT - MARGIN_Y:
            break
        jitter_x = random.randint(-2, 2)
        jitter_y = random.randint(-1, 1)
        draw.text(
            (MARGIN_X + jitter_x, y + jitter_y),
            line,
            fill=(25, 24, 28),
            font=font
        )
        y += line_height

    paper.save(output_path)
    generation_time_ms = int((time.time() - start) * 1000)

    image_url = request.host_url.rstrip("/") + f"/images/{filename}"
    return jsonify({"imageUrl": image_url, "generationTimeMs": generation_time_ms})


if __name__ == "__main__":
    port = int(os.environ.get("HANDWRITING_PORT", "5001"))
    app.run(host="0.0.0.0", port=port)
