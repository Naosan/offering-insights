# Offering Insights

Offering Insights is a public video source review workspace that displays current public metadata for user-selected YouTube videos and pairs it with a planning note written by the user. It provides source cards, a source-by-source metadata register, an API trace, and a Three.js map of one-to-one video/category/channel relationships. It does not aggregate categories, rank or score sources, identify trends, or generate recommendations from YouTube API Data.

Pages:

- `index.html` - public overview and product summary
- `app.html` - public-video source review and user-authored note workspace
- `privacy.html` - privacy policy
- `terms.html` - terms of service
- `server.js` - bounded read-only YouTube API endpoint and static file server

Suggested form URLs after publishing:

- Main website / primary access URL: `https://offering-insights-141682939002.asia-northeast1.run.app/`
- Workspace URL: `https://offering-insights-141682939002.asia-northeast1.run.app/app.html`
- Privacy policy URL: `https://offering-insights-141682939002.asia-northeast1.run.app/privacy.html`
- Terms URL: `https://offering-insights-141682939002.asia-northeast1.run.app/terms.html`

The site intentionally does not publish the applicant's home address.

## Live metadata recording workflow

Use `app.html` to show the service workflow from selected videos to an exported user-authored source review note.

Recommended recording flow:

1. Open the deployed Offering Insights workspace.
2. Set the note name, use case, category region, review question, and an optional user-authored planning note.
3. Paste selected public video IDs, video URLs, or public playlist URLs into the public user input.
4. Click `Retrieve public metadata`. The browser sends only parsed public IDs and the category region to the managed endpoint; the API credential remains in server-side secret configuration.
5. Show the source review result, quoted YouTube source cards, one-to-one Three.js source map, source evidence table, category label for each source, channel context, optional public playlist context, API trace, exportable note, and download action.
6. State that the workflow uses selected public metadata only, with no OAuth, uploads, private user data, `search.list`, or `videos.insert`.
7. State that Offering Insights does not aggregate category data or generate a ranking, score, trend, candidate angle, or recommendation; the review question and planning note are entered by the user.

The public build intentionally has no fabricated YouTube sample results. Output is shown only after a live API request, so displayed YouTube titles, thumbnails, categories, channels, and statistics remain attributable to the current API response.

## Data lifecycle

- This API Client uses one Google Cloud API Project: `141682939002`.
- Each metadata lookup retrieves fresh Non-Authorized Data from read-only YouTube Data API list methods.
- Selected source IDs and API responses are not persisted in an application database, server-side cache, or application log.
- API responses use `Cache-Control: no-store`; browser results are replaced by the next lookup and clear when the page reloads or closes.
- The in-memory abuse limiter stores an instance-specific HMAC address key for no more than 10 minutes.
- Google Cloud standard request logs exclude request bodies and API responses and use the project's 30-day default retention.

## Local development

Set `YOUTUBE_API_KEY` in the process environment, then run:

```powershell
npm start
```

Open `http://localhost:8080/`. Run `npm test` for the server boundary tests.

## GitHub Pages publishing notes

This repository includes `.nojekyll` for the existing GitHub Pages overview. Live metadata retrieval requires the managed Node.js service.

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
