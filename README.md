# Offering Insights temporary site

This is a temporary static website for the Offering Insights YouTube Data API Services audit and default quota restoration request.

Pages:

- `index.html` - public overview and API usage summary
- `app.html` - live browser-only API demo dashboard for review screenshots and screencasts
- `privacy.html` - privacy policy
- `terms.html` - terms of service

Suggested form URLs after publishing:

- Main website / primary access URL: `https://<host>/`
- Privacy policy URL: `https://<host>/privacy.html`
- Terms URL: `https://<host>/terms.html`

The site intentionally does not publish the applicant's home address.

## Review screencast workflow

Use `app.html` for the follow-up screencast requested by the YouTube API Services review team.

Recommended recording flow:

1. Open `https://naosan.github.io/offering-insights/app.html`.
2. Paste the YouTube Data API key into the browser-only API key field.
3. Keep the sample public video IDs or paste other public video URLs.
4. Click `Run live API review`.
5. Show the category observations, channel context, playlist review, endpoint audit trail, and generated report.
6. State that the demo uses public metadata only and does not use OAuth, uploads, private user data, `search.list`, or `videos.insert`.

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
