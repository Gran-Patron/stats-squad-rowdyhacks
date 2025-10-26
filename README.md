<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# stats-squad-rowdyhacks

Stats Squad — a dynamic RowdyHacks team from UT San Antonio combining actuarial science, statistics, and data science. Creative, curious, and perseverant with a dash of perfectionism, we are pragmatic learners who apply critical thinking to build reproducible, practical analytics and trustworthy solutions.

---

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1bVqcbJuvS45m6esxtuui5q3lixBybIOC

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Configure required environment variables:
   - `GEMINI_API_KEY`: Gemini API key for AI features
   - `VITE_CONVEX_URL`: URL of your Convex deployment
   - `CONVEX_SITE_URL`: Base URL Convex uses for callbacks (e.g. `https://your-team.convex.site`)
   - `SPOTIFY_CLIENT_ID`: Spotify app client ID
   - `SPOTIFY_CLIENT_SECRET`: Spotify app client secret
   - `SPOTIFY_REDIRECT_URI`: Spotify redirect pointing to Convex HTTP endpoint (e.g. `https://your-team.convex.site/api/spotify/callback`)
   - `SPOTIFY_SUCCESS_REDIRECT`: Frontend location to send users after a successful connect (e.g. `http://localhost:5173/`)
   - `SPOTIFY_FAILURE_REDIRECT`: Frontend location to send users when connect fails
   You can use `.env.local` for Vite variables (`VITE_` prefix) and Convex’s environment management (`npx convex env set`) for backend secrets.
3. Run the app: `npm run dev`
