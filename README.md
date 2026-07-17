# Offering Insights

Offering Insights is a public video research workspace that displays current public metadata for user-selected YouTube videos and pairs each source with notes written by the user. It provides a research setup, source URL recognition, source cards, per-source takeaways and follow-up checks, a working conclusion, local project save/reopen, an API trace, and a Three.js map of one-to-one video/category/channel relationships. It does not aggregate categories, rank or score sources, identify trends, or generate recommendations from YouTube API Data.

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

Use `app.html` to show the service workflow from selected videos to an exported user-authored research note.

Recommended recording flow:

1. Open the deployed Offering Insights workspace.
2. Set a research title, research type, topic, and question.
3. Paste selected public video IDs, video URLs, or public playlist URLs. Confirm that the source chips identify the intended inputs.
4. Accept the Privacy Policy and Terms, then click `Load source details`. The browser sends only parsed public IDs and the category region to the managed endpoint; the API credential remains in server-side secret configuration.
5. Open each cited YouTube source and write a key takeaway and follow-up check beside its current public metadata.
6. Write a working conclusion, use the optional one-to-one source map, and inspect the folded channel, playlist, and API trace details when needed.
7. Copy or download the research note with its cited source links and user-authored fields.
8. Optionally save the project JSON, reopen it, and show that research settings, selected IDs, and user notes return without restoring YouTube metadata. Accept the terms and run `Load source details` to retrieve current metadata again.
9. State that the workflow uses selected public metadata only, with no OAuth, uploads, private user data, `search.list`, or `videos.insert`.
10. State that Offering Insights does not aggregate category data or generate a ranking, score, trend, candidate angle, or recommendation; the research topic, question, source notes, follow-up checks, and conclusion are entered by the user.

The public build intentionally has no fabricated YouTube sample results. Output is shown only after a live API request, so displayed YouTube titles, thumbnails, categories, channels, and statistics remain attributable to the current API response.

## Data lifecycle

- This API Client uses one Google Cloud API Project: `141682939002`.
- Each metadata lookup retrieves fresh Non-Authorized Data from read-only YouTube Data API list methods.
- Selected source IDs and API responses are not persisted in an application database, server-side cache, or application log.
- API responses use `Cache-Control: no-store`; browser results are replaced by the next lookup and clear when the page reloads or closes.
- A user-initiated local project file contains selected source IDs, research settings, and user-authored notes only. It excludes YouTube titles, thumbnails, categories, channels, statistics, endpoint traces, and API responses.
- Project files are opened locally in the browser and are not uploaded. Opening a project resets consent and requires a fresh metadata lookup before API Data is displayed.
- The in-memory abuse limiter stores an instance-specific HMAC address key for no more than 10 minutes.
- Google Cloud standard request logs exclude request bodies and API responses and use the project's 30-day default retention.

## Local development

Set `YOUTUBE_API_KEY` in the process environment, then run:

```powershell
npm start
```

Open `http://localhost:8080/`. Run `npm test` for the server boundary tests.

`YOUTUBE_API_KEY` must accept server-side requests. A key restricted to HTTP browser referrers returns `403` because the managed Node.js service does not issue a browser referrer. Keep the key in server configuration and restrict its API scope to YouTube Data API v3. The public deployment reads its working credential from managed secret configuration.

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
