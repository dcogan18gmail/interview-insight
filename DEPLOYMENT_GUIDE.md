# Deployment Guide for Interview Insight

This guide will walk you through deploying your app to Netlify step by step.

## Prerequisites

- Node.js installed (check with `node --version`)
- A Gemini API key from https://aistudio.google.com/app/apikey
- A Netlify account (free at https://netlify.com)

## Step-by-Step Deployment

### Step 1: Set Up Your API Key Locally

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` in a text editor

3. Replace `your_api_key_here` with your actual Gemini API key:
   ```
   GEMINI_API_KEY=AIza...your_actual_key...
   ```

4. Save and close the file

### Step 2: Install Dependencies

```bash
npm install
```

This will download all required packages. It may take a minute or two.

### Step 3: Test Locally (Optional but Recommended)

```bash
npm run dev
```

- Open http://localhost:3000 in your browser
- Try uploading a small audio file to make sure it works
- Press `Ctrl+C` in the terminal when done testing

### Step 4: Build for Production

```bash
npm run build
```

This creates an optimized version of your app in a folder called `dist`.

### Step 5: Deploy to Netlify

#### Method A: Using the Web Interface (Easiest)

1. Go to https://app.netlify.com/drop

2. Drag the entire `dist` folder into the upload area

3. Wait for it to upload and deploy (usually takes 30 seconds)

4. You'll get a URL like `https://random-name-123.netlify.app`

5. **IMPORTANT:** Add your API key:
   - Click "Site settings" 
   - Click "Environment variables" in the left sidebar
   - Click "Add a variable"
   - Key: `GEMINI_API_KEY`
   - Value: Your API key (the same one from `.env.local`)
   - Click "Create variable"

6. Trigger a new deploy to apply the change:
   - Go to "Deploys" tab
   - Click "Trigger deploy" dropdown
   - Click "Clear cache and deploy site"

7. Wait for the deploy to finish (1-2 minutes)

8. Visit your site URL - it should work now!

#### Method B: Using the CLI (More Control)

1. Install Netlify CLI globally:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```
   This will open your browser to authenticate.

3. Deploy:
   ```bash
   netlify deploy --prod
   ```

4. Follow the prompts:
   - "Create & configure a new site": Press Enter
   - "Team": Choose your team
   - "Site name": Choose a name or press Enter for random
   - "Publish directory": Type `dist` and press Enter

5. Add your API key:
   ```bash
   netlify env:set GEMINI_API_KEY "your_actual_api_key_here"
   ```

6. Redeploy to apply the environment variable:
   ```bash
   netlify deploy --prod
   ```

7. Your site is live!

#### Method C: Connect to Git Repository (Best for Ongoing Updates)

1. Create a repository on GitHub/GitLab/Bitbucket

2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

3. In Netlify:
   - Click "Add new site"
   - Choose "Import an existing project"
   - Select your Git provider
   - Choose your repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click "Deploy site"

4. Add environment variable BEFORE the first deploy finishes:
   - Click "Site settings"
   - "Environment variables"
   - Add `GEMINI_API_KEY`

5. If you forgot, just redeploy after adding the variable

## Troubleshooting

### "Blank white screen" after deploying

This usually means the API key isn't set correctly.

1. Go to Netlify dashboard
2. Click your site
3. Site settings → Environment variables
4. Make sure `GEMINI_API_KEY` is there with the correct value
5. Go to Deploys → Trigger deploy → Clear cache and deploy site

### "Build failed" error

Check the deploy logs in Netlify for the specific error. Common issues:

- Missing dependencies: Make sure `package.json` is committed
- TypeScript errors: Run `npm run build` locally first to catch errors

### App works locally but not in production

1. Check browser console (F12) for errors
2. Verify the API key is set in Netlify environment variables
3. Check that the environment variable name is exactly `GEMINI_API_KEY` (case-sensitive)

### "npm: command not found"

You need to install Node.js from https://nodejs.org/

## Security Note

⚠️ **Your API key is embedded in the production build.** This means:

- Anyone who can access your site can use your API quota
- Keep your Netlify URL private, or...
- Add password protection (Netlify has this feature on paid plans)
- For public sites, consider building a backend proxy that keeps the API key server-side

## Cost Management

The Gemini API has free tier limits. Monitor your usage at:
https://aistudio.google.com/

Consider setting up usage alerts in Google Cloud Console if you're concerned about costs.

## Need Help?

- Netlify docs: https://docs.netlify.com/
- Gemini API docs: https://ai.google.dev/docs
- Vite docs: https://vitejs.dev/guide/
