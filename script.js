// Configuration - Multiple Video Providers with Auto-Failover
const CONFIG = {
    GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
    GROQ_MODEL: 'openai/gpt-oss-120b',
    
    // Video Generation Providers (in priority order)
    VIDEO_PROVIDERS: {
        // PRIMARY: Hugging Face - Multiple Models
        'huggingface-cogvideo': {
            name: 'CogVideoX-5B',
            url: 'https://api-inference.huggingface.co/models/THUDM/CogVideoX-5b',
            priority: 1,
            free: true,
            quality: 'high',
            speed: 'medium'
        },
        'huggingface-wan': {
            name: 'Wan2.2-5B',
            url: 'https://api-inference.huggingface.co/models/Wan-AI/Wan2.2-TI2V-5B',
            priority: 2,
            free: true,
            quality: 'medium',
            speed: 'fast'
        },
        'huggingface-hunyuan': {
            name: 'HunyuanVideo',
            url: 'https://api-inference.huggingface.co/models/tencent/HunyuanVideo',
            priority: 3,
            free: true,
            quality: 'high',
            speed: 'slow'
        },
        'huggingface-ltx': {
            name: 'LTX-Video',
            url: 'https://api-inference.huggingface.co/models/Lightricks/LTX-Video',
            priority: 4,
            free: true,
            quality: 'medium',
            speed: 'fast'
        },
        
        // SECONDARY: FAL.ai (paid but reliable)
        'fal-ltx': {
            name: 'FAL LTX-Video',
            url: 'https://queue.fal.run/fal-ai/ltx-video',
            statusUrl: 'https://queue.fal.run/fal-ai/ltx-video/requests/',
            priority: 5,
            free: false,
            quality: 'high',
            speed: 'fast'
        },
        
        // TERTIARY: Replicate (paid backup)
        'replicate-happyhorse': {
            name: 'HappyHorse-1.0',
            url: 'https://api.replicate.com/v1/predictions',
            model: 'alibaba-damoc/happy-horse-1.0:5e39b53fc251e58fb6cf9ad4a7cd58017a1d75db',
            priority: 6,
            free: false,
            quality: 'high',
            speed: 'medium'
        }
    },
    
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    VIDEO_POLL_INTERVAL: 3000,
    VIDEO_MAX_WAIT: 300000, // 5 minutes
    FAL_API_URL: 'https://queue.fal.run/fal-ai/ltx-video',
    FAL_STATUS_URL: 'https://queue.fal.run/fal-ai/ltx-video/requests/',
    REPLICATE_API_URL: 'https://api.replicate.com/v1/predictions'
};

// State
let state = {
    apiKeys: {
        groq: '', // Will be loaded from server
        huggingface: '', // Will be loaded from server
        fal: '',
        replicate: ''
    },
    videoProvider: 'auto', // AUTO mode for smart failover
    currentStory: null,
    scenes: [],
    videos: [],
    videoGenerationInProgress: false,
    providerStats: {}, // Track success/failure rates
    currentProviderIndex: 0
};

// DOM Elements
const elements = {
    generateBtn: document.getElementById('generateBtn'),
    userInput: document.getElementById('userInput'),
    storyType: document.getElementById('storyType'),
    sceneCount: document.getElementById('sceneCount'),
    groqKey: document.getElementById('groqKey'),
    huggingfaceKey: document.getElementById('huggingfaceKey'),
    falKey: document.getElementById('falKey'),
    replicateKey: document.getElementById('replicateKey'),
    videoProvider: document.getElementById('videoProvider'),
    progressSection: document.getElementById('progressSection'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    storySection: document.getElementById('storySection'),
    storyOutput: document.getElementById('storyOutput'),
    editStoryBtn: document.getElementById('editStoryBtn'),
    continueToVideoBtn: document.getElementById('continueToVideoBtn'),
    scenesSection: document.getElementById('scenesSection'),
    scenesContainer: document.getElementById('scenesContainer'),
    generateVideosBtn: document.getElementById('generateVideosBtn'),
    videoSection: document.getElementById('videoSection'),
    videoStats: document.getElementById('videoStats'),
    videoContainer: document.getElementById('videoContainer'),
    downloadAllBtn: document.getElementById('downloadAllBtn')
};

// Load API keys from server (for Vercel deployment)
async function loadServerApiKeys() {
    try {
        const response = await fetch('/api/get-api-keys');
        if (response.ok) {
            const keys = await response.json();
            
            // Set keys from server if not already in localStorage
            if (keys.groq && !localStorage.getItem('groq_api_key')) {
                state.apiKeys.groq = keys.groq;
                elements.groqKey.value = keys.groq;
            }
            if (keys.huggingface && !localStorage.getItem('huggingface_token')) {
                state.apiKeys.huggingface = keys.huggingface;
                elements.huggingfaceKey.value = keys.huggingface;
            }
            
            console.log('✅ API keys loaded from server');
        } else {
            console.log('⚠️ Server API keys not available, using local storage');
        }
    } catch (error) {
        console.log('⚠️ Running locally, server API keys not available:', error.message);
    }
}

// Load saved API keys
function loadApiKeys() {
    const savedGroq = localStorage.getItem('groq_api_key');
    const savedHF = localStorage.getItem('huggingface_token');
    const savedFal = localStorage.getItem('fal_api_key');
    const savedReplicate = localStorage.getItem('replicate_api_key');
    const savedProvider = localStorage.getItem('video_provider');
    
    // Load from localStorage first (user's own keys take priority)
    if (savedGroq) {
        elements.groqKey.value = savedGroq;
        state.apiKeys.groq = savedGroq;
    }
    
    if (savedHF) {
        elements.huggingfaceKey.value = savedHF;
        state.apiKeys.huggingface = savedHF;
    }
    
    if (savedFal) {
        elements.falKey.value = savedFal;
        state.apiKeys.fal = savedFal;
    }
    if (savedReplicate) {
        elements.replicateKey.value = savedReplicate;
        state.apiKeys.replicate = savedReplicate;
    }
    if (savedProvider) {
        elements.videoProvider.value = savedProvider;
        state.videoProvider = savedProvider;
    }
    
    // Then try to load from server (for deployment)
    loadServerApiKeys();
}

// Save API keys
function saveApiKeys() {
    state.apiKeys.groq = elements.groqKey.value.trim();
    state.apiKeys.huggingface = elements.huggingfaceKey.value.trim();
    state.apiKeys.fal = elements.falKey.value.trim();
    state.apiKeys.replicate = elements.replicateKey.value.trim();
    state.videoProvider = elements.videoProvider.value;
    
    if (state.apiKeys.groq) {
        localStorage.setItem('groq_api_key', state.apiKeys.groq);
    }
    if (state.apiKeys.huggingface) {
        localStorage.setItem('huggingface_token', state.apiKeys.huggingface);
    }
    if (state.apiKeys.fal) {
        localStorage.setItem('fal_api_key', state.apiKeys.fal);
    }
    if (state.apiKeys.replicate) {
        localStorage.setItem('replicate_api_key', state.apiKeys.replicate);
    }
    localStorage.setItem('video_provider', state.videoProvider);
}

// Update progress
function updateProgress(percentage, message) {
    elements.progressFill.style.width = percentage + '%';
    elements.progressText.textContent = message;
}

// Show/Hide sections
function showSection(section) {
    section.classList.remove('hidden');
}

function hideSection(section) {
    section.classList.add('hidden');
}

// Call Groq API
async function callGroqAPI(prompt, retries = CONFIG.MAX_RETRIES) {
    if (!state.apiKeys.groq) {
        throw new Error('Groq API key is required. Get free key from https://console.groq.com');
    }

    try {
        const response = await fetch(CONFIG.GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKeys.groq}`
            },
            body: JSON.stringify({
                model: CONFIG.GROQ_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert Urdu storyteller specializing in historical and cultural narratives. Generate detailed, engaging stories in Urdu with proper scene descriptions for video generation.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            return callGroqAPI(prompt, retries - 1);
        }
        throw error;
    }
}

// Generate story
async function generateStory() {
    const userText = elements.userInput.value.trim();
    const storyType = elements.storyType.value;
    const sceneCount = parseInt(elements.sceneCount.value);

    if (!userText) {
        alert('براہ کرم اپنی کہانی کا خیال لکھیں');
        return;
    }

    saveApiKeys();

    try {
        elements.generateBtn.disabled = true;
        showSection(elements.progressSection);
        hideSection(elements.storySection);
        hideSection(elements.scenesSection);
        hideSection(elements.videoSection);

        updateProgress(10, 'Generating story structure...');

        // Generate complete story
        const storyPrompt = `
Create a detailed ${storyType} story in Urdu based on: "${userText}"

Requirements:
- Write complete story in Urdu (اردو)
- Create exactly ${sceneCount} distinct scenes
- Each scene should be 2-3 sentences
- Include visual details suitable for video generation
- Use rich, descriptive Urdu language
- Format: Scene 1: [description], Scene 2: [description], etc.

Generate the complete story now:`;

        updateProgress(30, 'Generating Urdu story...');
        const story = await callGroqAPI(storyPrompt);
        state.currentStory = story;

        updateProgress(60, 'Processing scenes...');
        
        // Parse scenes from story
        const sceneMatches = story.match(/Scene \d+:.*?(?=Scene \d+:|$)/gs);
        if (!sceneMatches || sceneMatches.length === 0) {
            // Fallback: split by paragraphs
            const paragraphs = story.split('\n\n').filter(p => p.trim());
            state.scenes = paragraphs.slice(0, sceneCount).map((scene, index) => ({
                id: index + 1,
                urduText: scene.trim(),
                videoPrompt: null
            }));
        } else {
            state.scenes = sceneMatches.slice(0, sceneCount).map((scene, index) => ({
                id: index + 1,
                urduText: scene.trim(),
                videoPrompt: null
            }));
        }

        updateProgress(100, 'Story generated successfully!');
        
        // Display story
        elements.storyOutput.textContent = story;
        showSection(elements.storySection);
        
        setTimeout(() => {
            hideSection(elements.progressSection);
            elements.generateBtn.disabled = false;
        }, 1000);

    } catch (error) {
        console.error('Error generating story:', error);
        alert('Error: ' + error.message);
        hideSection(elements.progressSection);
        elements.generateBtn.disabled = false;
    }
}

// Generate video prompts for scenes
async function generateVideoPrompts() {
    try {
        showSection(elements.progressSection);
        hideSection(elements.storySection);
        updateProgress(0, 'Generating video prompts...');

        for (let i = 0; i < state.scenes.length; i++) {
            updateProgress((i / state.scenes.length) * 100, `Processing scene ${i + 1}/${state.scenes.length}...`);

            const promptGeneration = `
Convert this Urdu story scene into a detailed English video generation prompt for Google Flow:

Scene: "${state.scenes[i].urduText}"

Create a detailed video prompt with:
- Exact visual description (setting, characters, actions)
- Camera angles and movements
- Lighting and atmosphere
- Historical accuracy details
- Time period and location
- 5-second video duration focus

Return ONLY the English video prompt, no extra text:`;

            const videoPrompt = await callGroqAPI(promptGeneration);
            state.scenes[i].videoPrompt = videoPrompt.trim();
        }

        updateProgress(100, 'Video prompts ready!');
        displayScenes();
        
        setTimeout(() => {
            hideSection(elements.progressSection);
        }, 1000);

    } catch (error) {
        console.error('Error generating video prompts:', error);
        alert('Error: ' + error.message);
        hideSection(elements.progressSection);
    }
}

// Display scenes with prompts
function displayScenes() {
    elements.scenesContainer.innerHTML = '';
    
    state.scenes.forEach(scene => {
        const sceneDiv = document.createElement('div');
        sceneDiv.className = 'scene-item';
        sceneDiv.innerHTML = `
            <h3>Scene ${scene.id}</h3>
            <div class="scene-prompt">
                <strong>اردو:</strong><br>
                <p style="direction: rtl; text-align: right;">${scene.urduText}</p>
            </div>
            <div class="scene-prompt">
                <strong>Video Prompt (English):</strong><br>
                <p>${scene.videoPrompt || 'Generating...'}</p>
            </div>
            <div class="scene-status status-pending" id="status-${scene.id}">
                Ready for video generation
            </div>
        `;
        elements.scenesContainer.appendChild(sceneDiv);
    });

    showSection(elements.scenesSection);
    displayVideoInstructions();
}

// Display video generation instructions
function displayVideoInstructions() {
    const instructionsDiv = document.createElement('div');
    instructionsDiv.className = 'card';
    instructionsDiv.innerHTML = `
        <h2>📹 Ready to Generate Videos</h2>
        <div style="background: #d4edda; padding: 15px; border-radius: 10px; margin: 15px 0;">
            <h3 style="color: #155724; margin-bottom: 10px;">✨ Automatic Video Generation</h3>
            <p style="color: #155724; line-height: 1.6;">
                Click "Generate All Videos Now" button below to automatically create videos for all scenes.
            </p>
            <ul style="color: #155724; margin: 10px 0 10px 20px; line-height: 1.8;">
                <li><strong>FAL.ai</strong>: Fast generation (~30 seconds per video). Uses $5 free credits on signup.</li>
                <li><strong>Replicate</strong>: Try free models first, then pay-per-use.</li>
                <li><strong>Manual</strong>: Copy prompts and use Google Flow manually.</li>
            </ul>
        </div>
        
        <button onclick="copyAllPrompts()" class="btn-secondary" style="margin-top: 10px;">
            � Copy All Prompts to Clipboard
        </button>
    `;
    
    elements.scenesSection.appendChild(instructionsDiv);
}

// Copy all prompts to clipboard
function copyAllPrompts() {
    let allPrompts = '=== VIDEO GENERATION PROMPTS ===\n\n';
    state.scenes.forEach(scene => {
        allPrompts += `Scene ${scene.id}:\n${scene.videoPrompt}\n\n---\n\n`;
    });
    
    navigator.clipboard.writeText(allPrompts).then(() => {
        alert('✅ All prompts copied to clipboard! Paste them into Google Flow one by one.');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy. Please copy manually.');
    });
}

// ========================================
// SMART VIDEO GENERATION WITH AUTO-FAILOVER
// ========================================

// Get available providers based on API keys
function getAvailableProviders() {
    const providers = [];
    
    // Add Hugging Face providers if key available
    if (state.apiKeys.huggingface) {
        providers.push('huggingface-cogvideo');
        providers.push('huggingface-wan');
        providers.push('huggingface-hunyuan');
        providers.push('huggingface-ltx');
    }
    
    // Add FAL.ai if key available
    if (state.apiKeys.fal) {
        providers.push('fal-ltx');
    }
    
    // Add Replicate if key available
    if (state.apiKeys.replicate) {
        providers.push('replicate-happyhorse');
    }
    
    // Sort by priority
    providers.sort((a, b) => {
        return CONFIG.VIDEO_PROVIDERS[a].priority - CONFIG.VIDEO_PROVIDERS[b].priority;
    });
    
    return providers;
}

// Smart video generation with automatic failover
async function generateVideoSmart(prompt, sceneId) {
    const providers = getAvailableProviders();
    
    if (providers.length === 0) {
        throw new Error('No API keys configured. Please add Hugging Face token (free) or other provider keys.');
    }
    
    let lastError = null;
    
    // Try each provider in order
    for (let i = 0; i < providers.length; i++) {
        const providerId = providers[i];
        const provider = CONFIG.VIDEO_PROVIDERS[providerId];
        
        try {
            console.log(`🎬 Trying ${provider.name} (${i + 1}/${providers.length})...`);
            updateSceneStatus(sceneId, 'generating', `Trying ${provider.name}...`);
            
            const videoUrl = await generateVideoWithProvider(providerId, prompt, sceneId);
            
            // Success! Track it
            trackProviderSuccess(providerId);
            console.log(`✅ Success with ${provider.name}!`);
            
            return {
                url: videoUrl,
                provider: provider.name,
                providerId: providerId
            };
            
        } catch (error) {
            console.warn(`❌ ${provider.name} failed:`, error.message);
            lastError = error;
            trackProviderFailure(providerId);
            
            // If not the last provider, try next
            if (i < providers.length - 1) {
                console.log(`⏭️  Trying next provider...`);
                updateSceneStatus(sceneId, 'generating', `${provider.name} failed, trying next...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
        }
    }
    
    // All providers failed
    throw new Error(`All providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// Generate video with specific provider
async function generateVideoWithProvider(providerId, prompt, sceneId) {
    const provider = CONFIG.VIDEO_PROVIDERS[providerId];
    
    // Route to appropriate generator
    if (providerId.startsWith('huggingface-')) {
        return await generateVideoHuggingFace(provider.url, prompt, sceneId, provider.name);
    } else if (providerId.startsWith('fal-')) {
        return await generateVideoFal(prompt, sceneId);
    } else if (providerId.startsWith('replicate-')) {
        return await generateVideoReplicate(prompt, sceneId);
    } else {
        throw new Error(`Unknown provider: ${providerId}`);
    }
}

// Track provider performance
function trackProviderSuccess(providerId) {
    if (!state.providerStats[providerId]) {
        state.providerStats[providerId] = { success: 0, failure: 0 };
    }
    state.providerStats[providerId].success++;
    localStorage.setItem('providerStats', JSON.stringify(state.providerStats));
}

function trackProviderFailure(providerId) {
    if (!state.providerStats[providerId]) {
        state.providerStats[providerId] = { success: 0, failure: 0 };
    }
    state.providerStats[providerId].failure++;
    localStorage.setItem('providerStats', JSON.stringify(state.providerStats));
}

// Load provider stats
function loadProviderStats() {
    const saved = localStorage.getItem('providerStats');
    if (saved) {
        state.providerStats = JSON.parse(saved);
    }
}

// ========================================
// PROVIDER-SPECIFIC GENERATORS
// ========================================

// Generate video using Hugging Face Inference API (FREE!) - Enhanced
async function generateVideoHuggingFace(apiUrl, prompt, sceneId, modelName) {
    if (!state.apiKeys.huggingface) {
        throw new Error('Hugging Face token required');
    }

    try {
        updateSceneStatus(sceneId, 'generating', `Generating with ${modelName}...`);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.apiKeys.huggingface}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    num_frames: 16
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            
            if (response.status === 503) {
                throw new Error('Model loading (retry in 30 sec)');
            }
            
            if (response.status === 429) {
                throw new Error('Rate limit exceeded');
            }
            
            throw new Error(error || 'Request failed');
        }

        // Response is video blob
        const blob = await response.blob();
        
        // Check if blob is valid
        if (blob.size < 1000) {
            throw new Error('Generated video too small (likely error)');
        }
        
        const videoUrl = URL.createObjectURL(blob);
        
        updateSceneStatus(sceneId, 'complete', `✅ Generated with ${modelName}!`);
        return videoUrl;
        
    } catch (error) {
        console.error(`${modelName} error:`, error);
        throw error;
    }
}

// Generate video using FAL.ai
async function generateVideoFal(prompt, sceneId) {
    if (!state.apiKeys.fal) {
        throw new Error('FAL.ai API key required. Get $5 free credits: https://fal.ai/dashboard');
    }

    try {
        // Submit video generation request
        const response = await fetch(CONFIG.FAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${state.apiKeys.fal}`
            },
            body: JSON.stringify({
                prompt: prompt,
                num_frames: 121,  // ~5 seconds at 24fps
                num_inference_steps: 30,
                guidance_scale: 3.0,
                width: 768,
                height: 512
            })
        });

        if (!response.ok) {
            const error = await response.json();
            
            // Check for balance issues
            if (error.detail && error.detail.includes('Exhausted balance')) {
                throw new Error('FAL.ai credits exhausted. Top up at https://fal.ai/dashboard/billing OR switch to Replicate/Manual mode');
            }
            
            throw new Error(error.detail || 'FAL.ai request failed');
        }

        const data = await response.json();
        const requestId = data.request_id;

        // Poll for result
        return await pollFalVideo(requestId, sceneId);
    } catch (error) {
        console.error('FAL.ai error:', error);
        throw error;
    }
}

// Poll FAL.ai for video result
async function pollFalVideo(requestId, sceneId, startTime = Date.now()) {
    const statusUrl = CONFIG.FAL_STATUS_URL + requestId;

    try {
        const response = await fetch(statusUrl, {
            headers: {
                'Authorization': `Key ${state.apiKeys.fal}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to check video status');
        }

        const data = await response.json();

        if (data.status === 'completed') {
            return data.video?.url || data.output?.video?.url;
        } else if (data.status === 'failed') {
            throw new Error(data.error || 'Video generation failed');
        } else if (Date.now() - startTime > CONFIG.VIDEO_MAX_WAIT) {
            throw new Error('Video generation timeout');
        } else {
            // Still processing, wait and retry
            updateSceneStatus(sceneId, 'generating', `Generating... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.VIDEO_POLL_INTERVAL));
            return await pollFalVideo(requestId, sceneId, startTime);
        }
    } catch (error) {
        console.error('Polling error:', error);
        throw error;
    }
}

// Generate video using Replicate
async function generateVideoReplicate(prompt, sceneId) {
    if (!state.apiKeys.replicate) {
        throw new Error('Replicate API key required. Get free: https://replicate.com/account/api-tokens');
    }

    try {
        // Submit video generation request
        const response = await fetch(CONFIG.REPLICATE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${state.apiKeys.replicate}`
            },
            body: JSON.stringify({
                version: CONFIG.REPLICATE_MODEL.split(':')[1],
                input: {
                    prompt: prompt,
                    num_frames: 81,
                    num_inference_steps: 30
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Replicate request failed');
        }

        const data = await response.json();
        const predictionId = data.id;

        // Poll for result
        return await pollReplicateVideo(predictionId, sceneId);
    } catch (error) {
        console.error('Replicate error:', error);
        throw error;
    }
}

// Poll Replicate for video result
async function pollReplicateVideo(predictionId, sceneId, startTime = Date.now()) {
    try {
        const response = await fetch(`${CONFIG.REPLICATE_API_URL}/${predictionId}`, {
            headers: {
                'Authorization': `Token ${state.apiKeys.replicate}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to check video status');
        }

        const data = await response.json();

        if (data.status === 'succeeded') {
            return data.output;
        } else if (data.status === 'failed') {
            throw new Error(data.error || 'Video generation failed');
        } else if (Date.now() - startTime > CONFIG.VIDEO_MAX_WAIT) {
            throw new Error('Video generation timeout');
        } else {
            updateSceneStatus(sceneId, 'generating', `Generating... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.VIDEO_POLL_INTERVAL));
            return await pollReplicateVideo(predictionId, sceneId, startTime);
        }
    } catch (error) {
        console.error('Polling error:', error);
        throw error;
    }
}

// Update scene status
function updateSceneStatus(sceneId, status, message = '') {
    const statusElement = document.getElementById(`status-${sceneId}`);
    if (statusElement) {
        statusElement.className = `scene-status status-${status}`;
        statusElement.textContent = message || status;
    }
}

// Generate all videos
async function generateAllVideos() {
    saveApiKeys();

    if (state.videoProvider === 'manual') {
        alert('Manual mode selected. Please copy prompts and use Google Flow manually (50 free daily).');
        return;
    }

    // Check if any API keys available
    const hasAnyKey = state.apiKeys.huggingface || state.apiKeys.fal || state.apiKeys.replicate;
    
    if (!hasAnyKey) {
        alert('Please enter at least one API key:\n\n✅ Hugging Face (FREE) - Recommended\n✅ FAL.ai (Paid)\n✅ Replicate (Paid)\n\nGet Hugging Face token: https://huggingface.co/settings/tokens');
        return;
    }

    if (state.videoGenerationInProgress) {
        alert('Video generation already in progress...');
        return;
    }

    state.videoGenerationInProgress = true;
    elements.generateVideosBtn.disabled = true;
    elements.generateVideosBtn.textContent = '⏳ Generating Videos...';

    showSection(elements.progressSection);
    hideSection(elements.videoSection);
    state.videos = [];

    try {
        const isAutoMode = state.videoProvider === 'auto';
        
        for (let i = 0; i < state.scenes.length; i++) {
            const scene = state.scenes[i];
            const progress = ((i / state.scenes.length) * 100);
            
            updateProgress(progress, `Generating video ${i + 1}/${state.scenes.length}...`);
            updateSceneStatus(scene.id, 'generating', 'Starting generation...');

            try {
                let result;
                
                if (isAutoMode) {
                    // AUTO MODE: Smart failover
                    result = await generateVideoSmart(scene.videoPrompt, scene.id);
                    console.log(`✅ Video ${i + 1} generated with ${result.provider}`);
                } else {
                    // MANUAL MODE: Use selected provider
                    result = await generateVideoWithProvider(
                        state.videoProvider,
                        scene.videoPrompt,
                        scene.id
                    );
                    result.provider = CONFIG.VIDEO_PROVIDERS[state.videoProvider].name;
                }

                state.videos.push({
                    sceneId: scene.id,
                    url: result.url,
                    provider: result.provider,
                    urduText: scene.urduText,
                    prompt: scene.videoPrompt
                });

                updateSceneStatus(scene.id, 'complete', `✅ Generated with ${result.provider}!`);
                
            } catch (error) {
                console.error(`Error generating video for scene ${scene.id}:`, error);
                updateSceneStatus(scene.id, 'error', `❌ Error: ${error.message}`);
                
                state.videos.push({
                    sceneId: scene.id,
                    url: null,
                    error: error.message,
                    urduText: scene.urduText,
                    prompt: scene.videoPrompt
                });
            }
        }

        updateProgress(100, 'All videos processed!');
        displayVideos();

        setTimeout(() => {
            hideSection(elements.progressSection);
            showSection(elements.videoSection);
        }, 1000);

    } catch (error) {
        console.error('Error in video generation:', error);
        alert('Error: ' + error.message);
    } finally {
        state.videoGenerationInProgress = false;
        elements.generateVideosBtn.disabled = false;
        elements.generateVideosBtn.textContent = '🎥 Generate All Videos Now';
    }
}

// Display generated videos
function displayVideos() {
    elements.videoContainer.innerHTML = '';
    
    const successCount = state.videos.filter(v => v.url).length;
    const failCount = state.videos.filter(v => !v.url).length;

    // Show provider statistics
    const providerCounts = {};
    state.videos.filter(v => v.url).forEach(v => {
        providerCounts[v.provider] = (providerCounts[v.provider] || 0) + 1;
    });

    let providerStats = '';
    Object.entries(providerCounts).forEach(([provider, count]) => {
        providerStats += `<span style="background: #e8f5e9; padding: 5px 10px; border-radius: 15px; margin: 0 5px;">
            ${provider}: ${count}
        </span>`;
    });

    elements.videoStats.innerHTML = `
        <div style="background: #f0f0f0; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="margin-bottom: 10px;">Generation Summary</h3>
            <p>✅ Successful: ${successCount} | ❌ Failed: ${failCount} | 📊 Total: ${state.videos.length}</p>
            ${providerStats ? `<p style="margin-top: 10px;"><strong>Providers used:</strong><br>${providerStats}</p>` : ''}
        </div>
    `;

    state.videos.forEach(video => {
        const videoDiv = document.createElement('div');
        videoDiv.className = 'video-item';
        
        if (video.url) {
            videoDiv.innerHTML = `
                <h4>Scene ${video.sceneId}</h4>
                <div style="background: #e8f5e9; padding: 5px; border-radius: 5px; margin-bottom: 5px; font-size: 0.85em; color: #2e7d32;">
                    Generated with: ${video.provider || 'Unknown'}
                </div>
                <video controls>
                    <source src="${video.url}" type="video/mp4">
                    Your browser does not support video.
                </video>
                <p style="direction: rtl; text-align: right; margin: 10px 0; font-size: 0.9em;">${video.urduText}</p>
                <button class="download-btn" onclick="downloadVideo('${video.url}', ${video.sceneId})">
                    📥 Download Scene ${video.sceneId}
                </button>
            `;
        } else {
            videoDiv.innerHTML = `
                <h4>Scene ${video.sceneId}</h4>
                <div style="background: #f8d7da; padding: 20px; border-radius: 8px; color: #721c24;">
                    <p><strong>❌ Generation Failed</strong></p>
                    <p style="font-size: 0.9em;">${video.error}</p>
                </div>
                <p style="direction: rtl; text-align: right; margin: 10px 0; font-size: 0.9em;">${video.urduText}</p>
                <button class="download-btn" onclick="retryVideo(${video.sceneId})">
                    🔄 Retry Generation
                </button>
            `;
        }
        
        elements.videoContainer.appendChild(videoDiv);
    });
}

// Download single video
async function downloadVideo(url, sceneId) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `scene_${sceneId}_video.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download video. Please right-click the video and save manually.');
    }
}

// Download all videos with assembly instructions
async function downloadAllVideos() {
    const successfulVideos = state.videos.filter(v => v.url);
    
    if (successfulVideos.length === 0) {
        alert('No videos available to download.');
        return;
    }

    // Show assembly instructions modal
    showAssemblyInstructions(successfulVideos);
}

// Retry failed video
async function retryVideo(sceneId) {
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    state.videoGenerationInProgress = true;
    updateSceneStatus(sceneId, 'generating', 'Retrying with smart failover...');

    try {
        let result;
        
        if (state.videoProvider === 'auto') {
            // AUTO MODE: Smart failover
            result = await generateVideoSmart(scene.videoPrompt, scene.id);
        } else {
            // MANUAL MODE: Use selected provider
            result = await generateVideoWithProvider(
                state.videoProvider,
                scene.videoPrompt,
                scene.id
            );
            result.provider = CONFIG.VIDEO_PROVIDERS[state.videoProvider].name;
        }

        // Update video in state
        const videoIndex = state.videos.findIndex(v => v.sceneId === sceneId);
        if (videoIndex !== -1) {
            state.videos[videoIndex].url = result.url;
            state.videos[videoIndex].provider = result.provider;
            state.videos[videoIndex].error = null;
        }

        updateSceneStatus(sceneId, 'complete', `✅ Generated with ${result.provider}!`);
        displayVideos();
        alert(`✅ Video generated successfully with ${result.provider}!`);

    } catch (error) {
        console.error('Retry error:', error);
        updateSceneStatus(sceneId, 'error', `❌ Error: ${error.message}`);
        alert('Retry failed: ' + error.message);
    } finally {
        state.videoGenerationInProgress = false;
    }
}

// Event Listeners
elements.generateBtn.addEventListener('click', generateStory);

elements.editStoryBtn.addEventListener('click', () => {
    hideSection(elements.storySection);
    elements.userInput.value = state.currentStory || elements.userInput.value;
    elements.userInput.focus();
});

elements.continueToVideoBtn.addEventListener('click', generateVideoPrompts);

// Save API keys on input
elements.groqKey.addEventListener('blur', saveApiKeys);
elements.huggingfaceKey.addEventListener('blur', saveApiKeys);
elements.falKey.addEventListener('blur', saveApiKeys);
elements.replicateKey.addEventListener('blur', saveApiKeys);
elements.videoProvider.addEventListener('change', saveApiKeys);

// Generate videos button
elements.generateVideosBtn.addEventListener('click', generateAllVideos);

// Download all button
elements.downloadAllBtn.addEventListener('click', downloadAllVideos);

// Show assembly instructions modal
function showAssemblyInstructions(videos) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        overflow-y: auto;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 900px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    `;
    
    content.innerHTML = `
        <h2 style="color: #667eea; margin-bottom: 20px;">🎬 Complete Video Assembly Guide</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="margin-top: 0;">📊 Your Project Summary</h3>
            <p><strong>Total Scenes:</strong> ${videos.length} videos generated</p>
            <p><strong>Story:</strong> ${state.currentStory ? state.currentStory.substring(0, 80) + '...' : 'Urdu Historical Documentary'}</p>
            <p><strong>Status:</strong> ✅ Ready for assembly</p>
        </div>

        <div style="background: #e8f5e9; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #2e7d32;">🚀 Quick Assembly (5 minutes)</h3>
            <p><strong>Best for beginners - No installation required!</strong></p>
            <ol style="line-height: 1.8;">
                <li>Click <strong>"Download All Scenes"</strong> button below</li>
                <li>Go to <a href="https://www.kapwing.com/studio/editor" target="_blank" style="color: #667eea; font-weight: bold;">Kapwing Studio</a> (free, no signup)</li>
                <li>Click "Upload" and select all downloaded videos</li>
                <li>Drag videos to timeline in order</li>
                <li>Add transitions between clips (optional)</li>
                <li>Click "Export video" (1080p)</li>
            </ol>
            <p style="margin-top: 10px; padding: 10px; background: #fff3e0; border-radius: 5px;">
                💡 <strong>Tip:</strong> Kapwing is completely free for videos under 10 minutes!
            </p>
        </div>

        <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #1565c0;">💻 Alternative Tools</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                <div style="padding: 15px; background: white; border-radius: 8px; border: 1px solid #ddd;">
                    <strong>🎨 Clipchamp</strong><br>
                    <small>Windows built-in editor</small><br>
                    <a href="https://clipchamp.com" target="_blank" style="color: #667eea;">clipchamp.com</a>
                </div>
                <div style="padding: 15px; background: white; border-radius: 8px; border: 1px solid #ddd;">
                    <strong>🎬 iMovie</strong><br>
                    <small>Mac/iOS free editor</small><br>
                    <span style="color: #666;">Built-in on Apple devices</span>
                </div>
                <div style="padding: 15px; background: white; border-radius: 8px; border: 1px solid #ddd;">
                    <strong>📱 InShot</strong><br>
                    <small>Mobile video editor</small><br>
                    <a href="https://inshot.com" target="_blank" style="color: #667eea;">inshot.com</a>
                </div>
                <div style="padding: 15px; background: white; border-radius: 8px; border: 1px solid #ddd;">
                    <strong>🎞️ DaVinci Resolve</strong><br>
                    <small>Professional (free)</small><br>
                    <a href="https://www.blackmagicdesign.com/products/davinciresolve" target="_blank" style="color: #667eea;">Download</a>
                </div>
            </div>
        </div>

        <div style="background: #fff3e0; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #e65100;">🐍 Professional Assembly (Python + FFmpeg)</h3>
            <p><strong>For advanced users - Automatic transitions, subtitles & music!</strong></p>
            <pre style="background: #282c34; color: #abb2bf; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 13px;">
# 1. Download all scenes below
# 2. Create project structure
mkdir -p output/v2/motion output/v2/audio

# 3. Move downloaded videos to:
#    output/v2/motion/scene_01.mp4
#    output/v2/motion/scene_02.mp4
#    etc...

# 4. Install FFmpeg
# Mac: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
# Windows: Download from ffmpeg.org

# 5. Run assembly script
python3 assemble_flow_style.py

# 📺 Output: output/v2/final_documentary.mp4
            </pre>
            <p><strong>✨ Professional Features:</strong></p>
            <ul style="line-height: 1.6;">
                <li>✅ Cinematic crossfade transitions (0.6s)</li>
                <li>✅ Automatic Urdu subtitle overlay</li>
                <li>✅ Background music mixing</li>
                <li>✅ Color grading & enhancement</li>
                <li>✅ Zoom/pan effects on stills</li>
                <li>✅ Professional export quality</li>
            </ul>
        </div>

        <div style="background: #f3e5f5; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #6a1b9a;">📥 Download Your Scenes</h3>
            <div id="scene-download-list" style="max-height: 300px; overflow-y: auto;"></div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; flex-wrap: wrap;">
            <button id="closeModalBtn" 
                    style="background: #666; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px;">
                ❌ Close
            </button>
            <button id="downloadAllBtn2" 
                    style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;">
                📥 Download All Scenes
            </button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add download buttons for each scene
    const sceneList = document.getElementById('scene-download-list');
    videos.forEach((video, index) => {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            margin: 8px 0;
            background: white;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            transition: all 0.2s;
        `;
        item.onmouseenter = () => item.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        item.onmouseleave = () => item.style.boxShadow = 'none';
        
        const urduPreview = video.urduText.substring(0, 50) + (video.urduText.length > 50 ? '...' : '');
        const provider = video.provider ? `<span style="color: #666; font-size: 12px;">(${video.provider})</span>` : '';
        
        item.innerHTML = `
            <div>
                <strong style="color: #667eea;">Scene ${video.sceneId}</strong> ${provider}<br>
                <small style="color: #666; direction: rtl; display: block; margin-top: 4px;">${urduPreview}</small>
            </div>
            <button class="download-scene-btn" data-url="${video.url}" data-id="${video.sceneId}"
                    style="background: #4caf50; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; white-space: nowrap;">
                ⬇️ Download
            </button>
        `;
        sceneList.appendChild(item);
    });
    
    // Add event listeners
    document.getElementById('closeModalBtn').onclick = () => modal.remove();
    document.getElementById('downloadAllBtn2').onclick = () => downloadAllScenesSequential(videos, modal);
    
    // Individual download buttons
    document.querySelectorAll('.download-scene-btn').forEach(btn => {
        btn.onclick = async function() {
            const url = this.getAttribute('data-url');
            const id = parseInt(this.getAttribute('data-id'));
            this.textContent = '⏳ Downloading...';
            this.disabled = true;
            await downloadVideo(url, id);
            this.textContent = '✅ Downloaded';
            setTimeout(() => {
                this.textContent = '⬇️ Download';
                this.disabled = false;
            }, 2000);
        };
    });
}

// Download all scenes sequentially
async function downloadAllScenesSequential(videos, modal) {
    const btn = document.getElementById('downloadAllBtn2');
    const originalText = btn.textContent;
    
    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        btn.textContent = `⏳ Downloading ${i + 1}/${videos.length}...`;
        await downloadVideo(video.url, video.sceneId);
        
        // Small delay between downloads
        if (i < videos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    btn.textContent = '✅ All Downloaded!';
    btn.style.background = '#4caf50';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }, 3000);
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10001;
        font-weight: bold;
    `;
    successMsg.textContent = `✅ All ${videos.length} scenes downloaded! Now upload them to Kapwing or your video editor.`;
    document.body.appendChild(successMsg);
    
    setTimeout(() => successMsg.remove(), 5000);
}

// Initialize
loadApiKeys();
loadProviderStats();

// Make functions available globally
window.copyAllPrompts = copyAllPrompts;
window.downloadVideo = downloadVideo;
window.retryVideo = retryVideo;