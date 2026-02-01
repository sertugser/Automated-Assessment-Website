# Automated Assessment Website

AI-Powered English Learning Platform with automated assessment and feedback capabilities.

## Overview

This application provides an English learning platform with AI-powered features including writing analysis, speaking assessment, and dynamic quiz generation. The system uses multiple AI service providers with automatic failover to ensure reliability.

## Prerequisites

Before starting, ensure you have the following installed:

- Node.js (version 18 or higher)
- npm (version 9 or higher)
- A modern web browser with JavaScript enabled

## Installation

### Step 1: Clone or Download the Project

Download the project files to your local machine and navigate to the project directory:

```bash
cd "Automated Assessment Website"
```

### Step 2: Install Dependencies

Install all required npm packages:

```bash
npm install
```

This command will install all dependencies listed in `package.json`. The installation may take a few minutes.

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory of the project:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On Windows (Command Prompt):**
```cmd
copy .env.example .env
```

**On macOS/Linux:**
```bash
cp .env.example .env
```

Open the `.env` file with a text editor and configure at least one API key. The application requires at least one API key to function properly.

## API Key Configuration

The application supports three AI service providers. You must configure at least one API key for the application to work with real AI features.

### Option 1: Groq API (Recommended)

1. Navigate to https://console.groq.com
2. Create an account or sign in with your email address
3. In the dashboard, locate the "API Keys" section
4. Click "Create API Key"
5. Copy the generated API key (format: `gsk_...`)
6. Open your `.env` file
7. Replace `your_groq_api_key_here` with your actual API key
8. Save the file

**Service Limits:** 14,400 requests per day (free tier)

### Option 2: Hugging Face API

1. Navigate to https://huggingface.co
2. Create an account or sign in
3. Click on your profile icon, then select "Settings"
4. Navigate to "Access Tokens" in the left sidebar
5. Click "New token"
6. Enter a name for your token (e.g., `english-learning-app`)
7. Select token type: "Read" or "Read + Write"
8. Click "Generate token"
9. Copy the generated token (format: `hf_...`)
10. Open your `.env` file
11. Replace `your_huggingface_token_here` with your actual token
12. Save the file

**Service Limits:** Rate limited, generous free tier

### Option 3: Google Gemini API

1. Navigate to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "+ Create API Key"
4. Select an existing Google Cloud project or create a new one
5. Copy the generated API key
6. Open your `.env` file
7. Replace `your_gemini_api_key_here` with your actual API key
8. Save the file

**Service Limits:** 15 requests per minute (free tier)

### Environment Variables Format

Your `.env` file should look like this:

```env
VITE_GROQ_API_KEY=gsk_your_actual_key_here
VITE_HF_API_KEY=hf_your_actual_token_here
VITE_GEMINI_API_KEY=your_actual_gemini_key_here

# Admin credentials (optional - defaults provided if not set)
VITE_ADMIN_EMAIL=admin@aafs.com
VITE_ADMIN_PASSWORD=Admin@2026!
```

**Admin Credentials:**
- `VITE_ADMIN_EMAIL`: The email address that will have admin access (default: `admin@aafs.com`)
- `VITE_ADMIN_PASSWORD`: The password for the admin account (default: `Admin@2026!`)
- If these are not set, the system will use the default values above
- Only the email specified in `VITE_ADMIN_EMAIL` can log in as an admin

**Important:** Do not commit the `.env` file to version control. It is already included in `.gitignore`.

**Troubleshooting API keys:**
- **Restart the dev server** (`npm run dev`) after changing `.env`. Vite reads env only at startup.
- Use exact names: `VITE_GROQ_API_KEY`, `VITE_GEMINI_API_KEY` (no extra spaces).
- Don't wrap keys in quotes unless needed; avoid leading/trailing spaces.

## Running the Application

### Development Mode

Start the development server:

```bash
npm run dev
```

The application will start on `http://localhost:3000` by default. The terminal will display the exact URL if a different port is used.

Open your web browser and navigate to the displayed URL to access the application.

### Building for Production

To create a production build:

```bash
npm run build
```

The build output will be in the `build` directory. Deploy the contents of this directory to your web server.

## Application Features

### Writing Assessment

1. Navigate to the "Writing" section from the main navigation
2. Select a writing prompt from the available topics
3. Write your essay in the provided text editor
4. Click "Submit for Feedback" when finished
5. Review the AI-generated feedback including grammar analysis, vocabulary suggestions, and coherence evaluation

### Speaking Assessment

1. Navigate to the "Speaking" section from the main navigation
2. Select a speaking topic
3. Click "Start Recording" and grant microphone permissions when prompted
4. Speak for the recommended duration
5. Click "Stop" to end the recording
6. Wait for AI analysis of pronunciation, fluency, and grammar
7. Review the detailed feedback provided

### Quiz Generation

1. Navigate to the "Quiz" section from the main navigation
2. Select a quiz category based on your learning level
3. Answer the questions presented
4. Review explanations for each answer
5. Track your progress and scores

### Progress Tracking

1. Navigate to the "Progress" section to view your learning statistics
2. Review charts showing your performance over time
3. Check achievement badges and milestones
4. Monitor skill breakdown across different areas

## AI Service Architecture

The application implements a failover strategy for AI services:

1. Primary: Attempts to use Groq API first
2. Backup 1: Falls back to Hugging Face API if Groq fails
3. Backup 2: Falls back to Google Gemini API if both previous services fail
4. Fallback: Returns mock data if all services are unavailable

This ensures the application remains functional even if one or more AI services experience issues.

## Troubleshooting

### Issue: Application does not start

**Solution:**
- Verify Node.js is installed: `node --version`
- Verify npm is installed: `npm --version`
- Ensure all dependencies are installed: `npm install`
- Check for error messages in the terminal

### Issue: AI features not working

**Solution:**
- Verify your `.env` file exists in the root directory
- Confirm at least one API key is configured correctly
- Check that API keys are not expired or revoked
- Review browser console for specific error messages
- Verify your internet connection is active

### Issue: Rate limit errors

**Solution:**
- Wait a few minutes before retrying
- The application will automatically try backup services
- Consider upgrading to a paid API tier if limits are consistently exceeded
- Configure additional API keys for better redundancy

### Issue: Microphone not working in Speaking section

**Solution:**
- Grant microphone permissions when prompted by the browser
- Check browser settings to ensure microphone access is allowed
- Verify your microphone hardware is functioning
- Try a different browser if issues persist

### Issue: Build fails

**Solution:**
- Clear node_modules: `rm -rf node_modules` (or `Remove-Item -Recurse -Force node_modules` on Windows)
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `npm install`
- Check for TypeScript errors: `npm run build` and review error messages

## Project Structure

```
Automated Assessment Website/
├── src/
│   ├── components/          # React components
│   ├── lib/                 # Utility functions and AI services
│   ├── assets/             # Static assets
│   └── main.tsx           # Application entry point
├── .env.example           # Environment variables template
├── .gitignore            # Git ignore rules
├── package.json          # Project dependencies
├── vite.config.ts        # Vite configuration
└── README.md            # This file
```

## Technology Stack

- **Frontend Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Animations:** Motion (Framer Motion)
- **AI Services:** Groq, Hugging Face Inference API, Google Gemini API
- **State Management:** React Hooks
- **UI Components:** Radix UI primitives

## Security Considerations

- Never commit API keys to version control
- Keep your `.env` file secure and do not share it
- Regularly rotate API keys if compromised
- Review API usage limits to prevent unexpected charges
- Use environment-specific API keys for production deployments

## Support and Documentation

For issues related to:
- **Groq API:** https://console.groq.com/docs
- **Hugging Face:** https://huggingface.co/docs/api-inference
- **Google Gemini:** https://ai.google.dev/docs

## License

This project is provided as-is for educational and development purposes.

## Version

Current version: 0.1.0
