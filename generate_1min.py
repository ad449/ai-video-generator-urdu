#!/usr/bin/env python3
"""Generate ~1 minute video: Groq story scenes -> HF Wan text-to-video -> ffmpeg concat."""
import json
import re
import subprocess
import time
from pathlib import Path

from huggingface_hub import InferenceClient

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"
CLIPS = OUT / "hf_scenes"
CLIPS.mkdir(parents=True, exist_ok=True)

MODEL = "Wan-AI/Wan2.1-T2V-14B"
TARGET_SCENES = 12


def load_keys():
    tokens = (ROOT / "apikey").read_text().split()
    groq = next(t for t in tokens if t.startswith("gsk_"))
    hf = next(t for t in tokens if t.startswith("hf_"))
    return groq, hf


def load_story():
    raw = json.loads((OUT / "story.json").read_text())
    content = raw["choices"][0]["message"]["content"]
    content = re.sub(r"^```(?:json)?\n?|\n?```$", "", content.strip())
    return json.loads(content)


def generate_clip(client: InferenceClient, prompt: str, path: Path) -> Path:
    print(f"  generating -> {path.name} ...", flush=True)
    t0 = time.time()
    data = client.text_to_video(prompt, model=MODEL)
    path.write_bytes(data)
    print(f"  saved {path.name} ({len(data)} bytes, {time.time()-t0:.0f}s)", flush=True)
    return path


def concat(clips, final: Path):
    listfile = OUT / "hf_concat.txt"
    listfile.write_text("".join(f"file '{c.resolve()}'\n" for c in clips))
    # re-encode for consistent params
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
            "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=24,format=yuv420p",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(final),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    dur = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(final)],
        text=True,
    ).strip()
    print(f"FINAL {final} duration={dur}s size={final.stat().st_size}", flush=True)


def main():
    _, hf = load_keys()
    story = load_story()
    scenes = story["scenes"][:TARGET_SCENES]
    (OUT / "story_scenes.json").write_text(json.dumps(story, ensure_ascii=False, indent=2))
    print(f"Title: {story.get('title')}")
    print(f"Generating {len(scenes)} clips with {MODEL}")

    client = InferenceClient(token=hf, provider="auto")
    clips = []

    # reuse successful test clip as scene 01 if prompt-less test exists and no scene yet
    for sc in scenes:
        sid = sc["id"]
        path = CLIPS / f"scene_{sid:02d}.mp4"
        if path.exists() and path.stat().st_size > 100_000:
            print(f"  skip existing {path.name}")
            clips.append(path)
            continue
        prompt = (
            sc["visual"]
            + ". Cinematic historical documentary shot, natural motion, 18th century South Asia, no text overlay."
        )
        for attempt in range(3):
            try:
                generate_clip(client, prompt[:800], path)
                clips.append(path)
                break
            except Exception as e:
                print(f"  attempt {attempt+1} failed: {e}")
                time.sleep(5)
        else:
            print(f"  GIVING UP on scene {sid}")

    if not clips:
        raise SystemExit("No clips generated")

    # If under 60s, loop clips to reach ~60s
    durations = []
    for c in clips:
        d = float(
            subprocess.check_output(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(c)],
                text=True,
            ).strip()
        )
        durations.append(d)
    total = sum(durations)
    print(f"Raw total duration: {total:.1f}s from {len(clips)} clips")

    expanded = list(clips)
    i = 0
    while sum(
        float(
            subprocess.check_output(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(c)],
                text=True,
            ).strip()
        )
        for c in expanded
    ) < 58 and i < 24:
        expanded.append(clips[i % len(clips)])
        i += 1

    final = OUT / "mir_taqi_mir_1min_ai.mp4"
    concat(expanded, final)


if __name__ == "__main__":
    main()
