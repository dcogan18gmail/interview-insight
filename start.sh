#!/bin/bash

# Interview Insight - Quick Start Script
# This will help you get up and running quickly

echo "=========================================="
echo "Interview Insight - Quick Start"
echo "=========================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  No .env.local file found"
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "✅ Created .env.local"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.local and add your Gemini API key!"
    echo "Get your API key from: https://aistudio.google.com/app/apikey"
    echo ""
    read -p "Press Enter after you've added your API key to .env.local..."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "What would you like to do?"
echo "1) Run locally (npm run dev)"
echo "2) Build for production (npm run build)"
echo "3) Build and deploy to Netlify"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting local development server..."
        npm run dev
        ;;
    2)
        echo ""
        echo "🔨 Building for production..."
        npm run build
        if [ $? -eq 0 ]; then
            echo "✅ Build successful! Output is in the 'dist' folder"
            echo ""
            echo "To deploy to Netlify:"
            echo "1. Install Netlify CLI: npm install -g netlify-cli"
            echo "2. Run: netlify deploy --prod"
            echo "3. When prompted, use 'dist' as the publish directory"
            echo "4. Add GEMINI_API_KEY environment variable in Netlify dashboard"
        fi
        ;;
    3)
        echo ""
        echo "🔨 Building for production..."
        npm run build
        if [ $? -eq 0 ]; then
            echo "✅ Build successful!"
            echo ""
            # Check if netlify CLI is installed
            if ! command -v netlify &> /dev/null; then
                echo "Installing Netlify CLI..."
                npm install -g netlify-cli
            fi
            echo ""
            echo "🚀 Deploying to Netlify..."
            echo ""
            echo "IMPORTANT: After deployment:"
            echo "1. Go to your Netlify dashboard"
            echo "2. Navigate to: Site settings → Environment variables"
            echo "3. Add: GEMINI_API_KEY with your API key"
            echo "4. Redeploy the site to apply the changes"
            echo ""
            netlify deploy --prod
        fi
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
