#!/bin/bash

echo "🚀 Setting up GitHub repository..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

# Check if already initialized
if [ -d ".git" ]; then
    echo "✅ Git already initialized"
else
    echo "📦 Initializing git repository..."
    git init
fi

# Add all files (respecting .gitignore)
echo "📝 Adding files to git..."
git add .

# Create initial commit
echo "💾 Creating commit..."
git commit -m "Initial commit: AI Video Generator with auto-failover

Features:
- Multi-provider video generation
- Smart auto-failover system
- Urdu language support (RTL)
- Free Hugging Face models
- Vercel deployment ready
- Secure API key management"

echo ""
echo "✅ Local git setup complete!"
echo ""
echo "📤 Next steps:"
echo ""
echo "1. Create a new PRIVATE repository on GitHub:"
echo "   https://github.com/new"
echo ""
echo "2. Run these commands (replace YOUR_USERNAME and REPO_NAME):"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Deploy to Vercel:"
echo "   - Go to https://vercel.com"
echo "   - Click 'New Project'"
echo "   - Import your GitHub repo"
echo "   - Add environment variables:"
echo "     GROQ_API_KEY=<REDACTED_API_KEY>"
echo "     HUGGINGFACE_TOKEN=<REDACTED_API_KEY>"
echo "   - Click 'Deploy'"
echo ""
echo "🎉 Done! Your app will be live in minutes!"
