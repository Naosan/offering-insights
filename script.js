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
      id: "aircAruvnKk",
      title: "Sample explainer: neural network foundations",
      channelTitle: "Public Math Learning Channel",
      categoryId: "27",
      categoryName: "Education",
      publishedAt: "2026-06-20T10:00:00Z",
      viewCount: 23600000,
      likeCount: 620000,
      thumbnailUrl: "https://i.ytimg.com/vi/aircAruvnKk/hqdefault.jpg"
    },
    {
      id: "IHZwWFHWa-w",
      title: "Sample talk: how practice shapes learning",
      channelTitle: "Public Conference Channel",
      categoryId: "28",
      categoryName: "Science & Technology",
      publishedAt: "2026-06-22T08:30:00Z",
      viewCount: 2200000,
      likeCount: 58000,
      thumbnailUrl: "https://i.ytimg.com/vi/IHZwWFHWa-w/hqdefault.jpg"
    },
    {
      id: "Ks-_Mh1QhMc",
      title: "Sample explainer: why complex systems are difficult to explain",
      channelTitle: "Public Explainer Channel",
      categoryId: "27",
      categoryName: "Education",
      publishedAt: "2026-06-25T13:45:00Z",
      viewCount: 12300000,
      likeCount: 410000,
      thumbnailUrl: "https://i.ytimg.com/vi/Ks-_Mh1QhMc/hqdefault.jpg"
    }
  ],
  channels: [
    {
      title: "Public Math Learning Channel",
      description: "Public channel metadata sample for learning-content planning.",
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
      title: "Sample playlist item: learning angle follow-up",
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
  briefTitle: document.getElementById("brief-title"),
  briefAudience: document.getElementById("brief-audience"),
  regionCode: document.getElementById("region-code"),
  decisionQuestion: document.getElementById("decision-question"),
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
  featuredVideo: document.getElementById("featured-video"),
  videoGallery: document.getElementById("video-gallery"),
  mindmapCanvas: document.getElementById("mindmap-canvas"),
  mindmapDetailTitle: document.getElementById("mindmap-detail-title"),
  mindmapDetailBody: document.getElementById("mindmap-detail-body"),
  brainstormList: document.getElementById("brainstorm-list"),
  categoryLabel: document.getElementById("category-label"),
  sourceTable: document.getElementById("source-table"),
  videoTable: document.getElementById("video-table"),
  channelList: document.getElementById("channel-list"),
  playlistList: document.getElementById("playlist-list"),
  endpointLog: document.getElementById("endpoint-log"),
  reportOutput: document.getElementById("report-output"),
  copyReport: document.getElementById("copy-report"),
  downloadReport: document.getElementById("download-report"),
  copyStatus: document.getElementById("copy-status"),
  navButtons: document.querySelectorAll(".nav-button[data-target]")
};

function getBriefConfig() {
  return {
    title: elements.briefTitle?.value.trim() || "AI learning video angle brief",
    audience: elements.briefAudience?.value || "learning brief",
    regionCode: elements.regionCode?.value || "JP",
    question: elements.decisionQuestion?.value.trim() || "Which learning angle and evidence should this video set support?"
  };
}

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

async function runLiveReview() {
  const apiKey = elements.apiKey.value.trim();
  const videoIds = extractVideoIds(elements.videoIds.value);
  const config = getBriefConfig();
  setActiveNavByTarget("live-api-title");

  if (!apiKey) {
    setStatus("Enter a YouTube Data API key before running the live analysis, or use the sample brief.", "warning");
    return;
  }

  if (!videoIds.length) {
    setStatus("Enter at least one public YouTube video ID or URL.", "warning");
    return;
  }

  elements.runLive.disabled = true;
  setStatus("Reading public YouTube metadata for the selected videos...", "neutral");

  const endpointLog = [];

  try {
    const categoriesPayload = await requestYouTube(
      "youtube.videoCategories.list",
      "videoCategories",
      { part: "snippet", regionCode: config.regionCode, key: apiKey },
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
      config,
      videos,
      channels,
      playlistItems,
      endpointLog
    });
    setStatus("Live analysis completed. The workspace now shows the selected cohort, category observations, source evidence, and transparency trail.", "success");
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
      topVideo,
      videos: group.videos
    };
  }).sort((a, b) => b.count - a.count || b.averageViews - a.averageViews);
}

function renderReview(review) {
  const categorySummaries = summarizeByCategory(review.videos);
  const quotaEstimate = review.endpointLog.reduce((total, item) => total + (item.cost || 0), 0);
  const config = review.config || getBriefConfig();

  elements.metricVideos.textContent = formatNumber(review.videos.length);
  elements.metricChannels.textContent = formatNumber(review.channels.length);
  elements.metricQuota.textContent = formatNumber(quotaEstimate);
  elements.metricEndpoint.textContent = "videos.list";
  elements.categoryLabel.textContent = review.source === "live" ? "Live video set" : "Sample video set";
  elements.briefMode.textContent = review.source === "live" ? "Live planning brief" : "Sample planning brief";
  renderBriefResult(review, categorySummaries, quotaEstimate, config);
  renderVideoSources(review, categorySummaries);
  updateMindmap(review, categorySummaries, config);

  elements.sourceTable.innerHTML = review.videos.map(video => `
    <tr>
      <td>
        <strong>${escapeHtml(video.title)}</strong>
        <div class="muted-line">${escapeHtml(video.id || "sample video")} - ${formatDate(video.publishedAt)}</div>
      </td>
      <td>${escapeHtml(video.categoryName)}</td>
      <td>${escapeHtml(video.channelTitle)}</td>
      <td>
        <span class="signal">${formatNumber(video.viewCount)} views</span>
        <span class="signal">${formatNumber(video.likeCount)} likes</span>
      </td>
    </tr>
  `).join("");

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

  elements.reportOutput.textContent = buildReport(review, categorySummaries, quotaEstimate, config);
}

function youtubeWatchUrl(videoId) {
  return videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : "https://www.youtube.com/";
}

function renderVideoSources(review, categorySummaries) {
  const videos = review.videos || [];
  const primaryCategory = categorySummaries[0]?.categoryName || "selected source set";
  const featured = categorySummaries[0]?.topVideo || videos[0];

  if (!videos.length || !featured?.id) {
    elements.featuredVideo.innerHTML = `
      <strong>Analyze videos to load a featured YouTube source.</strong>
      <p>Offering Insights shows public videos as cited sources for the generated learning brief.</p>
    `;
    elements.videoGallery.innerHTML = `
      <article>
        <strong>No video sources loaded</strong>
        <p>The source gallery is built from public video metadata returned by youtube.videos.list.</p>
      </article>
    `;
    return;
  }

  elements.featuredVideo.innerHTML = `
    <a class="featured-thumb" href="${escapeHtml(youtubeWatchUrl(featured.id))}" target="_blank" rel="noopener" aria-label="Open featured YouTube source">
      <img src="${escapeHtml(featured.thumbnailUrl || `https://i.ytimg.com/vi/${featured.id}/hqdefault.jpg`)}" alt="">
      <span>Open YouTube source</span>
    </a>
    <div>
      <span>Featured source for ${escapeHtml(primaryCategory)}</span>
      <strong>${escapeHtml(featured.title)}</strong>
      <p>${escapeHtml(featured.channelTitle)} - ${formatNumber(featured.viewCount)} public views - ${formatDate(featured.publishedAt)}</p>
      <a href="${escapeHtml(youtubeWatchUrl(featured.id))}" target="_blank" rel="noopener">Open source on YouTube</a>
    </div>
  `;

  elements.videoGallery.innerHTML = videos.map(video => `
    <article>
      <a class="video-thumb" href="${escapeHtml(youtubeWatchUrl(video.id))}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(video.title)} on YouTube">
        <img src="${escapeHtml(video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`)}" alt="">
      </a>
      <div>
        <span>${escapeHtml(video.categoryName)}</span>
        <strong>${escapeHtml(video.title)}</strong>
        <p>${escapeHtml(video.channelTitle)} - ${formatNumber(video.viewCount)} views</p>
      </div>
    </article>
  `).join("");
}

const mindmapState = {
  initialized: false,
  loading: false,
  THREE: null,
  scene: null,
  camera: null,
  renderer: null,
  group: null,
  nodes: [],
  raycaster: null,
  pointer: null,
  selected: null,
  animationFrame: null,
  data: null
};

async function ensureMindmap() {
  if (!elements.mindmapCanvas || mindmapState.initialized || mindmapState.loading) {
    return;
  }

  mindmapState.loading = true;
  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js");
    mindmapState.THREE = THREE;
    mindmapState.scene = new THREE.Scene();
    mindmapState.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
    mindmapState.camera.position.set(0, 0, 28);
    mindmapState.renderer = new THREE.WebGLRenderer({
      canvas: elements.mindmapCanvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    mindmapState.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mindmapState.group = new THREE.Group();
    mindmapState.scene.add(mindmapState.group);
    mindmapState.raycaster = new THREE.Raycaster();
    mindmapState.pointer = new THREE.Vector2();

    elements.mindmapCanvas.addEventListener("pointerdown", handleMindmapPointer);
    window.addEventListener("resize", resizeMindmap);
    resizeMindmap();
    mindmapState.initialized = true;
    animateMindmap();
  } catch (error) {
    elements.mindmapDetailTitle.textContent = "Mind map unavailable";
    elements.mindmapDetailBody.textContent = "Three.js could not be loaded. The source tables and generated report remain available.";
  } finally {
    mindmapState.loading = false;
  }
}

function updateMindmap(review, categorySummaries, config) {
  mindmapState.data = { review, categorySummaries, config };
  renderBrainstormDetail({
    type: "brief",
    label: config.title,
    detail: `${review.videos.length} selected public videos across ${categorySummaries.length} categories.`
  });

  ensureMindmap().then(() => {
    if (mindmapState.initialized) {
      buildMindmapScene(review, categorySummaries, config);
    }
  });
}

function resizeMindmap() {
  if (!mindmapState.renderer || !elements.mindmapCanvas) return;
  const rect = elements.mindmapCanvas.parentElement.getBoundingClientRect();
  const width = Math.max(Math.floor(rect.width), 320);
  const height = Math.max(Math.floor(rect.height), 360);
  mindmapState.renderer.setSize(width, height, false);
  mindmapState.camera.aspect = width / height;
  mindmapState.camera.updateProjectionMatrix();
}

function clearMindmapGroup() {
  const { group } = mindmapState;
  if (!group) return;
  while (group.children.length) {
    const child = group.children.pop();
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    }
  }
  mindmapState.nodes = [];
}

function buildMindmapScene(review, categorySummaries, config) {
  const THREE = mindmapState.THREE;
  if (!THREE || !mindmapState.group) return;

  clearMindmapGroup();

  const palette = {
    brief: 0x2563eb,
    category: 0x188267,
    video: 0xa36f00,
    channel: 0xc65f44
  };
  const center = addMindmapNode({
    label: "Brief",
    detail: config.title,
    type: "brief",
    position: new THREE.Vector3(0, 0, 0),
    color: palette.brief,
    scale: 1.25
  });

  const categoryRadius = 7.5;
  const videoRadius = 4.2;
  const channelRadius = 9.8;
  const totalCategories = Math.max(categorySummaries.length, 1);

  categorySummaries.forEach((summary, index) => {
    const angle = (index / totalCategories) * Math.PI * 2 - Math.PI / 2;
    const categoryPosition = new THREE.Vector3(
      Math.cos(angle) * categoryRadius,
      Math.sin(angle) * categoryRadius,
      Math.sin(angle * 1.7) * 1.2
    );
    const categoryNode = addMindmapNode({
      label: summary.categoryName,
      detail: `${summary.count} videos, average views ${formatNumber(summary.averageViews)}`,
      type: "category",
      position: categoryPosition,
      color: palette.category,
      scale: 0.95,
      summary
    });
    addMindmapLink(center.position, categoryNode.position, 0x9eb4c7);

    summary.videos.forEach((video, videoIndex) => {
      const offset = (videoIndex - (summary.videos.length - 1) / 2) * 0.78;
      const videoAngle = angle + offset;
      const videoPosition = new THREE.Vector3(
        categoryPosition.x + Math.cos(videoAngle) * videoRadius,
        categoryPosition.y + Math.sin(videoAngle) * videoRadius,
        categoryPosition.z + 1.1
      );
      const videoNode = addMindmapNode({
        label: truncateLabel(video.title, 24),
        detail: `${video.channelTitle} - ${formatNumber(video.viewCount)} public views`,
        type: "video",
        position: videoPosition,
        color: palette.video,
        scale: 0.68,
        video
      });
      addMindmapLink(categoryNode.position, videoNode.position, 0xd3b16a);
    });
  });

  review.channels.slice(0, 6).forEach((channel, index) => {
    const angle = (index / Math.max(review.channels.length, 1)) * Math.PI * 2 + Math.PI / 5;
    const channelPosition = new THREE.Vector3(
      Math.cos(angle) * channelRadius,
      Math.sin(angle) * channelRadius,
      -1.6
    );
    const channelNode = addMindmapNode({
      label: truncateLabel(channel.title, 20),
      detail: `${formatNumber(channel.subscriberCount)} subscribers, ${formatNumber(channel.videoCount)} public videos`,
      type: "channel",
      position: channelPosition,
      color: palette.channel,
      scale: 0.62,
      channel
    });
    addMindmapLink(center.position, channelNode.position, 0xe0b0a3);
  });
}

function truncateLabel(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function addMindmapNode({ label, detail, type, position, color, scale, summary, video, channel }) {
  const THREE = mindmapState.THREE;
  const geometry = new THREE.SphereGeometry(scale, 24, 16);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.08,
    emissive: color,
    emissiveIntensity: 0.08
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.userData = { label, detail, type, summary, video, channel };
  mindmapState.group.add(mesh);
  mindmapState.nodes.push(mesh);

  const labelSprite = makeLabelSprite(label, color);
  labelSprite.position.set(position.x, position.y - scale - 0.58, position.z);
  labelSprite.userData = { label, detail, type, summary, video, channel };
  mindmapState.group.add(labelSprite);

  return mesh;
}

function addMindmapLink(start, end, color) {
  const THREE = mindmapState.THREE;
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.68
  });
  const line = new THREE.Line(geometry, material);
  mindmapState.group.add(line);
}

function makeLabelSprite(text, color) {
  const THREE = mindmapState.THREE;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255, 255, 255, 0.94)";
  context.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
  context.lineWidth = 4;
  roundRect(context, 16, 24, 480, 72, 16);
  context.fill();
  context.stroke();
  context.fillStyle = "#17212b";
  context.font = "700 28px Inter, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 60, 440);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4.4, 1.1, 1);
  return sprite;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function handleMindmapPointer(event) {
  if (!mindmapState.renderer || !mindmapState.camera || !mindmapState.raycaster) return;
  const rect = elements.mindmapCanvas.getBoundingClientRect();
  mindmapState.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mindmapState.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  mindmapState.raycaster.setFromCamera(mindmapState.pointer, mindmapState.camera);
  const intersections = mindmapState.raycaster.intersectObjects(mindmapState.nodes, false);
  if (!intersections.length) return;

  const selected = intersections[0].object;
  mindmapState.selected = selected;
  mindmapState.nodes.forEach(node => {
    node.material.emissiveIntensity = node === selected ? 0.34 : 0.08;
  });
  renderBrainstormDetail(selected.userData);
}

function renderBrainstormDetail(data) {
  if (!data || !elements.mindmapDetailTitle) return;

  elements.mindmapDetailTitle.textContent = data.label || "Category brief";
  elements.mindmapDetailBody.textContent = data.detail || "Use the selected node as a prompt for the brief.";
  const prompts = brainstormPromptsFor(data);
  elements.brainstormList.innerHTML = prompts.map(prompt => `<li>${escapeHtml(prompt)}</li>`).join("");
}

function brainstormPromptsFor(data) {
  if (data.type === "category" && data.summary) {
    return [
      `Lead with ${data.summary.categoryName} if the brief needs a single learning lens.`,
      `Compare ${formatNumber(data.summary.count)} selected video${data.summary.count === 1 ? "" : "s"} against outlier categories.`,
      `Use average public views ${formatNumber(data.summary.averageViews)} as context, not as a private-user signal.`
    ];
  }

  if (data.type === "video" && data.video) {
    return [
      `Use "${data.video.title}" as a cited public source in the evidence section.`,
      `Check whether its category ${data.video.categoryName} matches the intended brief angle.`,
      `Open the YouTube source when the planner needs to inspect the original public video.`
    ];
  }

  if (data.type === "channel" && data.channel) {
    return [
      `Use ${data.channel.title} as channel context for source credibility.`,
      `Compare subscriber count and public video count with the other returned channels.`,
      `Keep the note limited to public channel metadata from channels.list.`
    ];
  }

  return [
    "Define the decision question before running the video analysis.",
    "Use category concentration to pick a lead angle.",
    "Use the transparency trail to explain how the brief was built."
  ];
}

function animateMindmap() {
  if (!mindmapState.renderer || !mindmapState.scene || !mindmapState.camera) return;
  mindmapState.animationFrame = requestAnimationFrame(animateMindmap);
  if (mindmapState.group) {
    mindmapState.group.rotation.y += 0.0022;
    mindmapState.group.rotation.x = Math.sin(Date.now() * 0.00025) * 0.08;
  }
  const THREE = mindmapState.THREE;
  if (THREE && !mindmapState.scene.userData.lit) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.78);
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(5, 8, 10);
    mindmapState.scene.add(ambient, key);
    mindmapState.scene.userData.lit = true;
  }
  mindmapState.renderer.render(mindmapState.scene, mindmapState.camera);
}

function renderBriefResult(review, categorySummaries, quotaEstimate, config) {
  const primary = categorySummaries[0];
  const categoryCount = categorySummaries.length;
  const videoCount = review.videos.length;
  const channelCount = review.channels.length;
  const endpointCount = review.endpointLog.length;

  if (!primary) {
    elements.briefResult.innerHTML = `
      <article>
        <span>Primary category</span>
        <strong>Waiting for video analysis</strong>
        <p>Analyze the selected videos to create an evidence-backed learning brief.</p>
      </article>
      <article>
        <span>Service output</span>
        <strong>Learning brief with source evidence</strong>
        <p>The brief is generated from public YouTube metadata and cited source cards.</p>
      </article>
      <article>
        <span>Next action</span>
        <strong>Export planning note</strong>
        <p>Copy the generated report for curriculum, editorial, or research planning notes.</p>
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
      <span>Answer</span>
      <strong>${escapeHtml(primary.categoryName)} leads this source set.</strong>
      <p>For ${escapeHtml(config.audience)}, emphasize this category first: ${formatNumber(primary.count)} of ${formatNumber(videoCount)} selected videos fall here, representing ${formatNumber(concentration)}% of the current cohort.</p>
    </article>
    <article>
      <span>Evidence</span>
      <strong>${formatNumber(categoryCount)} categories and ${formatNumber(channelCount)} public channels compared.</strong>
      <p>Top public channel context: ${escapeHtml(topChannel?.title || "No channel returned")}. ${escapeHtml(playlistNote)}</p>
    </article>
    <article>
      <span>Next action</span>
      <strong>Brief generated with ${formatNumber(quotaEstimate)} estimated quota units.</strong>
      <p>Export the brief for the question: ${escapeHtml(config.question)} It cites ${formatNumber(endpointCount)} read-only API call${endpointCount === 1 ? "" : "s"} in the transparency trail.</p>
    </article>
  `;
}

function buildReport(review, categorySummaries, quotaEstimate, config) {
  const mode = review.source === "live" ? "Live YouTube Data API analysis" : "Sample data demonstration";
  const categoryLines = categorySummaries.map(summary => (
    `- ${summary.categoryName}: ${summary.count} sampled video(s), ${summary.channelCount} channel(s), average public views ${formatNumber(summary.averageViews)}. Top sample: "${summary.topVideo.title}".`
  ));
  const endpointLines = review.endpointLog.map(item => (
    `- ${item.name}: ${item.detail || "read-only public metadata lookup"}`
  ));

  return [
    config.title,
    "Service outcome: Build a learning-content brief from selected public YouTube videos.",
    `Use case: ${config.audience}`,
    `Decision question: ${config.question}`,
    `Mode: ${mode}`,
    `Category region: ${config.regionCode}`,
    "Data boundary: public YouTube metadata only; no OAuth, no private user data, no uploads, no comment moderation.",
    "Input method: selected public video IDs or URLs; no keyword discovery is required for this workflow.",
    `Videos sampled: ${review.videos.length}`,
    `Channels compared: ${review.channels.length}`,
    `Estimated quota units for this analysis: ${quotaEstimate}`,
    "",
    "Endpoints demonstrated:",
    ...endpointLines,
    "",
    "Category observations:",
    ...categoryLines,
    "",
    "Source evidence:",
    ...review.videos.map(video => (
      `- ${video.title} | category=${video.categoryName} | channel=${video.channelTitle} | views=${formatNumber(video.viewCount)} | published=${formatDate(video.publishedAt)}`
    )),
    "",
    "Visual workspace:",
    "The page renders quoted YouTube source cards from public video thumbnails and links, then builds a Three.js brainstorm map from the same public metadata so a planner can explore categories, source videos, and channel context before exporting the brief.",
    "",
    "Planning use case:",
    "The dashboard supports learning-content planning by turning a selected public source list into a category brief, evidence table, transparency trail, and exportable observation report."
  ].join("\n");
}

function scrollToDashboardSection(targetId, button) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  setActiveNavByTarget(targetId, button);
  window.setTimeout(updateActiveNav, 500);
}

function setActiveNavByTarget(targetId, fallbackButton) {
  elements.navButtons.forEach(navButton => navButton.classList.remove("active"));
  const matchingButton = fallbackButton || Array.from(elements.navButtons).find(navButton => navButton.dataset.target === targetId);
  matchingButton?.classList.add("active");
}

function updateActiveNav() {
  if (!elements.navButtons.length) return;
  const entries = Array.from(elements.navButtons)
    .map(button => ({ button, target: document.getElementById(button.dataset.target) }))
    .filter(entry => entry.target);

  let activeEntry = entries[0];
  const pageBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8;
  if (pageBottom) {
    activeEntry = entries[entries.length - 1];
  }

  entries.forEach(entry => {
    if (!pageBottom && entry.target.getBoundingClientRect().top <= 132) {
      activeEntry = entry;
    }
  });

  entries.forEach(entry => entry.button.classList.toggle("active", entry === activeEntry));
}

let navUpdateQueued = false;

function queueActiveNavUpdate() {
  if (navUpdateQueued) return;
  navUpdateQueued = true;
  window.requestAnimationFrame(() => {
    navUpdateQueued = false;
    updateActiveNav();
  });
}

async function copyReport() {
  try {
    await navigator.clipboard.writeText(elements.reportOutput.textContent);
    elements.copyStatus.textContent = "Copied.";
  } catch {
    elements.copyStatus.textContent = "Copy failed.";
  }
}

function downloadReport() {
  const blob = new Blob([elements.reportOutput.textContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = `${getBriefConfig().title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "offering-insights-brief"}.txt`;
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  elements.copyStatus.textContent = "Download ready.";
}

elements.runLive?.addEventListener("click", runLiveReview);
elements.loadSample?.addEventListener("click", () => {
  setActiveNavByTarget("live-api-title");
  renderReview({ ...sampleReview, config: getBriefConfig() });
  setStatus("Sample public video cohort loaded. Use live analysis when you want current YouTube metadata.", "warning");
});
elements.clearKey?.addEventListener("click", () => {
  elements.apiKey.value = "";
  setStatus("API key field cleared.", "neutral");
});
elements.copyReport?.addEventListener("click", copyReport);
elements.downloadReport?.addEventListener("click", downloadReport);
elements.navButtons.forEach(button => {
  button.addEventListener("click", () => scrollToDashboardSection(button.dataset.target, button));
});
window.addEventListener("scroll", queueActiveNavUpdate, { passive: true });
window.addEventListener("resize", queueActiveNavUpdate);

renderReview({ ...sampleReview, config: getBriefConfig() });
updateActiveNav();
