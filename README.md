# Pitchlore: learn the lore, own the over

A static web app (public/index.html) plus one small Netlify Function (netlify/functions/ai.js)
that powers the AI features: Captain's Call, unlimited Guess Who rounds and the Match Reel report.

Everything else (Howzat?, Rewind, Set the Field, Match Reel scoring, wagon wheels, scorecard image,
season archive, XP levels, Book Cricket) runs in the browser and needs no server.

## Deploy in 10 minutes

1. **Get an API key.** Create an Anthropic Console account, create an API key, and set a monthly
   spend limit in the Console (AI calls are billed to this key).
2. **Put the code on GitHub.** Create a new repository and upload everything in this folder
   (keep the `public` and `netlify` folders and `netlify.toml` exactly as they are).
3. **Connect Netlify.** In Netlify choose Add new site, then Import an existing project, pick your GitHub repo.
   Build settings are read from `netlify.toml`, so just continue.
4. **Add your key.** Before the first deploy (or afterwards, then redeploy), open
   Site configuration, Environment variables and add:
   - `ANTHROPIC_API_KEY` = your key (required)
   - `ANTHROPIC_MODEL` = optional, defaults to `claude-haiku-5-5` (cheapest, fast)
   - `ALLOWED_ORIGINS` = optional, extra domains allowed to call the function (for example your custom domain)
5. **Deploy and test.** Open your site, go to Captain's Call and tap New situation. If a situation appears, AI works.
6. **Name your site.** Site configuration, Change site name gives you `your-name.netlify.app`.

## Safety and cost

- The key is only ever stored in Netlify's environment variables, never in the web page.
- The function only accepts requests from your own site, caps prompts at 6,000 characters and replies at 600 tokens,
  and allows 20 AI calls per visitor per 10 minutes (best effort, it resets when the function restarts).
- You still pay Anthropic for every AI call, so keep the spend limit set. If you ever see abuse, rotate the key.
- Netlify Functions have a time limit per call on the free plan. Check Netlify's current limits and pricing.

## Updating

Edit `public/index.html` on GitHub. Netlify redeploys automatically.

## Run locally (optional)

    npm install -g netlify-cli
    export ANTHROPIC_API_KEY=your-key
    netlify dev
