# 🚀 Deployment Guide - AI Video Generator

## Step-by-Step Vercel Deployment

### 1️⃣ Prepare Repository

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: AI Video Generator with auto-failover"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 2️⃣ Deploy to Vercel

#### Method A: Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: **Other**
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: (leave empty)

5. Add Environment Variables:
   ```
   GROQ_API_KEY=<REDACTED_API_KEY>
   HUGGINGFACE_TOKEN=<REDACTED_API_KEY>
   ```

6. Click "Deploy"

#### Method B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add secrets
vercel env add GROQ_API_KEY production
# Paste: <REDACTED_API_KEY>

vercel env add HUGGINGFACE_TOKEN production
# Paste: <REDACTED_API_KEY>

# Deploy to production
vercel --prod
```

### 3️⃣ Verify Deployment

1. Open your Vercel URL (e.g., `your-app.vercel.app`)
2. Check if API key fields show "loaded from server"
3. Test story generation
4. Test video generation with auto-failover

### 4️⃣ Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

## 🔐 Security Checklist

- ✅ API keys in environment variables
- ✅ `.gitignore` includes `apikey`, `.env*`
- ✅ Never commit sensitive data
- ✅ Use serverless functions for API calls
- ✅ CORS properly configured

## 🐛 Troubleshooting

### API Keys Not Working

**Problem**: "API key not configured on server"

**Solution**:
```bash
# Check environment variables
vercel env ls

# Re-add if missing
vercel env add GROQ_API_KEY production
vercel env add HUGGINGFACE_TOKEN production

# Redeploy
vercel --prod
```

### Serverless Function Timeout

**Problem**: Video generation takes too long

**Solution**: Vercel serverless functions have 10s timeout on Hobby plan. Upgrade to Pro for 60s timeout, or use direct client-side calls for video generation.

### CORS Errors

**Problem**: API requests blocked by CORS

**Solution**: Check `api/*.js` files have proper CORS headers:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

## 📊 Monitoring

### Check Logs
```bash
vercel logs YOUR_DEPLOYMENT_URL
```

### View Analytics
- Go to Vercel Dashboard → Your Project → Analytics
- Monitor request counts, errors, and response times

## 🔄 Updates & Redeployment

### Automatic (Recommended)
```bash
# Push to GitHub - auto deploys
git add .
git commit -m "Update features"
git push
```

### Manual
```bash
vercel --prod
```

## 💰 Cost Estimation

### Vercel (Free Tier)
- 100GB bandwidth/month
- Unlimited serverless function invocations
- 100 hours serverless execution time
- **Cost: FREE for most use cases**

### API Services (Free Tier)
- **Groq**: Generous free tier
- **Hugging Face**: Free inference API (rate limited)
- **Total: $0/month** for moderate use

### Upgrade Costs (If Needed)
- **Vercel Pro**: $20/month (60s function timeout)
- **FAL.ai**: Pay-as-you-go (starts at $5)
- **Replicate**: Pay-as-you-go

## 🎯 Performance Optimization

1. **Enable Caching**:
   ```javascript
   res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
   ```

2. **Optimize Video Delivery**:
   - Use CDN for video hosting
   - Implement lazy loading
   - Add video compression

3. **Monitor Usage**:
   - Track API call counts
   - Monitor response times
   - Set up alerts for errors

## 📞 Support Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Discord**: [vercel.com/discord](https://vercel.com/discord)
- **GitHub Issues**: Create issue in your repo

---

Ready to deploy? Follow the steps above and your app will be live in minutes! 🚀
