# Offering Insights

This is a static prototype for Offering Insights, a public video source review workspace that turns selected public YouTube videos into source-backed planning briefs, evidence tables, category summaries, and a Three.js evidence map.

Pages:

- `index.html` - public overview and product summary
- `app.html` - public-video planning brief builder with separate developer review setup
- `privacy.html` - privacy policy
- `terms.html` - terms of service

Suggested form URLs after publishing:

- Main website / primary access URL: `https://<host>/`
- Privacy policy URL: `https://<host>/privacy.html`
- Terms URL: `https://<host>/terms.html`

The site intentionally does not publish the applicant's home address.

## Live analysis recording workflow

Use `app.html` to show the service workflow from selected videos to an exported planning brief.

Recommended recording flow:

1. Open `https://naosan.github.io/offering-insights/app.html`.
2. Set the brief name, use case, category region, and decision question.
3. Open `Developer review setup` and activate the existing project API key once for the current page session.
4. Paste selected public video IDs, video URLs, or public playlist URLs into the public user input.
5. Click `Analyze public videos`.
6. Show the planning brief, quoted YouTube source cards, Three.js evidence map, source evidence table, category summary, channel context, optional public playlist context, API trace, generated report, and download action.
7. State that the project key is not generated per visitor or per analysis and that the workflow uses selected public metadata only, with no OAuth, uploads, private user data, `search.list`, or `videos.insert`.

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
