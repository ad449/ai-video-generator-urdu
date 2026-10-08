#!/usr/bin/env python3
"""Assemble Flow-style documentary: LTX motion + Urdu voice + subs + xfade + music."""
from __future__ import annotations

import json
import math
import subprocess
import textwrap
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output" / "v2"
W, H, FPS = 1280, 720, 24
XFADE = 0.6


def probe_dur(path: Path) -> float:
    return float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=nw=1:nk=1",
                str(path),
            ],
            text=True,
        ).strip()
    )


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def make_cinematic_still(img: Path, dest: Path, duration: float, sid: int) -> None:
    """Stronger camera move than a simple fade — documentary-style zoom/pan."""
    # alternate zoom-in / zoom-out / pan
    patterns = [
        "z='min(1.0+0.12*on/({frames}),1.14)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
        "z='min(1.14-0.12*on/({frames}),1.14)':x='iw/2-(iw/zoom/2)-40*on/({frames})':y='ih/2-(ih/zoom/2)'",
        "z='min(1.0+0.10*on/({frames}),1.12)':x='40*on/({frames})':y='ih/2-(ih/zoom/2)'",
        "z='min(1.0+0.08*on/({frames}),1.10)':x='iw/2-(iw/zoom/2)':y='30*on/({frames})'",
    ]
    frames = max(int(duration * FPS), FPS)
    zp = patterns[(sid - 1) % len(patterns)].format(frames=frames)
    vf = (
        f"scale={W}:{H}:force_original_aspect_ratio=increase,"
        f"crop={W}:{H},"
        f"zoompan={zp}:d={frames}:s={W}x{H}:fps={FPS},"
        "eq=contrast=1.05:saturation=1.08:brightness=0.02,"
        "format=yuv420p"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(img),
            "-vf",
            vf,
            "-t",
            f"{duration:.3f}",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-an",
            str(dest),
        ]
    )


def extend_motion(src: Path, dest: Path, duration: float) -> None:
    """Loop/slow real motion clip to match narration length."""
    src_d = max(probe_dur(src), 0.5)
    # slow down a bit for cinematic feel, then loop
    speed = min(0.85, duration / max(src_d * 1.2, 0.1))
    # pts slow + loop via stream_loop
    loops = max(int(math.ceil(duration / (src_d / max(speed, 0.3)))), 1)
    vf = (
        f"setpts={1/max(speed,0.25)}*PTS,"
        f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
        f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,"
        f"fps={FPS},format=yuv420p,"
        "eq=contrast=1.04:saturation=1.06"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-stream_loop",
            str(loops),
            "-i",
            str(src),
            "-vf",
            vf,
            "-t",
            f"{duration:.3f}",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-an",
            str(dest),
        ]
    )


def make_title(dest: Path, title: str, duration: float = 3.0) -> None:
    # escape for drawtext
    t = title.replace(":", "\\:").replace("'", "\u2019")
    # split long title
    lines = textwrap.wrap(title, width=22) or [title]
    draws = []
    for i, line in enumerate(lines[:3]):
        safe = (
            line.replace("\\", "\\\\")
            .replace(":", "\\:")
            .replace("'", "\u2019")
            .replace("%", "\\%")
        )
        y = f"(h-text_h)/2+{(i - (len(lines[:3]) - 1) / 2) * 48}"
        draws.append(
            f"drawtext=text='{safe}':fontcolor=white:fontsize=42:"
            f"x=(w-text_w)/2:y={y}:shadowcolor=black@0.6:shadowx=2:shadowy=2"
        )
    vf = (
        f"color=c=0x0b1220:s={W}x{H}:d={duration},"
        + ",".join(draws)
        + ",format=yuv420p"
    )
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"color=c=0x0b1220:s={W}x{H}:d={duration}",
            "-vf",
            ",".join(draws) + ",fade=t=in:st=0:d=0.6,fade=t=out:st={:.2f}:d=0.6,format=yuv420p".format(duration - 0.6),
            "-t",
            str(duration),
            "-r",
            str(FPS),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-an",
            str(dest),
        ]
    )


def write_ass(path: Path, cues: list[tuple[float, float, str]]) -> None:
    def ts(t: float) -> str:
        h = int(t // 3600)
        m = int((t % 3600) // 60)
        s = t % 60
        return f"{h}:{m:02d}:{s:05.2f}"

    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Naskh Arabic,38,&H00FFFFFF,&H000000FF,&H80000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,40,40,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    for start, end, text in cues:
        body = text.replace("\n", " ").replace("{", "(").replace("}", ")")
        lines.append(f"Dialogue: 0,{ts(start)},{ts(end)},Default,,0,0,0,,{body}\n")
    path.write_text("".join(lines), encoding="utf-8")


def concat_xfade(clips: list[Path], dest: Path) -> float:
    if len(clips) == 1:
        run(["ffmpeg", "-y", "-i", str(clips[0]), "-c:v", "libx264", "-pix_fmt", "yuv420p", str(dest)])
        return probe_dur(dest)

    durs = [probe_dur(c) for c in clips]
    # build filter complex xfade chain
    inputs = []
    for c in clips:
        inputs += ["-i", str(c)]
    parts = []
    # normalize each
    for i in range(len(clips)):
        parts.append(f"[{i}:v]fps={FPS},format=yuv420p,settb=AVTB[v{i}]")
    prev = "v0"
    offset = durs[0] - XFADE
    for i in range(1, len(clips)):
        out = "vout" if i == len(clips) - 1 else f"vx{i}"
        parts.append(
            f"[{prev}][v{i}]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}[{out}]"
        )
        prev = out
        if i < len(clips) - 1:
            offset += durs[i] - XFADE
    fc = ";".join(parts)
    run(
        [
            "ffmpeg",
            "-y",
            *inputs,
            "-filter_complex",
            fc,
            "-map",
            f"[{prev}]",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(dest),
        ]
    )
    return probe_dur(dest)


def make_music(dest: Path, duration: float) -> None:
    # soft ambient bed (two sine pads) — free, no copyright
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=110:sample_rate=44100:duration={duration}",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=164.81:sample_rate=44100:duration={duration}",
            "-filter_complex",
            "[0:a]volume=0.04[a0];[1:a]volume=0.03[a1];[a0][a1]amix=inputs=2:duration=longest,lowpass=f=800,volume=0.7[a]",
            "-map",
            "[a]",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            str(dest),
        ]
    )


def assemble(
    story: dict,
    img_dir: Path,
    audio_dir: Path,
    motion_dir: Path,
    work: Path,
    final: Path,
    extra_motion: Path | None = None,
) -> Path:
    work.mkdir(parents=True, exist_ok=True)
    extra_motion = extra_motion or (ROOT / "output" / "hf_clip.mp4")

    title_clip = work / "title.mp4"
    make_title(title_clip, story.get("title", "کہانی"), 3.2)

    scene_clips: list[Path] = []
    cues: list[tuple[float, float, str]] = []
    audio_parts: list[Path] = []

    # silent title audio pad
    title_a = work / "title_a.m4a"
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=mono",
            "-t",
            "3.2",
            "-c:a",
            "aac",
            str(title_a),
        ]
    )
    audio_parts.append(title_a)

    t_cursor = 3.2
    for sc in story["scenes"]:
        sid = sc["id"]
        a = audio_dir / f"scene_{sid:02d}.mp3"
        if not a.exists() or a.stat().st_size < 1000:
            raise SystemExit(f"missing audio {a}")
        adur = probe_dur(a)
        vdur = adur + 0.35
        out_v = work / f"scene_{sid:02d}.mp4"
        mot = motion_dir / f"scene_{sid:02d}.mp4"
        if mot.exists() and mot.stat().st_size > 50_000:
            print(f"scene {sid}: real motion")
            extend_motion(mot, out_v, vdur)
        elif sid == 1 and extra_motion.exists() and extra_motion.stat().st_size > 50_000:
            print(f"scene {sid}: extra motion clip")
            extend_motion(extra_motion, out_v, vdur)
        else:
            print(f"scene {sid}: cinematic still")
            make_cinematic_still(img_dir / f"scene_{sid:02d}.jpg", out_v, vdur, sid)

        scene_clips.append(out_v)
        cues.append((t_cursor, t_cursor + adur, sc["urdu"].replace("\n", " ")))
        # audio with tiny padding
        ap = work / f"scene_{sid:02d}_a.m4a"
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(a),
                "-af",
                f"apad=pad_dur={vdur},atrim=0:{vdur:.3f}",
                "-c:a",
                "aac",
                str(ap),
            ]
        )
        audio_parts.append(ap)
        t_cursor += vdur - XFADE

    # visual timeline: title + scenes with xfade
    visuals = [title_clip] + scene_clips
    video_only = work / "video_only.mp4"
    print("xfade assemble...")
    vdur = concat_xfade(visuals, video_only)

    # concat audio
    alist = work / "audio_list.txt"
    alist.write_text("".join(f"file '{p.resolve()}'\n" for p in audio_parts))
    narration = work / "narration.m4a"
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(alist),
            "-c:a",
            "aac",
            str(narration),
        ]
    )

    music = work / "music.m4a"
    make_music(music, vdur + 1)

    ass = work / "subs.ass"
    write_ass(ass, cues)
    # mix narration + music, burn subs (ass path without spaces)
    fc = (
        "[1:a]volume=1.0[nar];[2:a]volume=0.22[mus];"
        "[nar][mus]amix=inputs=2:duration=first:dropout_transition=2[a];"
        f"[0:v]ass={ass}[v]"
    )
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_only),
        "-i",
        str(narration),
        "-i",
        str(music),
        "-filter_complex",
        fc,
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        str(final),
    ]
    print("mux final...", flush=True)
    subprocess.run(cmd, check=True)
    print("FINAL", final, "duration", probe_dur(final), "size", final.stat().st_size)
    return final


def main() -> None:
    story = json.loads((ROOT / "output" / "story_scenes.json").read_text())
    assemble(
        story=story,
        img_dir=ROOT / "output" / "scenes",
        audio_dir=OUT / "audio",
        motion_dir=OUT / "motion",
        work=OUT / "build",
        final=OUT / "mir_flow_style_1min.mp4",
    )


if __name__ == "__main__":
    main()
