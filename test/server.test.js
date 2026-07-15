import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createOfferingInsightsServer } from "../server.js";

const servers = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise(resolve => server.close(resolve))));
});

async function startServer(options = {}) {
  const server = createOfferingInsightsServer(options);
  servers.push(server);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

function mockYouTubeFetch(secret) {
  return async (url, options) => {
    assert.equal(options.headers["X-Goog-Api-Key"], secret);
    assert.equal(url.searchParams.has("key"), false);

    if (url.pathname.endsWith("/videoCategories")) {
      return Response.json({ items: [{ id: "27", snippet: { title: "Education" } }] });
    }
    if (url.pathname.endsWith("/videos")) {
      return Response.json({
        items: [{
          id: "dQw4w9WgXcQ",
          snippet: {
            title: "Public source",
            channelId: "channel-1",
            channelTitle: "Example channel",
            categoryId: "27",
            publishedAt: "2026-01-01T00:00:00Z",
            thumbnails: { high: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" } }
          },
          statistics: { viewCount: "120", likeCount: "4", commentCount: "1" },
          status: { privacyStatus: "public" }
        }]
      });
    }
    if (url.pathname.endsWith("/channels")) {
      return Response.json({
        items: [{
          id: "channel-1",
          snippet: { title: "Example channel", description: "Public channel" },
          statistics: { subscriberCount: "25", videoCount: "8", viewCount: "500" }
        }]
      });
    }
    throw new Error(`Unexpected YouTube path: ${url.pathname}`);
  };
}

test("analyzes a bounded public source set without exposing the API key", async () => {
  const secret = "server-only-test-key";
  const baseUrl = await startServer({ apiKey: secret, fetchImpl: mockYouTubeFetch(secret) });

  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoIds: ["dQw4w9WgXcQ"], playlistIds: [], regionCode: "JP" })
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.videos[0].categoryName, "Education");
  assert.equal(payload.channels[0].title, "Example channel");
  assert.deepEqual(payload.endpointLog.map(item => item.name), [
    "youtube.videoCategories.list",
    "youtube.videos.list",
    "youtube.channels.list"
  ]);
  assert.equal(JSON.stringify(payload).includes(secret), false);
});

test("rejects invalid or oversized analysis input before calling YouTube", async () => {
  let calls = 0;
  const baseUrl = await startServer({
    apiKey: "test-key",
    fetchImpl: async () => {
      calls += 1;
      return Response.json({ items: [] });
    }
  });

  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoIds: ["not-a-video-id"], playlistIds: [], regionCode: "JP" })
  });

  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("rejects unapproved browser origins and does not serve source files", async () => {
  const baseUrl = await startServer({ apiKey: "test-key" });
  const originResponse = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://unapproved.example"
    },
    body: JSON.stringify({ videoIds: ["dQw4w9WgXcQ"], playlistIds: [], regionCode: "JP" })
  });
  const sourceResponse = await fetch(`${baseUrl}/server.js`);

  assert.equal(originResponse.status, 403);
  assert.equal(sourceResponse.status, 404);
});

test("reports service health without exposing configuration", async () => {
  const baseUrl = await startServer({ apiKey: "test-key" });
  const response = await fetch(`${baseUrl}/api/health`);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload, { ok: true });
});

test("publishes explicit API data handling and retention disclosures", async () => {
  const baseUrl = await startServer({ apiKey: "test-key" });
  const response = await fetch(`${baseUrl}/privacy.html`);
  const policy = await response.text();

  assert.equal(response.status, 200);
  assert.match(policy, /exactly one Google Cloud API Project/i);
  assert.match(policy, /141682939002/);
  assert.match(policy, /Every analysis makes new read-only YouTube Data API requests/i);
  assert.match(policy, /does not maintain an API Data database or cache/i);
  assert.match(policy, /retained for 30 days/i);
  assert.match(policy, /within 7 calendar days/i);
});
