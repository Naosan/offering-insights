import { createHmac, randomBytes } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const DEFAULT_PORT = Number(process.env.PORT || 8080);
const MAX_BODY_BYTES = 12 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const ALLOWED_REGIONS = new Set(["JP", "US", "GB"]);
const DEFAULT_ALLOWED_ORIGINS = ["https://naosan.github.io"];

const endpointCosts = {
  "youtube.videoCategories.list": 1,
  "youtube.videos.list": 1,
  "youtube.channels.list": 1,
  "youtube.playlistItems.list": 1
};

const staticFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/app.html", "app.html"],
  ["/privacy.html", "privacy.html"],
  ["/terms.html", "terms.html"],
  ["/script.js", "script.js"],
  ["/styles.css", "styles.css"],
  ["/assets/dashboard-preview.png", "assets/dashboard-preview.png"],
  ["/assets/developed-with-youtube.png", "assets/developed-with-youtube.png"]
]);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function setSecurityHeaders(response) {
  response.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self' https://cdn.jsdelivr.net",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
    "img-src 'self' data: https://i.ytimg.com https://*.ytimg.com",
    "object-src 'none'",
    "script-src 'self' https://cdn.jsdelivr.net",
    "style-src 'self'"
  ].join("; "));
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
}

function parseAllowedOrigins(value) {
  const configured = String(value || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function requestOriginIsAllowed(request, allowedOrigins) {
  const origin = request.headers.origin;
  if (!origin) return true;

  const host = request.headers.host;
  const sameOrigin = host && (origin === `https://${host}` || origin === `http://${host}`);
  return Boolean(sameOrigin || allowedOrigins.has(origin));
}

function applyCorsHeaders(request, response, allowedOrigins) {
  const origin = request.headers.origin;
  if (!origin) return;

  const host = request.headers.host;
  const sameOrigin = host && (origin === `https://${host}` || origin === `http://${host}`);
  if (sameOrigin || allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Vary", "Origin");
  }
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
}

async function readJsonBody(request) {
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Send the analysis input as application/json.");
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new HttpError(413, "The analysis request is too large.");
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new HttpError(400, "The analysis request contains invalid JSON.");
  }
}

function uniqueStrings(value) {
  return [...new Set(Array.isArray(value) ? value.map(item => String(item).trim()) : [])];
}

function validateAnalysisInput(payload) {
  const videoIds = uniqueStrings(payload.videoIds);
  const playlistIds = uniqueStrings(payload.playlistIds);
  const regionCode = String(payload.regionCode || "JP").toUpperCase();

  if (videoIds.length > 20) {
    throw new HttpError(400, "Analyze no more than 20 video IDs at a time.");
  }
  if (playlistIds.length > 3) {
    throw new HttpError(400, "Analyze no more than 3 public playlists at a time.");
  }
  if (videoIds.some(id => !/^[A-Za-z0-9_-]{11}$/.test(id))) {
    throw new HttpError(400, "One or more video IDs are invalid.");
  }
  if (playlistIds.some(id => !/^[A-Za-z0-9_-]{10,120}$/.test(id))) {
    throw new HttpError(400, "One or more playlist IDs are invalid.");
  }
  if (!ALLOWED_REGIONS.has(regionCode)) {
    throw new HttpError(400, "Category region must be JP, US, or GB.");
  }
  if (!videoIds.length && !playlistIds.length) {
    throw new HttpError(400, "Enter at least one public YouTube video or playlist.");
  }

  return { videoIds, playlistIds, regionCode };
}

function clientAddress(request) {
  return String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function createRateLimiter({
  now = Date.now,
  schedule = setTimeout,
  cancel = clearTimeout,
  keySecret = randomBytes(32)
} = {}) {
  const buckets = new Map();

  return request => {
    const timestamp = now();
    const addressKey = createHmac("sha256", keySecret)
      .update(clientAddress(request))
      .digest("hex");
    const bucket = buckets.get(addressKey);
    const recent = (bucket?.timestamps || []).filter(value => timestamp - value < RATE_LIMIT_WINDOW_MS);

    if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
      throw new HttpError(429, "Too many analysis requests. Please try again later.");
    }

    recent.push(timestamp);
    if (bucket?.expiryTimer) cancel(bucket.expiryTimer);

    const expiryTimer = schedule(() => buckets.delete(addressKey), RATE_LIMIT_WINDOW_MS);
    expiryTimer?.unref?.();
    buckets.set(addressKey, { timestamps: recent, expiryTimer });
  };
}

function buildApiUrl(path, params) {
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  return url;
}

async function readYouTube({ apiKey, endpointName, path, params, detail, endpointLog, fetchImpl }) {
  let response;
  try {
    response = await fetchImpl(buildApiUrl(path, params), {
      headers: {
        Accept: "application/json",
        "X-Goog-Api-Key": apiKey
      },
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    throw new HttpError(502, `${endpointName} could not be reached.`);
  }

  if (!response.ok) {
    const status = response.status === 429 ? 429 : 502;
    throw new HttpError(status, `${endpointName} did not return public metadata for this request.`);
  }

  endpointLog.push({
    name: endpointName,
    detail,
    cost: endpointCosts[endpointName] || 0
  });
  return response.json();
}

function normalizeVideo(item, categoryMap) {
  const thumbnails = item.snippet?.thumbnails || {};
  return {
    id: item.id,
    title: item.snippet?.title || "Untitled video",
    channelId: item.snippet?.channelId || "",
    channelTitle: item.snippet?.channelTitle || "Unknown channel",
    categoryId: item.snippet?.categoryId || "",
    categoryName: categoryMap[item.snippet?.categoryId] || `Category ${item.snippet?.categoryId || "unknown"}`,
    publishedAt: item.snippet?.publishedAt || "",
    viewCount: Number(item.statistics?.viewCount || 0),
    likeCount: Number(item.statistics?.likeCount || 0),
    commentCount: Number(item.statistics?.commentCount || 0),
    privacyStatus: item.status?.privacyStatus || "unknown",
    thumbnailUrl: thumbnails.maxres?.url || thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || ""
  };
}

function normalizeChannel(item) {
  return {
    id: item.id,
    title: item.snippet?.title || "Unknown channel",
    description: item.snippet?.description || "",
    subscriberCount: Number(item.statistics?.subscriberCount || 0),
    videoCount: Number(item.statistics?.videoCount || 0),
    viewCount: Number(item.statistics?.viewCount || 0)
  };
}

function normalizePlaylistItem(item) {
  return {
    title: item.snippet?.title || "Untitled playlist item",
    videoId: item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || "",
    channelTitle: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "Unknown channel",
    publishedAt: item.snippet?.publishedAt || ""
  };
}

async function analyzeSourceSet({ apiKey, input, fetchImpl }) {
  let videoIds = [...input.videoIds];
  let playlistItems = [];
  const endpointLog = [];

  if (input.playlistIds.length) {
    const playlistPayloads = await Promise.all(input.playlistIds.map(playlistId => readYouTube({
      apiKey,
      endpointName: "youtube.playlistItems.list",
      path: "playlistItems",
      params: { part: "snippet,contentDetails", playlistId, maxResults: "20" },
      detail: `public playlist input, maxResults=20`,
      endpointLog,
      fetchImpl
    })));
    playlistItems = playlistPayloads.flatMap(payload => (payload.items || []).map(normalizePlaylistItem));
    videoIds = [...new Set([...videoIds, ...playlistItems.map(item => item.videoId).filter(Boolean)])].slice(0, 20);
  }

  if (!videoIds.length) {
    throw new HttpError(404, "The supplied playlist did not return public video IDs to analyze.");
  }

  const categoriesPayload = await readYouTube({
    apiKey,
    endpointName: "youtube.videoCategories.list",
    path: "videoCategories",
    params: { part: "snippet", regionCode: input.regionCode },
    detail: `part=snippet, regionCode=${input.regionCode}`,
    endpointLog,
    fetchImpl
  });
  const categoryMap = Object.fromEntries(
    (categoriesPayload.items || []).map(item => [item.id, item.snippet?.title || `Category ${item.id}`])
  );

  const videosPayload = await readYouTube({
    apiKey,
    endpointName: "youtube.videos.list",
    path: "videos",
    params: { part: "snippet,statistics,contentDetails,status", id: videoIds.join(",") },
    detail: `public video IDs=${videoIds.length}, parts=snippet/statistics/contentDetails/status`,
    endpointLog,
    fetchImpl
  });
  const returnedVideos = (videosPayload.items || []).map(item => normalizeVideo(item, categoryMap));
  const videos = returnedVideos.filter(video => video.privacyStatus === "public");
  const excludedVideoCount = returnedVideos.length - videos.length;

  if (!videos.length) {
    throw new HttpError(404, "No public video metadata was returned for the supplied IDs.");
  }

  const channelIds = [...new Set(videos.map(video => video.channelId).filter(Boolean))];
  const channelsPayload = await readYouTube({
    apiKey,
    endpointName: "youtube.channels.list",
    path: "channels",
    params: { part: "snippet,statistics", id: channelIds.join(",") },
    detail: `public channel IDs=${channelIds.length}, parts=snippet/statistics`,
    endpointLog,
    fetchImpl
  });

  return {
    videos,
    channels: (channelsPayload.items || []).map(normalizeChannel),
    playlistItems,
    endpointLog,
    excludedVideoCount,
    fetchedAt: new Date().toISOString()
  };
}

async function serveStatic(request, response, pathname, rootDirectory) {
  const relativePath = staticFiles.get(pathname);
  if (!relativePath) return false;

  try {
    const body = await readFile(join(rootDirectory, relativePath));
    response.writeHead(200, {
      "Cache-Control": pathname.endsWith(".html") || pathname === "/" ? "no-cache" : "public, max-age=3600",
      "Content-Type": contentTypes[extname(relativePath)] || "application/octet-stream",
      "Content-Length": body.length
    });
    if (request.method === "HEAD") response.end();
    else response.end(body);
  } catch {
    sendJson(response, 404, { error: "Not found." });
  }
  return true;
}

export function createOfferingInsightsServer({
  apiKey = process.env.YOUTUBE_API_KEY,
  allowedOrigins = process.env.ALLOWED_ORIGINS,
  fetchImpl = globalThis.fetch,
  rootDirectory = process.cwd(),
  rateLimiter = createRateLimiter()
} = {}) {
  const secret = String(apiKey || "").trim();
  const origins = parseAllowedOrigins(allowedOrigins);

  return createHttpServer(async (request, response) => {
    setSecurityHeaders(response);

    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname === "/api/health" && request.method === "GET") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (pathname === "/api/analyze") {
      applyCorsHeaders(request, response, origins);
      if (!requestOriginIsAllowed(request, origins)) {
        sendJson(response, 403, { error: "This browser origin is not allowed." });
        return;
      }
      if (request.method === "OPTIONS") {
        response.writeHead(204, { "Cache-Control": "no-store" });
        response.end();
        return;
      }
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Use POST /api/analyze." });
        return;
      }

      try {
        if (!secret) throw new HttpError(503, "Live analysis is temporarily unavailable.");
        rateLimiter(request);
        const input = validateAnalysisInput(await readJsonBody(request));
        const result = await analyzeSourceSet({ apiKey: secret, input, fetchImpl });
        sendJson(response, 200, result);
      } catch (error) {
        const status = Number(error.status) || 500;
        const message = status >= 500 && !(error instanceof HttpError)
          ? "The analysis could not be completed."
          : error.message;
        sendJson(response, status, { error: message });
      }
      return;
    }

    if ((request.method === "GET" || request.method === "HEAD") && await serveStatic(request, response, pathname, rootDirectory)) {
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  });
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const server = createOfferingInsightsServer();
  server.listen(DEFAULT_PORT, "0.0.0.0", () => {
    console.log(`Offering Insights is listening on port ${DEFAULT_PORT}.`);
  });
}
