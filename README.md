# Offering Insights

This is a static prototype for Offering Insights, a category-backed research workspace that turns selected public YouTube videos into category briefs, source evidence, and a Three.js brainstorm map.

Pages:

- `index.html` - public overview and product summary
- `app.html` - live browser-only category brief builder
- `privacy.html` - privacy policy
- `terms.html` - terms of service

Suggested form URLs after publishing:

- Main website / primary access URL: `https://<host>/`
- Privacy policy URL: `https://<host>/privacy.html`
- Terms URL: `https://<host>/terms.html`

The site intentionally does not publish the applicant's home address.

## Live analysis recording workflow

Use `app.html` to show the service workflow from selected videos to exported planning brief.

Recommended recording flow:

1. Open `https://naosan.github.io/offering-insights/app.html`.
2. Set the brief name, use case, category region, and decision question.
3. Paste the YouTube Data API key into the browser-only API key field.
4. Keep the selected public video IDs or paste other public video URLs selected outside the API.
5. Click `Analyze selected videos`.
6. Show the research brief, quoted YouTube source cards, Three.js brainstorm map, source evidence table, category observations, channel context, adjacent uploads, transparency trail, generated report, and download action.
7. State that the workflow uses selected public metadata only and does not use OAuth, uploads, private user data, `search.list`, or `videos.insert`.

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
