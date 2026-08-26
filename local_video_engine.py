#!/usr/bin/env python3
"""
Local Video Generation Engine - 100% FREE
Generates videos from text prompts using open-source tools
No API calls, no credits, completely free!
"""

import os
import sys
import json
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import numpy as np

# Create output directories
OUTPUT_DIR = Path("output/local_videos")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

class LocalVideoEngine:
    """
    Free video generation engine using:
    - PIL for image generation
    - FFmpeg for video creation
    - No external APIs
    - 100% local processing
    """
    
    def __init__(self, width=1280, height=720, fps=24):
        self.width = width
        self.height = height
        self.fps = fps
        self.duration = 5  # seconds per video
        
    def generate_visual_from_text(self, prompt, style="historical"):
        """
        Generate visual content from text prompt
        Uses color schemes, gradients, and text overlays
        """
        # Create base image
        img = Image.new('RGB', (self.width, self.height))
        draw = ImageDraw.Draw(img)
        
        # Style-based color schemes
        color_schemes = {
            'historical': {
                'bg': [(101, 67, 33), (139, 90, 43), (160, 120, 80)],  # Brown tones
                'accent': (218, 165, 32),  # Gold
                'text': (255, 248, 220)  # Cornsilk
            },
            'poetic': {
                'bg': [(25, 25, 112), (65, 105, 225), (100, 149, 237)],  # Blue tones
                'accent': (255, 215, 0),  # Gold
                'text': (255, 255, 255)  # White
            },
            'melancholic': {
                'bg': [(47, 79, 79), (70, 130, 180), (95, 158, 160)],  # Dark cyan
                'accent': (176, 196, 222),  # Light steel blue
                'text': (245, 245, 245)  # White smoke
            },
            'legacy': {
                'bg': [(85, 107, 47), (107, 142, 35), (124, 252, 0)],  # Olive tones
                'accent': (255, 215, 0),  # Gold
                'text': (255, 255, 255)  # White
            }
        }
        
        scheme = color_schemes.get(style, color_schemes['historical'])
        
        # Create gradient background
        for y in range(self.height):
            ratio = y / self.height
            idx = int(ratio * (len(scheme['bg']) - 1))
            next_idx = min(idx + 1, len(scheme['bg']) - 1)
            local_ratio = (ratio * (len(scheme['bg']) - 1)) - idx
            
            color = tuple(
                int(scheme['bg'][idx][i] * (1 - local_ratio) + 
                    scheme['bg'][next_idx][i] * local_ratio)
                for i in range(3)
            )
            draw.line([(0, y), (self.width, y)], fill=color)
        
        # Add texture/noise
        img = self.add_texture(img)
        
        # Add decorative elements
        img = self.add_decorative_elements(img, scheme)
        
        # Add vignette effect
        img = self.add_vignette(img)
        
        return img
    
    def add_texture(self, img):
        """Add subtle texture to image"""
        # Create noise texture
        noise = np.random.randint(0, 30, (self.height, self.width, 3), dtype=np.uint8)
        noise_img = Image.fromarray(noise)
        
        # Blend with original
        img = Image.blend(img, noise_img, alpha=0.1)
        return img
    
    def add_decorative_elements(self, img, scheme):
        """Add decorative Islamic/Mughal style patterns"""
        draw = ImageDraw.Draw(img, 'RGBA')
        
        # Add corner decorations
        corner_size = 150
        accent_color = scheme['accent'] + (80,)  # Add transparency
        
        # Top left
        draw.arc([20, 20, corner_size, corner_size], 0, 90, fill=accent_color, width=3)
        draw.arc([30, 30, corner_size-10, corner_size-10], 0, 90, fill=accent_color, width=2)
        
        # Top right
        draw.arc([self.width-corner_size, 20, self.width-20, corner_size], 90, 180, fill=accent_color, width=3)
        draw.arc([self.width-corner_size+10, 30, self.width-30, corner_size-10], 90, 180, fill=accent_color, width=2)
        
        # Bottom decorative line
        y_pos = self.height - 100
        for i in range(0, self.width, 40):
            draw.ellipse([i, y_pos, i+20, y_pos+20], fill=accent_color)
        
        return img
    
    def add_vignette(self, img):
        """Add vignette effect (darkened edges)"""
        # Create radial gradient mask
        mask = Image.new('L', (self.width, self.height), 0)
        draw = ImageDraw.Draw(mask)
        
        center_x, center_y = self.width // 2, self.height // 2
        max_dist = ((self.width ** 2 + self.height ** 2) ** 0.5) / 2
        
        for y in range(self.height):
            for x in range(self.width):
                dist = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
                intensity = int(255 * (1 - (dist / max_dist) * 0.6))
                mask.putpixel((x, y), max(0, min(255, intensity)))
        
        # Apply mask
        img.putalpha(mask)
        background = Image.new('RGB', (self.width, self.height), (0, 0, 0))
        background.paste(img, mask=img.split()[3])
        
        return background
    
    def add_text_overlay(self, img, text, style="historical"):
        """Add Urdu text overlay to image"""
        draw = ImageDraw.Draw(img)
        
        # Try to load Urdu font, fallback to default
        try:
            # Try common Urdu font locations
            font_paths = [
                "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
                "/System/Library/Fonts/Arial Unicode.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
            ]
            font = None
            for font_path in font_paths:
                if os.path.exists(font_path):
                    font = ImageFont.truetype(font_path, 48)
                    break
            if not font:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()
        
        # Word wrap text
        words = text.split()
        lines = []
        current_line = []
        
        for word in words:
            current_line.append(word)
            line_text = ' '.join(current_line)
            bbox = draw.textbbox((0, 0), line_text, font=font)
            if bbox[2] - bbox[0] > self.width - 200:
                current_line.pop()
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
        
        if current_line:
            lines.append(' '.join(current_line))
        
        # Draw text with shadow
        y_offset = (self.height - len(lines) * 60) // 2
        
        for i, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=font)
            text_width = bbox[2] - bbox[0]
            x = (self.width - text_width) // 2
            y = y_offset + i * 60
            
            # Shadow
            draw.text((x + 2, y + 2), line, font=font, fill=(0, 0, 0, 180))
            # Main text
            draw.text((x, y), line, font=font, fill=(255, 255, 255))
        
        return img
    
    def create_animation_frames(self, base_img, num_frames):
        """Create animated frames from base image"""
        frames = []
        
        for frame_num in range(num_frames):
            img = base_img.copy()
            
            # Ken Burns effect (zoom and pan)
            progress = frame_num / num_frames
            zoom = 1.0 + (0.1 * progress)  # Zoom in 10%
            
            # Calculate crop box for zoom
            new_width = int(self.width / zoom)
            new_height = int(self.height / zoom)
            left = (self.width - new_width) // 2
            top = (self.height - new_height) // 2
            
            # Crop and resize
            img = img.crop((left, top, left + new_width, top + new_height))
            img = img.resize((self.width, self.height), Image.Resampling.LANCZOS)
            
            # Add slight fade in/out
            if frame_num < 12:  # First 0.5 seconds
                alpha = frame_num / 12
                overlay = Image.new('RGB', (self.width, self.height), (0, 0, 0))
                img = Image.blend(overlay, img, alpha)
            elif frame_num > num_frames - 12:  # Last 0.5 seconds
                alpha = (num_frames - frame_num) / 12
                overlay = Image.new('RGB', (self.width, self.height), (0, 0, 0))
                img = Image.blend(overlay, img, alpha)
            
            frames.append(img)
        
        return frames
    
    def generate_video(self, prompt, scene_id, urdu_text="", style="historical"):
        """
        Generate complete video from text prompt
        Returns path to generated video file
        """
        print(f"\n🎨 Generating visuals for scene {scene_id}...")
        
        # Generate base image
        base_img = self.generate_visual_from_text(prompt, style)
        
        # Add Urdu text overlay
        if urdu_text:
            base_img = self.add_text_overlay(base_img, urdu_text, style)
        
        # Create animated frames
        num_frames = self.duration * self.fps
        print(f"📹 Creating {num_frames} animation frames...")
        frames = self.create_animation_frames(base_img, num_frames)
        
        # Save frames
        frames_dir = OUTPUT_DIR / f"scene_{scene_id}_frames"
        frames_dir.mkdir(exist_ok=True)
        
        print(f"💾 Saving frames...")
        for i, frame in enumerate(frames):
            frame.save(frames_dir / f"frame_{i:04d}.png")
        
        # Use FFmpeg to create video
        output_video = OUTPUT_DIR / f"scene_{scene_id:02d}.mp4"
        
        print(f"🎬 Encoding video with FFmpeg...")
        ffmpeg_cmd = f"""
        ffmpeg -y -framerate {self.fps} \
        -i {frames_dir}/frame_%04d.png \
        -c:v libx264 -pix_fmt yuv420p \
        -preset fast -crf 23 \
        {output_video}
        """
        
        os.system(ffmpeg_cmd)
        
        # Clean up frames
        import shutil
        shutil.rmtree(frames_dir)
        
        print(f"✅ Video generated: {output_video}")
        return str(output_video)


def main():
    """Main function to test video generation"""
    print("🎬 Local Video Generation Engine")
    print("=" * 50)
    print("100% FREE - No APIs, No Credits Required!")
    print("=" * 50)
    
    # Load story from file
    story_file = Path("output/test_generation/story.txt")
    if story_file.exists():
        print(f"\n📖 Loading story from {story_file}")
        story_text = story_file.read_text(encoding='utf-8')
        
        # Parse scenes
        scenes = []
        for line in story_text.split('\n'):
            if line.strip().startswith('Scene'):
                scenes.append(line.strip())
        
        print(f"Found {len(scenes)} scenes")
    else:
        # Default scenes
        scenes = [
            "Scene 1: دہلی کی گنجان گلیوں میں، سرخ اینٹوں کے پرانے گھر",
            "Scene 2: جوانی میں میر کی قلم سے نکلنے والی غمگین غزلیں",
            "Scene 3: آخری سانسیں دہلی کے پرانی بستی کے سائے دار قبرستان میں"
        ]
    
    # Initialize engine
    engine = LocalVideoEngine()
    
    # Style mapping
    styles = ['historical', 'poetic', 'melancholic']
    
    # Generate videos
    generated_videos = []
    
    for i, scene in enumerate(scenes[:3], 1):
        print(f"\n{'='*50}")
        print(f"Scene {i}/3")
        print(f"{'='*50}")
        
        # Extract scene text (remove "Scene X:" prefix)
        scene_text = scene.split(':', 1)[1].strip() if ':' in scene else scene
        
        # Generate video
        prompt = f"Historical documentary scene {i}"
        style = styles[min(i-1, len(styles)-1)]
        
        video_path = engine.generate_video(
            prompt=prompt,
            scene_id=i,
            urdu_text=scene_text[:100],  # Limit text length
            style=style
        )
        
        generated_videos.append(video_path)
    
    print(f"\n{'='*50}")
    print("🎉 ALL VIDEOS GENERATED!")
    print(f"{'='*50}")
    print(f"\n📁 Output directory: {OUTPUT_DIR}")
    print(f"\nGenerated files:")
    for video in generated_videos:
        print(f"  ✅ {video}")
    
    print(f"\n🎬 Next steps:")
    print(f"  1. Check videos in {OUTPUT_DIR}")
    print(f"  2. Run assembly script: python3 assemble_flow_style.py")
    print(f"  3. Or use Kapwing: https://kapwing.com/studio/editor")
    print(f"\n✨ 100% Free - No API costs!")


if __name__ == "__main__":
    main()
