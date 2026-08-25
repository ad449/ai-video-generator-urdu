# 🎓 Training Your Own Historical Documentary Video Model

## Complete Guide: Text-to-Historical-Video AI Model

---

## 📋 Overview

Training a custom text-to-video model specialized for historical documentaries requires:
- Video dataset (historical footage)
- Computing power (GPUs)
- Training framework
- Fine-tuning existing models

**Estimated Cost**: $500-5000 depending on approach
**Time Required**: 2-8 weeks
**Technical Level**: Advanced

---

## 🎯 Two Approaches

### Approach 1: Fine-Tune Existing Model (RECOMMENDED)
- **Faster**: 1-2 weeks
- **Cheaper**: $500-2000
- **Better Results**: Leverages pre-trained knowledge
- **Examples**: AnimateDiff, ModelScope, CogVideo

### Approach 2: Train From Scratch
- **Slower**: 2-3 months
- **Expensive**: $10,000+
- **Full Control**: Complete customization
- **Not Recommended**: Unless you have major resources

---

## 🚀 RECOMMENDED: Fine-Tune AnimateDiff

### Why AnimateDiff?
✅ Open-source and well-documented
✅ Built on Stable Diffusion (proven base)
✅ Supports LoRA fine-tuning (efficient)
✅ Active community
✅ Works on consumer GPUs

---

## 📦 Requirements

### Hardware:
```
MINIMUM (slow):
- GPU: NVIDIA RTX 3090 (24GB VRAM)
- RAM: 32GB
- Storage: 500GB SSD

RECOMMENDED (fast):
- GPU: NVIDIA A100 (40GB VRAM) or 2x RTX 4090
- RAM: 64GB
- Storage: 1TB NVMe SSD

CLOUD OPTIONS:
- Vast.ai: $0.30-0.80/hour
- RunPod: $0.40-1.20/hour  
- Lambda Labs: $1.10-3.00/hour
- Google Colab Pro+: $50/month (limited GPU hours)
```

### Software:
```bash
- Python 3.10+
- PyTorch 2.0+
- CUDA 11.8+
- Diffusers library
- Accelerate
- Transformers
```

---

## 📊 Step 1: Collect Historical Documentary Dataset

### What You Need:
- **50-200 video clips** (historical documentaries)
- **5-10 seconds each**
- **720p or 1080p resolution**
- **Matching text descriptions**

### Dataset Structure:
```
historical_dataset/
├── videos/
│   ├── mughal_architecture_001.mp4
│   ├── mughal_architecture_002.mp4
│   ├── mir_taqi_mir_poetry_001.mp4
│   └── ...
├── captions/
│   ├── mughal_architecture_001.txt
│   ├── mughal_architecture_002.txt
│   └── ...
└── metadata.json
```

### Sample Caption Format:
```json
{
  "video_id": "mughal_architecture_001",
  "caption": "Wide shot of the Taj Mahal at sunrise, warm golden light illuminating white marble domes, cinematic documentary style",
  "duration": 5.0,
  "resolution": "1920x1080",
  "fps": 24,
  "tags": ["architecture", "mughal", "historical", "taj mahal"]
}
```

### Where to Get Historical Footage:

**Free Sources:**
1. **Archive.org** - https://archive.org/details/movies
   - Public domain historical footage
   - Free to use

2. **Pexels Videos** - https://pexels.com
   - Free stock footage
   - Filter by "historical"

3. **Pixabay** - https://pixabay.com/videos/
   - Free historical clips

4. **National Archives** - Various countries have public archives
   - USA: https://catalog.archives.gov/
   - UK: https://film.nationalarchives.gov.uk/

**Paid Sources:**
1. **Getty Images** - High quality, expensive
2. **Shutterstock** - Good variety, moderate cost
3. **Pond5** - Large collection, moderate cost

**DIY Approach:**
- Use AI to generate images, then animate them
- Compile from documentaries (check licensing!)
- Create slide shows from historical photos

---

## 🛠️ Step 2: Setup Training Environment

### Option A: Local Setup (if you have GPU)

```bash
# Create conda environment
conda create -n video-training python=3.10
conda activate video-training

# Install PyTorch with CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install diffusers and dependencies
pip install diffusers transformers accelerate xformers
pip install opencv-python pillow datasets wandb
pip install bitsandbytes peft  # For LoRA training

# Clone AnimateDiff
git clone https://github.com/guoyww/AnimateDiff.git
cd AnimateDiff
pip install -r requirements.txt
```

### Option B: Cloud Setup (Vast.ai Example)

```bash
# 1. Go to vast.ai
# 2. Search for: "RTX 4090" or "A100"
# 3. Filter by: pytorch/pytorch:2.0.1-cuda11.8-cudnn8-devel
# 4. Rent instance
# 5. SSH into machine
# 6. Run setup commands above
```

---

## 🎨 Step 3: Prepare Training Data

### Script to Process Videos:

```python
# prepare_dataset.py
import cv2
import os
import json
from pathlib import Path

def process_video(video_path, output_dir, fps=8, frame_count=16):
    """Extract frames from video"""
    cap = cv2.VideoCapture(str(video_path))
    frames = []
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    indices = [int(i * total_frames / frame_count) for i in range(frame_count)]
    
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frame = cv2.resize(frame, (512, 512))  # Resize for training
            frames.append(frame)
    
    cap.release()
    return frames

def create_training_dataset(videos_dir, captions_dir, output_dir):
    """Create dataset in format for training"""
    os.makedirs(output_dir, exist_ok=True)
    
    dataset = []
    
    for video_file in Path(videos_dir).glob("*.mp4"):
        video_id = video_file.stem
        caption_file = Path(captions_dir) / f"{video_id}.txt"
        
        if not caption_file.exists():
            print(f"Skipping {video_id} - no caption")
            continue
        
        # Read caption
        with open(caption_file, 'r', encoding='utf-8') as f:
            caption = f.read().strip()
        
        # Process video
        frames = process_video(video_file, output_dir)
        
        if len(frames) == 16:  # Only use complete clips
            # Save frames
            frame_dir = Path(output_dir) / video_id
            frame_dir.mkdir(exist_ok=True)
            
            for i, frame in enumerate(frames):
                cv2.imwrite(str(frame_dir / f"frame_{i:04d}.png"), frame)
            
            dataset.append({
                "video_id": video_id,
                "caption": caption,
                "frames_path": str(frame_dir)
            })
            
            print(f"✓ Processed {video_id}")
    
    # Save metadata
    with open(Path(output_dir) / "metadata.json", 'w') as f:
        json.dump(dataset, f, indent=2)
    
    print(f"\n✅ Dataset ready: {len(dataset)} videos")

if __name__ == "__main__":
    create_training_dataset(
        videos_dir="historical_dataset/videos",
        captions_dir="historical_dataset/captions",
        output_dir="training_data"
    )
```

Run it:
```bash
python prepare_dataset.py
```

---

## 🏋️ Step 4: Fine-Tune with LoRA

### Training Script:

```python
# train_historical_model.py
import torch
from diffusers import AnimateDiffPipeline, DDIMScheduler
from diffusers.training_utils import EMAModel
from accelerate import Accelerator
from peft import LoraConfig, get_peft_model
import json
from pathlib import Path
from torch.utils.data import Dataset, DataLoader
from PIL import Image

class HistoricalVideoDataset(Dataset):
    def __init__(self, metadata_path):
        with open(metadata_path) as f:
            self.data = json.load(f)
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        frames_path = Path(item['frames_path'])
        
        # Load frames
        frames = []
        for i in range(16):
            img_path = frames_path / f"frame_{i:04d}.png"
            img = Image.open(img_path).convert('RGB')
            frames.append(img)
        
        return {
            'frames': frames,
            'caption': item['caption']
        }

def train_model():
    # Setup
    accelerator = Accelerator(mixed_precision='fp16')
    
    # Load base model
    pipe = AnimateDiffPipeline.from_pretrained(
        "guoyww/animatediff-motion-adapter-v1-5-2",
        torch_dtype=torch.float16
    )
    
    # Configure LoRA
    lora_config = LoraConfig(
        r=64,  # LoRA rank
        lora_alpha=64,
        target_modules=["to_q", "to_k", "to_v", "to_out.0"],
        lora_dropout=0.1,
    )
    
    # Apply LoRA
    unet = pipe.unet
    unet = get_peft_model(unet, lora_config)
    unet.print_trainable_parameters()
    
    # Setup dataset
    dataset = HistoricalVideoDataset("training_data/metadata.json")
    train_loader = DataLoader(dataset, batch_size=1, shuffle=True)
    
    # Optimizer
    optimizer = torch.optim.AdamW(
        unet.parameters(),
        lr=1e-4,
        weight_decay=0.01
    )
    
    # Training loop
    num_epochs = 50
    
    for epoch in range(num_epochs):
        for batch in train_loader:
            # Training step here
            # (Simplified - full implementation needs loss calculation)
            pass
        
        print(f"Epoch {epoch+1}/{num_epochs} complete")
        
        # Save checkpoint every 5 epochs
        if (epoch + 1) % 5 == 0:
            unet.save_pretrained(f"checkpoints/epoch_{epoch+1}")
    
    # Save final model
    pipe.save_pretrained("historical_video_model")
    print("✅ Training complete!")

if __name__ == "__main__":
    train_model()
```

### Full Training Command (Using Existing Script):

```bash
# Using AnimateDiff official training script
accelerate launch train_animatediff.py \
  --pretrained_model_name_or_path="runwayml/stable-diffusion-v1-5" \
  --motion_adapter="guoyww/animatediff-motion-adapter-v1-5-2" \
  --train_data_dir="training_data" \
  --output_dir="historical_video_model" \
  --resolution=512 \
  --num_frames=16 \
  --train_batch_size=1 \
  --gradient_accumulation_steps=4 \
  --max_train_steps=5000 \
  --learning_rate=1e-4 \
  --lr_scheduler="cosine" \
  --lr_warmup_steps=500 \
  --mixed_precision="fp16" \
  --use_8bit_adam \
  --checkpointing_steps=500 \
  --validation_prompt="Wide shot of Mughal architecture, historical documentary style" \
  --validation_steps=500 \
  --report_to="wandb"
```

### Training Time Estimates:
- **RTX 3090**: ~10-15 hours (50-100 videos)
- **RTX 4090**: ~6-8 hours
- **A100**: ~3-5 hours
- **Multiple GPUs**: Divide by GPU count

---

## 💰 Cost Breakdown

### Cloud GPU Training (Vast.ai):

```
RTX 4090 @ $0.50/hour × 8 hours = $4
+ Data storage = $5
+ Experiments/debugging = $20
Total: ~$30-50 for initial model

Fine-tuning iterations:
$50-200 total over 2 weeks
```

### Professional Option (RunPod):
```
A100 (40GB) @ $1.20/hour × 5 hours = $6
+ Multiple experiments = $50-100
Total: ~$100-200
```

### DIY with Personal GPU:
```
Electricity cost only
RTX 4090 (450W) × 8 hours × $0.12/kWh = $0.43
Basically free!
```

---

## 🧪 Step 5: Test Your Model

```python
# test_model.py
from diffusers import AnimateDiffPipeline
import torch

# Load your trained model
pipe = AnimateDiffPipeline.from_pretrained(
    "historical_video_model",
    torch_dtype=torch.float16
).to("cuda")

# Generate video
prompt = "Wide shot of Taj Mahal at sunrise, historical documentary style, cinematic camera movement"

video = pipe(
    prompt=prompt,
    num_frames=16,
    guidance_scale=7.5,
    num_inference_steps=25
).frames

# Save video
from diffusers.utils import export_to_video
export_to_video(video, "test_output.mp4")

print("✅ Video generated: test_output.mp4")
```

---

## 📈 Step 6: Improve Your Model

### Collect More Data:
- Start with 50 videos
- Evaluate results
- Add 50-100 more targeted videos
- Retrain

### Tips for Better Results:
1. **Consistent Style**: All videos same documentary style
2. **Good Captions**: Detailed, accurate descriptions
3. **Quality Over Quantity**: 100 good videos > 500 bad ones
4. **Negative Examples**: Include what NOT to generate
5. **Iterative Training**: Train → Test → Collect more → Retrain

---

## 🚀 Step 7: Deploy Your Model

### Option A: Hugging Face (Recommended)

```bash
# Install Hugging Face Hub
pip install huggingface_hub

# Login
huggingface-cli login

# Upload model
python -c "
from diffusers import AnimateDiffPipeline
pipe = AnimateDiffPipeline.from_pretrained('historical_video_model')
pipe.push_to_hub('your-username/historical-documentary-video')
"
```

### Option B: Replicate (Easiest API)

```bash
# Install Cog
sudo curl -o /usr/local/bin/cog -L https://github.com/replicate/cog/releases/latest/download/cog_`uname -s`_`uname -m`
sudo chmod +x /usr/local/bin/cog

# Create cog.yaml
cat > cog.yaml << EOF
build:
  gpu: true
  python_version: "3.10"
  python_packages:
    - torch==2.0.1
    - diffusers==0.21.0
predict: "predict.py:Predictor"
EOF

# Create predict.py
cat > predict.py << 'EOF'
from cog import BasePredictor, Input, Path
from diffusers import AnimateDiffPipeline
import torch

class Predictor(BasePredictor):
    def setup(self):
        self.pipe = AnimateDiffPipeline.from_pretrained(
            "historical_video_model",
            torch_dtype=torch.float16
        ).to("cuda")
    
    def predict(
        self,
        prompt: str = Input(description="Historical scene description"),
        num_frames: int = Input(default=16, ge=8, le=24),
    ) -> Path:
        video = self.pipe(
            prompt=prompt,
            num_frames=num_frames,
            guidance_scale=7.5
        ).frames
        
        output_path = "/tmp/output.mp4"
        export_to_video(video, output_path)
        return Path(output_path)
EOF

# Build and push
cog push r8.im/your-username/historical-video
```

### Option C: Your Own API (Flask)

```python
# api.py
from flask import Flask, request, send_file
from diffusers import AnimateDiffPipeline
import torch

app = Flask(__name__)

# Load model once
pipe = AnimateDiffPipeline.from_pretrained(
    "historical_video_model",
    torch_dtype=torch.float16
).to("cuda")

@app.route('/generate', methods=['POST'])
def generate_video():
    data = request.json
    prompt = data.get('prompt')
    
    video = pipe(
        prompt=prompt,
        num_frames=16,
        guidance_scale=7.5
    ).frames
    
    output_path = f"/tmp/{hash(prompt)}.mp4"
    export_to_video(video, output_path)
    
    return send_file(output_path, mimetype='video/mp4')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

---

## 📱 Step 8: Integrate with Your App

Update your `script.js`:

```javascript
// Add custom model option
const CONFIG = {
    // ... existing config
    CUSTOM_MODEL_URL: 'https://your-api.com/generate', // or Replicate/HF
};

// Add function to call your model
async function generateVideoCustomModel(prompt, sceneId) {
    try {
        const response = await fetch(CONFIG.CUSTOM_MODEL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKeys.custom}`
            },
            body: JSON.stringify({
                prompt: prompt + ", historical documentary style, cinematic",
                num_frames: 16
            })
        });
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        throw new Error('Custom model failed: ' + error.message);
    }
}
```

---

## 🎯 Alternative: Use Existing Models + Prompt Engineering

### Cheaper Option (No Training):

Instead of training, use existing models with **strong prompts**:

```python
# Specialized prompts for historical style
BASE_PROMPT = "{scene_description}, historical documentary style, archival footage aesthetic, grainy 16mm film look, sepia tone, vintage cinematography, PBS documentary, National Geographic style, authentic period details"

# Example
prompt = f"{user_input}, {BASE_PROMPT}"
```

### StyleDrop Approach:
Use a few reference images to guide style:
```python
from diffusers import StableDiffusionControlNetPipeline

# Load with historical reference images
pipe = StableDiffusionControlNetPipeline.from_pretrained(...)
pipe.set_reference_images(historical_images)
```

---

## 📚 Resources & Further Reading

### Papers:
- AnimateDiff: https://arxiv.org/abs/2307.04725
- Text2Video-Zero: https://arxiv.org/abs/2303.13439
- ModelScope: https://arxiv.org/abs/2308.06571

### Repositories:
- AnimateDiff: https://github.com/guoyww/AnimateDiff
- Text2Video-Zero: https://github.com/Picsart-AI-Research/Text2Video-Zero
- CogVideo: https://github.com/THUDM/CogVideo

### Communities:
- r/StableDiffusion: Reddit community
- Hugging Face Discord: Active AI community
- Papers with Code: Latest research

### Courses:
- Fast.ai: Practical Deep Learning
- Hugging Face: Diffusion Models Course
- DeepLearning.AI: Generative AI courses

---

## ✅ Quick Start Checklist

- [ ] Collect 50-100 historical video clips
- [ ] Write detailed captions for each
- [ ] Set up training environment (cloud or local)
- [ ] Process videos into training format
- [ ] Fine-tune AnimateDiff with LoRA
- [ ] Test with historical prompts
- [ ] Iterate and improve
- [ ] Deploy to Hugging Face/Replicate
- [ ] Integrate with your app

---

## 💡 Pro Tips

1. **Start Small**: Train on 20-30 videos first, test, then scale
2. **Use LoRA**: 100x faster and cheaper than full fine-tuning
3. **Cloud GPUs**: Vast.ai is cheapest for experimentation
4. **Prompt Engineering**: Better prompts = better results
5. **Monitor Training**: Use Weights & Biases (wandb)
6. **Version Control**: Save checkpoints every 500 steps
7. **Community**: Ask in Hugging Face Discord when stuck

---

## 🎬 Expected Results

After training on 100 historical videos:
- ✅ Consistent historical documentary style
- ✅ Accurate period details
- ✅ Proper cinematography
- ✅ 3-5 second smooth videos
- ✅ 512x512 or 768x768 resolution
- ✅ ~20-30 seconds generation time

---

**Total Investment:**
- Time: 2-4 weeks
- Money: $50-500
- Effort: Medium-High
- Result: Custom historical video AI! 🎉

Good luck training your model!
