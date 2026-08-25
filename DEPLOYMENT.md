# 🚀 Deployment Guide - AI Video Generator

## Prerequisites
- GitHub account (private repo)
- Vercel account (free)
- API Keys ready

## Step 1: Push to GitHub Private Repo

```bash
# Already initialized git
git add .
git commit -m "Initial commit - AI Video Generator"

# Create private repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
vercel
```

4. **Set Environment Variables:**
```bash
vercel env add GROQ_API_KEY
# Paste: <REDACTED_API_KEY>

vercel env add HUGGINGFACE_TOKEN
# Paste: <REDACTED_API_KEY>
```

5. **Deploy to Production:**
```bash
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)

4. **Add Environment Variables:**
   - Go to Settings → Environment Variables
   - Add `GROQ_API_KEY` = `<REDACTED_API_KEY>`
   - Add `HUGGINGFACE_TOKEN` = `<REDACTED_API_KEY>`
   - Environment: **Production, Preview, Development** (all three)

5. Click **Deploy**

## Step 3: Verify Deployment

1. Visit your Vercel URL (e.g., `your-app.vercel.app`)
2. Open browser console (F12)
3. You should see: `✅ API keys loaded from server`
4. Test video generation

## 🔐 Security Features

✅ API keys are stored as Vercel environment variables
✅ Keys are NOT in your code or GitHub repo
✅ Serverless function `/api/get-api-keys` securely provides keys
✅ `.gitignore` prevents accidental key commits
✅ Users can still add their own keys via UI (localStorage)

## 📱 Features

- ✅ Auto-failover between 6 video providers
- ✅ Free Hugging Face models (CogVideoX, Wan2.2, HunyuanVideo, LTX)
- ✅ Paid backups (FAL.ai, Replicate)
- ✅ Urdu language specialization
- ✅ Mobile responsive
- ✅ Progress tracking
- ✅ Provider statistics

## 🔧 Troubleshooting

**Keys not loading?**
- Check Vercel dashboard → Settings → Environment Variables
- Ensure all three environments are selected
- Redeploy after adding variables

**API errors?**
- Check browser console for detailed errors
- Verify API key formats are correct
- Try regenerating keys from provider dashboards

**Local development:**
- Create `.env.local` file:
```
GROQ_API_KEY=your_key_here
HUGGINGFACE_TOKEN=your_token_here
```
- Run: `vercel dev`

## 📊 Provider Priority Order

1. CogVideoX-5B (HuggingFace) - Free, High Quality
2. Wan2.2-5B (HuggingFace) - Free, Fast
3. HunyuanVideo (HuggingFace) - Free, High Quality
4. LTX-Video (HuggingFace) - Free, Fast
5. FAL.ai - Paid, Reliable
6. Replicate HappyHorse - Paid, Quality

## 🎉 Done!

Your AI Video Generator is now live with secure, hidden API keys!
