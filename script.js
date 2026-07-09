const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

const endpointCosts = {
  "youtube.videoCategories.list": 1,
  "youtube.videos.list": 1,
  "youtube.channels.list": 1,
  "youtube.playlistItems.list": 1
};

const sampleReview = {
  source: "sample",
  videos: [
    {
      title: "Sample explainer: neural network foundations",
      channelTitle: "Public Math Learning Channel",
      categoryId: "27",
      categoryName: "Education",
      publishedAt: "2026-06-20T10:00:00Z",
      viewCount: 23600000,
      likeCount: 620000
    },
    {
      title: "Sample talk: how practice shapes learning",
      channelTitle: "Public Conference Channel",
      categoryId: "28",
      categoryName: "Science & Technology",
      publishedAt: "2026-06-22T08:30:00Z",
      viewCount: 2200000,
      likeCount: 58000
    },
    {
      title: "Sample explainer: why complex systems are difficult to explain",
      channelTitle: "Public Explainer Channel",
      categoryId: "27",
      categoryName: "Education",
      publishedAt: "2026-06-25T13:45:00Z",
      viewCount: 12300000,
      likeCount: 410000
    }
  ],
  channels: [
    {
      title: "Public Math Learning Channel",
      description: "Public channel metadata sample for category-specific reporting.",
      subscriberCount: 6700000,
      videoCount: 180
    },
    {
      title: "Public Conference Channel",
      description: "Public channel metadata sample for technology and education coverage.",
      subscriberCount: 25000000,
      videoCount: 5200
    }
  ],
  playlistItems: [
    {
      title: "Sample playlist item: category review follow-up",
      videoId: "sample-video-a",
      channelTitle: "Public Math Learning Channel"
    },
    {
      title: "Sample playlist item: related public explainer",
      videoId: "sample-video-b",
      channelTitle: "Public Math Learning Channel"
    }
  ],
  endpointLog: [
    {
      name: "youtube.videoCategories.list",
      detail: "Sample category labels used to separate Education from Science & Technology.",
      cost: 1
    },
    {
      name: "youtube.videos.list",
      detail: "Sample public metadata for the selected video cohort.",
      cost: 1
    },
    {
      name: "youtube.channels.list",
      detail: "Sample public channel context for cohort comparison.",
      cost: 1
    },
    {
      name: "youtube.playlistItems.list",
      detail: "Sample public playlist membership for adjacent upload context.",
      cost: 1
    }
  ]
};

const elements = {
  apiKey: document.getElementById("api-key"),
  videoIds: document.getElementById("video-ids"),
  runLive: document.getElementById("run-live"),
  loadSample: document.getElementById("load-sample"),
  clearKey: document.getElementById("clear-key"),
  apiState: document.getElementById("api-state"),
  metricVideos: document.getElementById("metric-videos"),
  metricChannels: document.getElementById("metric-channels"),
  metricQuota: document.getElementById("metric-quota"),
  metricEndpoint: document.getElementById("metric-endpoint"),
  briefMode: document.getElementById("brief-mode"),
  briefResult: document.getElementById("brief-result"),
  categoryLabel: document.getElementById("category-label"),
  videoTable: document.getElementById("video-table"),
  channelList: document.getElementById("channel-list"),
  playlistList: document.getElementById("playlist-list"),
  endpointLog: document.getElementById("endpoint-log"),
  reportOutput: document.getElementById("report-output"),
  copyReport: document.getElementById("copy-report"),
  copyStatus: document.getElementById("copy-status")
};

function setStatus(message, tone = "neutral") {
  elements.apiState.textContent = message;
  elements.apiState.dataset.tone = tone;
}

function formatNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString("en-US") : "0";
}

function formatDate(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function extractVideoIds(raw) {
  const matches = String(raw || "").match(/[A-Za-z0-9_-]{11}/g) || [];
  return [...new Set(matches)].slice(0, 20);
}

function buildApiUrl(path, params) {
  const url = new URL(`${YOUTUBE_API_BASE}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url;
}

async function requestYouTube(endpointName, path, params, endpointLog) {
  const url = buildApiUrl(path, params);
  const safeParams = { ...params };
  delete safeParams.key;

  const response = await fetch(url);
  if (!response.ok) {
    let message = `${endpointName} returned HTTP ${response.status}`;
    try {
      const errorPayload = await response.json();
      message = errorPayload?.error?.message || message;
    } catch {
      // Keep the HTTP-level message when the body is not JSON.
    }
    throw new Error(message);
  }

  endpointLog.push({
    name: endpointName,
    detail: Object.entries(safeParams).map(([key, value]) => `${key}=${value}`).join(", "),
    cost: endpointCosts[endpointName] || 0
  });

  return response.json();
}

function uploadsPlaylistForChannel(channelId) {
  return channelId && channelId.startsWith("UC") ? `UU${channelId.slice(2)}` : "";
}

function normalizeVideo(item, categoryMap) {
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
    commentCount: Number(item.statistics?.commentCount || 0)
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

async function runLiveReview() {
  const apiKey = elements.apiKey.value.trim();
  const videoIds = extractVideoIds(elements.videoIds.value);

  if (!apiKey) {
    setStatus("Enter a YouTube Data API key before running the live review.", "warning");
    return;
  }

  if (!videoIds.length) {
    setStatus("Enter at least one public YouTube video ID or URL.", "warning");
    return;
  }

  elements.runLive.disabled = true;
  setStatus("Calling YouTube Data API Services with read-only endpoints...", "neutral");

  const endpointLog = [];

  try {
    const categoriesPayload = await requestYouTube(
      "youtube.videoCategories.list",
      "videoCategories",
      { part: "snippet", regionCode: "JP", key: apiKey },
      endpointLog
    );
    const categoryMap = Object.fromEntries(
      (categoriesPayload.items || []).map(item => [item.id, item.snippet?.title || `Category ${item.id}`])
    );

    const videosPayload = await requestYouTube(
      "youtube.videos.list",
      "videos",
      { part: "snippet,statistics,contentDetails", id: videoIds.join(","), key: apiKey },
      endpointLog
    );
    const videos = (videosPayload.items || []).map(item => normalizeVideo(item, categoryMap));

    if (!videos.length) {
      throw new Error("No public video metadata was returned for the supplied IDs.");
    }

    const channelIds = [...new Set(videos.map(video => video.channelId).filter(Boolean))];
    const channelsPayload = await requestYouTube(
      "youtube.channels.list",
      "channels",
      { part: "snippet,statistics", id: channelIds.join(","), key: apiKey },
      endpointLog
    );
    const channels = (channelsPayload.items || []).map(normalizeChannel);

    let playlistItems = [];
    const firstUploadsPlaylist = uploadsPlaylistForChannel(channelIds[0]);
    if (firstUploadsPlaylist) {
      try {
        const playlistPayload = await requestYouTube(
          "youtube.playlistItems.list",
          "playlistItems",
          { part: "snippet,contentDetails", playlistId: firstUploadsPlaylist, maxResults: "5", key: apiKey },
          endpointLog
        );
        playlistItems = (playlistPayload.items || []).map(normalizePlaylistItem);
      } catch (error) {
        endpointLog.push({
          name: "youtube.playlistItems.list",
          detail: `Attempted derived uploads playlist ${firstUploadsPlaylist}; ${error.message}`,
          cost: endpointCosts["youtube.playlistItems.list"]
        });
      }
    }

    renderReview({
      source: "live",
      videos,
      channels,
      playlistItems,
      endpointLog
    });
    setStatus("Live API review completed. The dashboard now shows the selected cohort, category observations, and endpoint evidence.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    elements.runLive.disabled = false;
  }
}

function summarizeByCategory(videos) {
  const groups = new Map();

  videos.forEach(video => {
    const group = groups.get(video.categoryName) || {
      categoryName: video.categoryName,
      videos: [],
      channels: new Set(),
      views: 0,
      likes: 0
    };
    group.videos.push(video);
    group.channels.add(video.channelTitle);
    group.views += video.viewCount;
    group.likes += video.likeCount;
    groups.set(video.categoryName, group);
  });

  return [...groups.values()].map(group => {
    const topVideo = [...group.videos].sort((a, b) => b.viewCount - a.viewCount)[0];
    const averageViews = Math.round(group.views / Math.max(group.videos.length, 1));
    return {
      categoryName: group.categoryName,
      count: group.videos.length,
      channelCount: group.channels.size,
      averageViews,
      topVideo
    };
  }).sort((a, b) => b.count - a.count || b.averageViews - a.averageViews);
}

function renderReview(review) {
  const categorySummaries = summarizeByCategory(review.videos);
  const quotaEstimate = review.endpointLog.reduce((total, item) => total + (item.cost || 0), 0);

  elements.metricVideos.textContent = formatNumber(review.videos.length);
  elements.metricChannels.textContent = formatNumber(review.channels.length);
  elements.metricQuota.textContent = formatNumber(quotaEstimate);
  elements.metricEndpoint.textContent = "videos.list";
  elements.categoryLabel.textContent = review.source === "live" ? "Live API results" : "Sample data";
  elements.briefMode.textContent = review.source === "live" ? "Live API deliverable" : "Sample deliverable";
  renderBriefResult(review, categorySummaries, quotaEstimate);

  elements.videoTable.innerHTML = categorySummaries.map(summary => `
    <tr>
      <td>
        <strong>${escapeHtml(summary.categoryName)}</strong>
        <div class="muted-line">${formatNumber(summary.count)} sampled video${summary.count === 1 ? "" : "s"}</div>
      </td>
      <td>
        ${escapeHtml(summary.topVideo.title)}
        <div class="muted-line">${escapeHtml(summary.topVideo.channelTitle)} - ${formatDate(summary.topVideo.publishedAt)}</div>
      </td>
      <td>
        <span class="signal">${formatNumber(summary.averageViews)} avg views</span>
        <span class="signal">${formatNumber(summary.channelCount)} channel${summary.channelCount === 1 ? "" : "s"}</span>
        <span class="signal">category metadata mapped</span>
      </td>
    </tr>
  `).join("");

  elements.channelList.innerHTML = review.channels.length ? review.channels.map(channel => `
    <article>
      <strong>${escapeHtml(channel.title)}</strong>
      <p>${formatNumber(channel.subscriberCount)} subscribers - ${formatNumber(channel.videoCount)} public videos</p>
    </article>
  `).join("") : `
    <article>
      <strong>No channel records returned</strong>
      <p>The selected videos did not expose channel IDs for channels.list.</p>
    </article>
  `;

  elements.playlistList.innerHTML = review.playlistItems.length ? review.playlistItems.slice(0, 5).map(item => `
    <article>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.channelTitle)} - ${escapeHtml(item.videoId || "no video id")}</p>
    </article>
  `).join("") : `
    <article>
      <strong>No playlist items displayed</strong>
      <p>The derived public uploads playlist did not return displayable items for this sample.</p>
    </article>
  `;

  elements.endpointLog.innerHTML = review.endpointLog.map(item => `
    <li>
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.detail)} - estimated quota cost ${formatNumber(item.cost)}</span>
    </li>
  `).join("");

  elements.reportOutput.textContent = buildReport(review, categorySummaries, quotaEstimate);
}

function renderBriefResult(review, categorySummaries, quotaEstimate) {
  const primary = categorySummaries[0];
  const categoryCount = categorySummaries.length;
  const videoCount = review.videos.length;
  const channelCount = review.channels.length;
  const endpointCount = review.endpointLog.length;

  if (!primary) {
    elements.briefResult.innerHTML = `
      <article>
        <span>Primary category</span>
        <strong>Waiting for source review</strong>
        <p>Run the live API review to create an evidence-backed category brief.</p>
      </article>
      <article>
        <span>Service output</span>
        <strong>Category brief with audit trail</strong>
        <p>The brief is generated from public YouTube metadata and includes the API methods used.</p>
      </article>
      <article>
        <span>Next action</span>
        <strong>Export review note</strong>
        <p>Copy the generated report for the YouTube API Services review response or internal notes.</p>
      </article>
    `;
    return;
  }

  const concentration = Math.round((primary.count / Math.max(videoCount, 1)) * 100);
  const topChannel = review.channels
    .slice()
    .sort((a, b) => b.subscriberCount - a.subscriberCount)[0];
  const playlistNote = review.playlistItems.length
    ? `${review.playlistItems.length} public playlist item${review.playlistItems.length === 1 ? "" : "s"} sampled from the first channel.`
    : "No public playlist items were returned for the sampled channel.";

  elements.briefResult.innerHTML = `
    <article>
      <span>Primary category</span>
      <strong>${escapeHtml(primary.categoryName)} leads this source set.</strong>
      <p>${formatNumber(primary.count)} of ${formatNumber(videoCount)} selected videos fall in this category, representing ${formatNumber(concentration)}% of the current cohort.</p>
    </article>
    <article>
      <span>Coverage evidence</span>
      <strong>${formatNumber(categoryCount)} categories and ${formatNumber(channelCount)} public channels reviewed.</strong>
      <p>Top public channel context: ${escapeHtml(topChannel?.title || "No channel returned")}. ${escapeHtml(playlistNote)}</p>
    </article>
    <article>
      <span>Exportable output</span>
      <strong>Brief generated with ${formatNumber(quotaEstimate)} estimated quota units.</strong>
      <p>The report below cites ${formatNumber(endpointCount)} read-only API call${endpointCount === 1 ? "" : "s"} and keeps the boundary to public metadata.</p>
    </article>
  `;
}

function buildReport(review, categorySummaries, quotaEstimate) {
  const mode = review.source === "live" ? "Live YouTube Data API run" : "Sample data demonstration";
  const categoryLines = categorySummaries.map(summary => (
    `- ${summary.categoryName}: ${summary.count} sampled video(s), ${summary.channelCount} channel(s), average public views ${formatNumber(summary.averageViews)}. Top sample: "${summary.topVideo.title}".`
  ));
  const endpointLines = review.endpointLog.map(item => (
    `- ${item.name}: ${item.detail || "read-only public metadata lookup"}`
  ));

  return [
    "Offering Insights category-specific observation report",
    "Service outcome: Build a category brief from operator-selected public YouTube videos.",
    "Review question: How do selected public videos compare across YouTube categories, and which public channel signals help explain that distribution?",
    `Mode: ${mode}`,
    "Data boundary: public YouTube metadata only; no OAuth, no private user data, no uploads, no comment moderation.",
    "Input method: operator-selected public video IDs or URLs; no youtube.search.list keyword lookup.",
    `Videos sampled: ${review.videos.length}`,
    `Channels reviewed: ${review.channels.length}`,
    `Estimated quota units for this review: ${quotaEstimate}`,
    "",
    "Endpoints demonstrated:",
    ...endpointLines,
    "",
    "Category observations:",
    ...categoryLines,
    "",
    "Reporting use case:",
    "The dashboard supports editorial and research planning by comparing a deliberately selected cohort, grouping returned videos by YouTube category, adding public channel context, reviewing adjacent public playlist membership, and producing a concise observation report."
  ].join("\n");
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(elements.reportOutput.textContent);
    elements.copyStatus.textContent = "Copied.";
  } catch {
    elements.copyStatus.textContent = "Copy failed.";
  }
}

elements.runLive?.addEventListener("click", runLiveReview);
elements.loadSample?.addEventListener("click", () => {
  renderReview(sampleReview);
  setStatus("Sample public video cohort loaded. Use the live API run for screencast evidence.", "warning");
});
elements.clearKey?.addEventListener("click", () => {
  elements.apiKey.value = "";
  setStatus("API key field cleared.", "neutral");
});
elements.copyReport?.addEventListener("click", copyReport);

renderReview(sampleReview);
