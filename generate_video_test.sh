#!/bin/bash

# Automated Video Generation Test Script
# This simulates the complete workflow of the AI Video Generator

echo "🎬 Starting Automated Video Generation..."
echo "=========================================="
echo ""

# API keys must be supplied through the environment; never commit credentials.
GROQ_KEY="${GROQ_API_KEY:?Set GROQ_API_KEY in your environment}"
HF_TOKEN="${HUGGINGFACE_TOKEN:?Set HUGGINGFACE_TOKEN in your environment}"

# Create output directory
mkdir -p output/test_generation
cd output/test_generation

echo "📝 Step 1: Generating Urdu Story..."
echo "-----------------------------------"

# Generate Story
STORY_RESPONSE=$(curl -s -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-oss-120b",
    "messages": [
      {
        "role": "system",
        "content": "You are an expert Urdu storyteller. Generate detailed stories in Urdu with proper scene descriptions for video generation."
      },
      {
        "role": "user",
        "content": "Create a detailed historical story in Urdu based on: \"میر تقی میر کی زندگی\"\n\nRequirements:\n- Write complete story in Urdu\n- Create exactly 3 distinct scenes\n- Each scene 2-3 sentences\n- Include visual details for video generation\n- Use rich descriptive Urdu language\n- Format: Scene 1: [description], Scene 2: [description], Scene 3: [description]"
      }
    ],
    "temperature": 0.8,
    "max_tokens": 2000
  }')

# Extract story content
STORY=$(echo "$STORY_RESPONSE" | jq -r '.choices[0].message.content')

if [ "$STORY" == "null" ] || [ -z "$STORY" ]; then
  echo "❌ Error generating story"
  echo "Response: $STORY_RESPONSE"
  exit 1
fi

echo "✅ Story generated successfully!"
echo ""
echo "Story Preview:"
echo "$STORY" | head -5
echo "..."
echo ""

# Save story
echo "$STORY" > story.txt

echo "🎥 Step 2: Generating Videos (3 scenes)..."
echo "-------------------------------------------"

# Video prompts (English for better API compatibility)
PROMPTS=(
  "Historical scene of old Delhi in 1723, dusty street corner, morning sunlight, papers and ink on wooden table, traditional Mughal architecture, soft lighting, cinematic documentary style"
  "Elegant Nawab's court gathering, colorful chandelier lights, traditional poetry session, majestic hall with calligraphy on walls, warm candlelight, historical documentary atmosphere"
  "Quiet simple room with old books scattered, faded garden visible through window, rain drops on glass, melancholic atmosphere, final years, documentary style"
)

# Try multiple providers with failover
PROVIDERS=(
  "Lightricks/LTX-Video"
  "Wan-AI/Wan2.2-TI2V-5B"
  "THUDM/CogVideoX-5b"
)

generate_video() {
  local scene_num=$1
  local prompt=$2
  local output_file="scene_${scene_num}.mp4"
  
  echo ""
  echo "Scene $scene_num: Attempting generation..."
  
  for provider in "${PROVIDERS[@]}"; do
    provider_name=$(basename "$provider")
    echo "  → Trying $provider_name..."
    
    # Make API request
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$output_file" \
      -X POST "https://api-inference.huggingface.co/models/$provider" \
      -H "Authorization: Bearer $HF_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"inputs\": \"$prompt\"}" \
      --max-time 180)
    
    # Check if successful
    if [ -f "$output_file" ] && [ -s "$output_file" ]; then
      FILE_SIZE=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null)
      
      if [ "$FILE_SIZE" -gt 10000 ]; then
        echo "  ✅ Success with $provider_name! (Size: $(($FILE_SIZE / 1024))KB)"
        echo "     Saved: $output_file"
        return 0
      fi
    fi
    
    # Check if model is loading
    if [ -f "$output_file" ]; then
      RESPONSE=$(cat "$output_file")
      if echo "$RESPONSE" | grep -q "loading"; then
        echo "  ⏳ Model loading, estimated wait time..."
        ESTIMATED_TIME=$(echo "$RESPONSE" | jq -r '.estimated_time' 2>/dev/null)
        if [ "$ESTIMATED_TIME" != "null" ] && [ -n "$ESTIMATED_TIME" ]; then
          echo "     Waiting ${ESTIMATED_TIME}s for model to load..."
          sleep "$ESTIMATED_TIME"
          
          # Retry after waiting
          HTTP_CODE=$(curl -s -w "%{http_code}" -o "$output_file" \
            -X POST "https://api-inference.huggingface.co/models/$provider" \
            -H "Authorization: Bearer $HF_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"inputs\": \"$prompt\"}" \
            --max-time 180)
          
          if [ -f "$output_file" ] && [ -s "$output_file" ]; then
            FILE_SIZE=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null)
            if [ "$FILE_SIZE" -gt 10000 ]; then
              echo "  ✅ Success after waiting! (Size: $(($FILE_SIZE / 1024))KB)"
              return 0
            fi
          fi
        fi
      fi
    fi
    
    echo "  ❌ Failed with $provider_name (HTTP: $HTTP_CODE)"
    rm -f "$output_file"
  done
  
  echo "  ❌ All providers failed for scene $scene_num"
  return 1
}

# Generate each scene
SUCCESSFUL=0
FAILED=0

for i in {1..3}; do
  if generate_video "$i" "${PROMPTS[$((i-1))]}"; then
    SUCCESSFUL=$((SUCCESSFUL + 1))
  else
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=========================================="
echo "📊 Generation Summary"
echo "=========================================="
echo "✅ Successful: $SUCCESSFUL scenes"
echo "❌ Failed: $FAILED scenes"
echo "📁 Output directory: $(pwd)"
echo ""

if [ "$SUCCESSFUL" -gt 0 ]; then
  echo "Generated files:"
  ls -lh scene_*.mp4 2>/dev/null
  echo ""
  echo "✨ Video generation complete!"
  echo ""
  echo "Next steps:"
  echo "1. Check generated videos in: $(pwd)"
  echo "2. Upload to Kapwing: https://kapwing.com/studio/editor"
  echo "3. Add transitions and export"
  echo ""
else
  echo "❌ No videos were generated successfully."
  echo ""
  echo "Troubleshooting:"
  echo "1. Models may be under maintenance"
  echo "2. Try again in 10-15 minutes"
  echo "3. Or use the web app: https://ai-video-generator-urdu.vercel.app"
  echo ""
fi

echo "🎬 Script complete!"
