// Configuration - Multiple Video Providers with Auto-Failover (Vercel Version)
const CONFIG = {
    GROQ_API_URL: '/api/groq', // Serverless function
    GROQ_MODEL: 'openai/gpt-oss-120b',
    HF_API_URL: '/api/huggingface', // Serverless function
    
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
    VIDEO_MAX_WAIT: 300000 // 5 minutes
};

// State - API keys loaded from server
let state = {
    apiKeys: {
        groq: '', // Will be loaded from server
        huggingface: '', // Will be loaded from server
        fal: '',
        replicate: ''
    },
    useServerProxy: true, // Use Vercel serverless functions
    videoProvider: 'auto',
    currentStory: null,
    scenes: [],
    videos: [],
    videoGenerationInProgress: false,
    providerStats: {},
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

// Load API keys from server (secure)
async function loadServerConfig() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            state.apiKeys.groq = config.groqKey || '';
            state.apiKeys.huggingface = config.huggingfaceToken || '';
            
            // Hide input fields if server has keys
            if (config.groqKey) {
                elements.groqKey.value = '••••••••••••••••';
                elements.groqKey.disabled = true;
                elements.groqKey.placeholder = 'API key loaded from server';
            }
            if (config.huggingfaceToken) {
                elements.huggingfaceKey.value = '••••••••••••••••';
                elements.huggingfaceKey.disabled = true;
                elements.huggingfaceKey.placeholder = 'Token loaded from server';
            }
            
            console.log('✅ Server config loaded');
        }
    } catch (error) {
        console.warn('⚠️ Could not load server config, using client-side keys');
        state.useServerProxy = false;
        loadApiKeys(); // Fall back to localStorage
    }
}

// NOTE: Rest of the functions remain the same, just need to update API calls

// Call Groq API (using server proxy if available)
async function callGroqAPI(prompt, retries = CONFIG.MAX_RETRIES) {
    try {
        const requestBody = {
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
        };

        let response;
        
        if (state.useServerProxy) {
            // Use Vercel serverless function
            response = await fetch(CONFIG.GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } else {
            // Direct API call (fallback)
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.apiKeys.groq}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        }

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

console.log('🚀 Vercel version loaded - API keys secured on server');
