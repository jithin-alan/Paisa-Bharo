<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ba803483-ddcf-496c-b3c9-7d1a85fc5692

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Public Legal Pages (GitHub Pages)

Standalone static HTML pages for Terms of Service and Privacy Policy live in `docs/`:
- `docs/index.html`
- `docs/terms-of-service.html`
- `docs/privacy-policy.html`

To publish public links anyone (including TheoremReach Support) can open without signing in:
1. Push this repository to a **public** GitHub repository.
2. In your GitHub repository, open **Settings → Pages → Build and deployment**.
3. Set **Source** to **GitHub Actions** (using `.github/workflows/github-pages.yml`) or **Deploy from a branch** (`main` / `/docs`).
4. Your public links will be live at:
   - `https://<your-github-username>.github.io/<repo-name>/terms-of-service.html`
   - `https://<your-github-username>.github.io/<repo-name>/privacy-policy.html`
5. Optionally set `VITE_LEGAL_BASE_URL=https://<your-github-username>.github.io/<repo-name>` before building if you want the registration page links to point directly to your GitHub Pages URLs (otherwise they open `/terms-of-service.html` and `/privacy-policy.html` hosted directly by the app).

