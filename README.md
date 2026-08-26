# 🎬 AI Video Generator - Urdu Historical Stories

Transform text into engaging Urdu historical video stories using AI. Features automatic failover across multiple free and paid video generation providers.

## ✨ Features

- 📝 **AI Story Generation** - Generate complete Urdu stories using Groq AI
- 🎥 **Multi-Provider Video Generation** - Automatic failover across 6+ providers
- 🆓 **Free Options First** - Prioritizes free Hugging Face models
- 🔄 **Smart Auto-Failover** - Automatically tries next provider if one fails
- 📊 **Performance Tracking** - Tracks provider success/failure rates
- 🌐 **RTL Support** - Full Urdu (اردو) language support
- 🔐 **Secure Deployment** - API keys hidden on server side

## 🚀 Quick Start

### Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-video-generator
```

2. Create `.env.local` file:
```bash
cp .env.example .env.local
```

3. Add your API keys to `.env.local`:
```env
GROQ_API_KEY=your_groq_api_key
HUGGINGFACE_TOKEN=your_huggingface_token
```

4. Start local server:
```bash
python3 -m http.server 3000
```

5. Open: `http://localhost:3000`

### Deploy to Vercel

#### Option 1: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables
vercel env add GROQ_API_KEY
vercel env add HUGGINGFACE_TOKEN

# Deploy to production
vercel --prod
```

#### Option 2: Using Vercel Dashboard

1. Push code to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables:
   - `GROQ_API_KEY` - Your Groq API key
   - `HUGGINGFACE_TOKEN` - Your Hugging Face token
4. Deploy

## 🔑 Getting API Keys

### Required (Free)

- **Groq API** - [Get free key](https://console.groq.com/keys)
  - Used for story generation
  - Very generous free tier
  
- **Hugging Face** - [Get free token](https://huggingface.co/settings/tokens)
  - Used for video generation
  - Multiple free models available

### Optional (Paid)

- **FAL.ai** - [Get $5 free credits](https://fal.ai/dashboard)
- **Replicate** - [Get free tokens](https://replicate.com/account/api-tokens)

## 🎯 Video Providers (Priority Order)

1. **CogVideoX-5B** (Hugging Face) - Best quality, FREE
2. **Wan2.2-5B** (Hugging Face) - Fastest, FREE
3. **HunyuanVideo** (Tencent) - High quality, FREE
4. **LTX-Video** (Lightricks) - Fast, FREE
5. **FAL LTX-Video** - Reliable, PAID
6. **HappyHorse-1.0** - Quality, PAID

## 🔐 Security Features

- API keys stored as environment variables on Vercel
- Never exposed to client-side code
- Serverless functions proxy all API requests
- `.gitignore` prevents accidental key commits

## 📁 Project Structure

```
├── index.html              # Main application
├── style.css              # Styles
├── script.js              # Client-side logic (local)
├── script-vercel.js       # Vercel version with proxies
├── api/                   # Serverless functions
│   ├── config.js         # Get server config
│   ├── groq.js           # Groq API proxy
│   └── huggingface.js    # Hugging Face proxy
├── vercel.json           # Vercel configuration
├── .env.example          # Environment template
└── .gitignore            # Git ignore rules
```

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **APIs**: Groq, Hugging Face, FAL.ai, Replicate
- **Deployment**: Vercel Serverless Functions
- **Language**: Urdu (اردو) with RTL support

## 📱 Mobile Support

Fully responsive design works on:
- 📱 Android
- 🍎 iOS
- 💻 Desktop
- 📲 Tablets

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📄 License

MIT License - Feel free to use for personal or commercial projects

## 🆘 Support

Having issues? 
- Check [Issues](../../issues) page
- Review API key configuration
- Verify environment variables on Vercel

## 🎓 How It Works

1. **User Input** → Type story idea in Urdu
2. **Story Generation** → Groq AI generates complete story
3. **Scene Extraction** → Parses story into video scenes
4. **Video Generation** → Auto-failover tries providers until success
5. **Display Results** → Shows generated videos with download options

## 🌟 Features Roadmap

- [ ] More video models integration
- [ ] Voice narration in Urdu
- [ ] Background music
- [ ] Video editing capabilities
- [ ] Social media export
- [ ] Story templates

---

Made with ❤️ for Urdu content creators
