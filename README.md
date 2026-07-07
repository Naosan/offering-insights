# Offering Insights temporary site

This is a temporary static website for the Offering Insights YouTube Data API Services audit and default quota restoration request.

Pages:

- `index.html` - public overview and API usage summary
- `app.html` - static prototype dashboard for screenshots
- `privacy.html` - privacy policy
- `terms.html` - terms of service

Suggested form URLs after publishing:

- Main website / primary access URL: `https://<host>/`
- Privacy policy URL: `https://<host>/privacy.html`
- Terms URL: `https://<host>/terms.html`

The site intentionally does not publish the applicant's home address.

## GitHub Pages publishing notes

This repository includes `.nojekyll` for GitHub Pages static hosting.

High-level publishing flow:

1. Create a public GitHub repository, for example `offering-insights`.
2. Push this folder to the repository's `main` branch.
3. In GitHub repository settings, open Pages and select `Deploy from a branch`.
4. Select the `main` branch and `/ (root)`.
5. Wait for the Pages deployment to finish.

Expected URLs:

- Main website / primary access URL: `https://<username>.github.io/offering-insights/`
- Privacy policy URL: `https://<username>.github.io/offering-insights/privacy.html`
- Terms URL: `https://<username>.github.io/offering-insights/terms.html`
