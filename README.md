# Interview Insight

Upload an interview recording, get a structured transcript with translations and analysis — powered by Google's Gemini AI.

**Bring Your Own Key** — you provide your own Gemini API key. It's encrypted locally in your browser and never stored on our servers.

## Features

- Upload audio or video files (up to 50MB recommended)
- Automatic transcription with speaker identification and timestamps
- Translation to English when the source is in another language
- Download transcripts as .docx (original, English, and combined)

## Quick Start

1. Visit the deployed app or run locally (see below)
2. Click the gear icon to open Settings
3. Enter your Gemini API key ([get one here](https://aistudio.google.com/app/apikey))
4. Upload an interview and transcribe

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000. No environment variables needed — the app prompts you for your API key on first use.

## Tech Stack

React, TypeScript, Vite, Tailwind CSS, Netlify (edge functions + serverless functions), Google Gemini AI

## Status

Active development. See `.planning/ROADMAP.md` for progress.
