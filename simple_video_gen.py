#!/usr/bin/env python3
"""
Simple Video Generator - 100% FREE
Creates videos using only PIL (Python Imaging Library)
No FFmpeg required for initial testing
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
from pathlib import Path

class SimpleVideoGenerator:
    def __init__(self, width=1280, height=720):
        self.width = width
        self.height = height
        
    def create_scene_image(self, scene_num, urdu_text, style_colors):
        """Create a single beautiful frame for the scene"""
        
        # Create base image with gradient
        img = Image.new('RGB', (self.width, self.height))
        draw = ImageDraw.Draw(img)
        
        # Draw gradient background
        for y in range(self.height):
            ratio = y / self.height
            r = int(style_colors['top'][0] * (1-ratio) + style_colors['bottom'][0] * ratio)
            g = int(style_colors['top'][1] * (1-ratio) + style_colors['bottom'][1] * ratio)
            b = int(style_colors['top'][2] * (1-ratio) + style_colors['bottom'][2] * ratio)
            draw.line([(0, y), (self.width, y)], fill=(r, g, b))
        
        # Add decorative frame
        frame_color = style_colors['accent']
        thickness = 10
        # Top
        draw.rectangle([20, 20, self.width-20, 20+thickness], fill=frame_color)
        # Bottom  
        draw.rectangle([20, self.height-20-thickness, self.width-20, self.height-20], fill=frame_color)
        # Left
        draw.rectangle([20, 20, 20+thickness, self.height-20], fill=frame_color)
        # Right
        draw.rectangle([self.width-20-thickness, 20, self.width-20, self.height-20], fill=frame_color)
        
        # Add corner decorations
        corner_size = 80
        draw.arc([40, 40, 40+corner_size, 40+corner_size], 0, 90, fill=frame_color, width=5)
        draw.arc([self.width-40-corner_size, 40, self.width-40, 40+corner_size], 90, 180, fill=frame_color, width=5)
        draw.arc([40, self.height-40-corner_size, 40+corner_size, self.height-40], 270, 360, fill=frame_color, width=5)
        draw.arc([self.width-40-corner_size, self.height-40-corner_size, self.width-40, self.height-40], 180, 270, fill=frame_color, width=5)
        
        # Add scene number
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 120)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
        except:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Scene number in center-top
        scene_text = f"منظر {scene_num}"  # "Scene" in Urdu
        bbox = draw.textbbox((0, 0), scene_text, font=font_large)
        text_width = bbox[2] - bbox[0]
        x = (self.width - text_width) // 2
        y = 120
        
        # Shadow
        draw.text((x+3, y+3), scene_text, font=font_large, fill=(0, 0, 0, 128))
        # Main text
        draw.text((x, y), scene_text, font=font_large, fill=style_colors['text'])
        
        # Add Urdu text (wrapped)
        words = urdu_text.split()
        lines = []
        current_line = []
        
        for word in words:
            current_line.append(word)
            test_line = ' '.join(current_line)
            bbox = draw.textbbox((0, 0), test_line, font=font_small)
            if bbox[2] - bbox[0] > self.width - 200:
                current_line.pop()
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
        
        if current_line:
            lines.append(' '.join(current_line))
        
        # Draw wrapped text
        text_y = self.height // 2 - (len(lines) * 50) // 2
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font_small)
            line_width = bbox[2] - bbox[0]
            line_x = (self.width - line_width) // 2
            
            # Shadow
            draw.text((line_x+2, text_y+2), line, font=font_small, fill=(0, 0, 0, 180))
            # Main
            draw.text((line_x, text_y), line, font=font_small, fill=(255, 255, 255))
            text_y += 55
        
        return img


def generate_all_scenes():
    """Generate images for all scenes"""
    
    # Color schemes for different scenes
    color_schemes = [
        {  # Scene 1: Historical Delhi - Brown/Gold
            'top': (101, 67, 33),
            'bottom': (160, 120, 80),
            'accent': (218, 165, 32),
            'text': (255, 248, 220)
        },
        {  # Scene 2: Poetry - Deep Blue/Gold
            'top': (25, 25, 112),
            'bottom': (100, 149, 237),
            'accent': (255, 215, 0),
            'text': (255, 255, 255)
        },
        {  # Scene 3: Legacy - Dark Green/Gold
            'top': (47, 79, 79),
            'bottom': (95, 158, 160),
            'accent': (176, 196, 222),
            'text': (245, 245, 245)
        }
    ]
    
    # Load story
    story_file = Path("output/test_generation/story.txt")
    if story_file.exists():
        story = story_file.read_text(encoding='utf-8')
        scenes = [line.strip() for line in story.split('\n') if line.strip().startswith('Scene')]
    else:
        scenes = [
            "Scene 1: دہلی کی گنجان گلیوں میں، سرخ اینٹوں کے پرانے گھر کے اندر",
            "Scene 2: جوانی میں میر کی قلم سے نکلنے والی غمگین غزلیں",
            "Scene 3: آخری سانسیں دہلی کے پرانی بستی میں"
        ]
    
    # Create output directory
    output_dir = Path("output/simple_videos")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    generator = SimpleVideoGenerator()
    
    print("🎨 Simple Video Generator - 100% FREE")
    print("=" * 50)
    
    generated_files = []
    
    for i, scene in enumerate(scenes[:3], 1):
        print(f"\n📹 Generating Scene {i}...")
        
        # Extract scene text
        scene_text = scene.split(':', 1)[1].strip() if ':' in scene else scene
        scene_text = scene_text[:150]  # Limit length
        
        # Generate image
        img = generator.create_scene_image(i, scene_text, color_schemes[i-1])
        
        # Save as high-quality image
        output_file = output_dir / f"scene_{i:02d}.png"
        img.save(output_file, 'PNG', quality=95)
        
        print(f"✅ Saved: {output_file}")
        print(f"   Size: {img.size}")
        generated_files.append(str(output_file))
    
    print(f"\n{'='*50}")
    print("🎉 ALL SCENE IMAGES GENERATED!")
    print(f"{'='*50}")
    print(f"\n📁 Location: {output_dir}")
    print(f"\n✅ Generated files:")
    for f in generated_files:
        print(f"   • {f}")
    
    print(f"\n🎬 Next Steps:")
    print(f"\n   Option 1: Use FFmpeg to create video")
    print(f"   -----------")
    for i in range(1, 4):
        print(f"   ffmpeg -loop 1 -i {output_dir}/scene_{i:02d}.png -c:v libx264 \\")
        print(f"          -t 5 -pix_fmt yuv420p {output_dir}/scene_{i:02d}.mp4")
    
    print(f"\n   Option 2: Upload to Kapwing")
    print(f"   -----------")
    print(f"   1. Go to: https://kapwing.com/studio/editor")
    print(f"   2. Upload all 3 PNG images")
    print(f"   3. Set each image duration to 5 seconds")
    print(f"   4. Add fade transitions")
    print(f"   5. Export as video!")
    
    print(f"\n✨ 100% Free - No API costs, No cloud processing!")
    
    return generated_files


if __name__ == "__main__":
    generate_all_scenes()
