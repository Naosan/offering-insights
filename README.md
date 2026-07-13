# Offering Insights

Offering Insights is a public video source review workspace that turns selected public YouTube videos into source-backed planning briefs, evidence tables, category summaries, and a Three.js evidence map. Static product pages and the managed YouTube API endpoint are served by the same Node.js service.

Pages:

- `index.html` - public overview and product summary
- `app.html` - public-video planning brief builder
- `privacy.html` - privacy policy
- `terms.html` - terms of service
- `server.js` - bounded read-only YouTube API endpoint and static file server

Suggested form URLs after publishing:

- Main website / primary access URL: `https://offering-insights-141682939002.asia-northeast1.run.app/`
- Workspace URL: `https://offering-insights-141682939002.asia-northeast1.run.app/app.html`
- Privacy policy URL: `https://offering-insights-141682939002.asia-northeast1.run.app/privacy.html`
- Terms URL: `https://offering-insights-141682939002.asia-northeast1.run.app/terms.html`

The site intentionally does not publish the applicant's home address.

## Live analysis recording workflow

Use `app.html` to show the service workflow from selected videos to an exported planning brief.

Recommended recording flow:

1. Open the deployed Offering Insights workspace.
2. Set the brief name, use case, category region, and decision question.
3. Paste selected public video IDs, video URLs, or public playlist URLs into the public user input.
4. Click `Analyze public videos`. The browser sends only parsed public IDs and the category region to the managed endpoint; the API credential remains in server-side secret configuration.
5. Show the planning brief, quoted YouTube source cards, Three.js evidence map, source evidence table, category summary, channel context, optional public playlist context, API trace, generated report, and download action.
6. State that the workflow uses selected public metadata only, with no OAuth, uploads, private user data, `search.list`, or `videos.insert`.

The public build intentionally has no fabricated YouTube sample results. Output is shown only after a live API request, so displayed YouTube titles, thumbnails, categories, channels, and statistics remain attributable to the current API response.

## Local development

Set `YOUTUBE_API_KEY` in the process environment, then run:

```powershell
npm start
```

Open `http://localhost:8080/`. Run `npm test` for the server boundary tests.

## GitHub Pages publishing notes

This repository includes `.nojekyll` for the existing GitHub Pages overview. Live analysis requires the managed Node.js service.

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
