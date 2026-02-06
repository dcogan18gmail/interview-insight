# Interview Insight

An application that transcribes and translates audio/video interviews using Google's Gemini AI.

## Features

- Upload audio or video files
- Automatic transcription with real-time progress
- Translation to English if source is in another language
- Download transcripts as .docx files (original, English, and combined versions)
- Timestamps for each conversation turn

## Setup for Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up your API key:**
   - Copy `.env.example` to `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - Get your Gemini API key from https://aistudio.google.com/app/apikey
   - Add it to `.env.local`:
     ```
     GEMINI_API_KEY=your_actual_api_key_here
     ```

3. **Run locally:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

4. **Build for production:**
   ```bash
   npm run build
   ```

## Deploy to Netlify

### Option 1: Netlify CLI (Recommended)

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the app:**
   ```bash
   npm run build
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod
   ```
   - Follow the prompts
   - When asked for the publish directory, enter: `dist`

4. **Set your API key in Netlify:**
   - Go to your site in Netlify dashboard
   - Navigate to: Site settings → Environment variables
   - Add variable:
     - Key: `GEMINI_API_KEY`
     - Value: Your actual API key

5. **Redeploy** to pick up the environment variable:
   ```bash
   netlify deploy --prod
   ```

### Option 2: Netlify Web UI

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Drag and drop:**
   - Go to https://app.netlify.com/drop
   - Drag the `dist` folder to the upload area

3. **Set your API key:**
   - In Netlify dashboard → Site settings → Environment variables
   - Add: `GEMINI_API_KEY` with your API key

4. **Trigger a rebuild:**
   - Go to Deploys tab
   - Click "Trigger deploy" → "Clear cache and deploy site"

### Option 3: Connect to Git

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **In Netlify:**
   - Click "Add new site" → "Import an existing project"
   - Connect your repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`

3. **Add environment variable:**
   - Before deploying, add `GEMINI_API_KEY` in Site settings

## Important Notes

- **API Key Security:** The API key is built into your app at build time. Keep your Netlify deployment URL private or implement authentication if sharing publicly.
- **API Costs:** Gemini API has usage limits and costs. Monitor your usage at https://aistudio.google.com/
- **File Size Limits:** Very large audio files may take longer to process or timeout. Test with files under 50MB initially.

## Troubleshooting

**Blank white screen:**
- Make sure you've set the `GEMINI_API_KEY` environment variable in Netlify
- Check browser console for errors (F12)

**"Command not found" errors:**
- Make sure you ran `npm install` first
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

**Build fails on Netlify:**
- Check that the environment variable is set correctly
- Check the deploy logs for specific error messages
