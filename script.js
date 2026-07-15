const MANAGED_SERVICE_ORIGIN = "https://offering-insights-141682939002.asia-northeast1.run.app";
const ANALYZE_API_URL = window.location.hostname === "naosan.github.io"
  ? `${MANAGED_SERVICE_ORIGIN}/api/analyze`
  : "/api/analyze";

const elements = {
  briefTitle: document.getElementById("brief-title"),
  briefAudience: document.getElementById("brief-audience"),
  regionCode: document.getElementById("region-code"),
  decisionQuestion: document.getElementById("decision-question"),
  planningNote: document.getElementById("planning-note"),
  videoIds: document.getElementById("video-ids"),
  runLive: document.getElementById("run-live"),
  termsConsent: document.getElementById("terms-consent"),
  apiState: document.getElementById("api-state"),
  metricSelection: document.getElementById("metric-selection"),
  metricData: document.getElementById("metric-data"),
  metricSearch: document.getElementById("metric-search"),
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
  navButtons: document.querySelectorAll(".nav-button[data-target]"),
  analysisOutputs: document.querySelectorAll(".analysis-output"),
  analysisNavButtons: document.querySelectorAll(".nav-button[data-requires-analysis]")
};

function getBriefConfig() {
  return {
    title: elements.briefTitle?.value.trim() || "Selected public video source review",
    audience: elements.briefAudience?.value || "source review",
    regionCode: elements.regionCode?.value || "JP",
    question: elements.decisionQuestion?.value.trim() || "What should I verify in each selected source before using it?",
    planningNote: elements.planningNote?.value.trim() || ""
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
  const text = String(raw || "");
  const ids = [];
  const urlPatterns = [
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/gi,
    /[?&]v=([A-Za-z0-9_-]{11})(?:[&#,\s]|$)/gi
  ];

  urlPatterns.forEach(pattern => {
    let match = pattern.exec(text);
    while (match) {
      ids.push(match[1]);
      match = pattern.exec(text);
    }
  });

  text.split(/[\s,]+/).forEach(token => {
    const candidate = token.trim().replace(/^["'(<[]+|["')>\].;]+$/g, "");
    if (/^[A-Za-z0-9_-]{11}$/.test(candidate)) ids.push(candidate);
  });

  return [...new Set(ids)].slice(0, 20);
}

function extractPlaylistIds(raw) {
  const text = String(raw || "");
  const ids = [];
  const listParamPattern = /[?&]list=([A-Za-z0-9_-]+)/g;
  let match = listParamPattern.exec(text);
  while (match) {
    ids.push(match[1]);
    match = listParamPattern.exec(text);
  }
  const directPattern = /\b(?:PL|UU|LL|RD|OLAK5uy_)[A-Za-z0-9_-]{10,}\b/g;
  const directMatches = text.match(directPattern) || [];
  return [...new Set([...ids, ...directMatches])].slice(0, 3);
}

async function runLiveReview() {
  const videoIds = extractVideoIds(elements.videoIds.value);
  const playlistIds = extractPlaylistIds(elements.videoIds.value);
  const config = getBriefConfig();
  setActiveNavByTarget("live-api-title");

  if (elements.termsConsent && !elements.termsConsent.checked) {
    setStatus("Review and accept the Privacy Policy and Terms before retrieving public YouTube metadata.", "warning");
    return;
  }

  if (!videoIds.length && !playlistIds.length) {
    setStatus("Enter at least one public YouTube video URL, video ID, or public playlist URL.", "warning");
    return;
  }

  elements.runLive.disabled = true;
  setStatus("Reading public YouTube metadata for the selected source set...", "neutral");

  try {
    const response = await fetch(ANALYZE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoIds, playlistIds, regionCode: config.regionCode })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Metadata service returned HTTP ${response.status}.`);
    }

    renderReview({
      source: "live",
      config,
      ...payload
    });
    const exclusionNote = payload.excludedVideoCount
      ? ` ${formatNumber(payload.excludedVideoCount)} non-public source${payload.excludedVideoCount === 1 ? " was" : "s were"} excluded.`
      : "";
    setStatus(`Fresh public metadata retrieved at ${formatTimestamp(new Date())}.${exclusionNote}`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    elements.runLive.disabled = false;
  }
}

let activeReviewState = null;

function renderReview(review) {
  const quotaEstimate = review.endpointLog.reduce((total, item) => total + (item.cost || 0), 0);
  const config = review.config || getBriefConfig();
  activeReviewState = { review, quotaEstimate, regionCode: config.regionCode };

  elements.analysisOutputs.forEach(output => {
    output.hidden = false;
  });
  elements.analysisNavButtons.forEach(button => {
    button.disabled = false;
  });

  elements.metricSelection.textContent = "User-selected";
  elements.metricData.textContent = "Public only";
  elements.metricSearch.textContent = "Not used";
  elements.metricEndpoint.textContent = "Read only";
  elements.categoryLabel.textContent = "YouTube-provided labels";
  elements.briefMode.textContent = "Fresh public metadata";
  renderBriefResult(review, config);
  renderVideoSources(review);
  updateMindmap(review, config);

  elements.sourceTable.innerHTML = review.videos.map(video => `
    <tr>
      <td>
        <strong>${escapeHtml(video.title)}</strong>
        <div class="muted-line">${escapeHtml(video.id || "unknown video")} - ${formatDate(video.publishedAt)}</div>
      </td>
      <td>${escapeHtml(video.categoryName)}</td>
      <td>${escapeHtml(video.channelTitle)}</td>
      <td>
        <span class="signal">${formatNumber(video.viewCount)} views</span>
        <span class="signal">${formatNumber(video.likeCount)} likes</span>
      </td>
    </tr>
  `).join("");

  elements.videoTable.innerHTML = review.videos.map(video => `
    <tr>
      <td>
        <strong>${escapeHtml(video.title)}</strong>
        <div class="muted-line">${escapeHtml(video.id || "unknown video")} - ${formatDate(video.publishedAt)}</div>
      </td>
      <td>
        <strong>${escapeHtml(video.categoryName)}</strong>
        <div class="muted-line">Category ID ${escapeHtml(video.categoryId || "unknown")} returned for this video</div>
      </td>
      <td>
        <strong>${escapeHtml(video.channelTitle)}</strong>
        <div class="muted-line"><a href="${escapeHtml(youtubeWatchUrl(video.id))}" target="_blank" rel="noopener">Open this source on YouTube</a></div>
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
      <strong>No public playlist URL included</strong>
      <p>Playlist items are displayed only when the selected source set includes a public playlist URL.</p>
    </article>
  `;

  elements.endpointLog.innerHTML = review.endpointLog.map(item => `
    <li>
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.detail)} - estimated quota cost ${formatNumber(item.cost)}</span>
    </li>
  `).join("");

  elements.reportOutput.textContent = buildReport(review, quotaEstimate, config);
}

function refreshUserAuthoredOutputs() {
  if (!activeReviewState) return;
  const config = {
    ...getBriefConfig(),
    regionCode: activeReviewState.regionCode
  };
  renderBriefResult(activeReviewState.review, config);
  elements.reportOutput.textContent = buildReport(
    activeReviewState.review,
    activeReviewState.quotaEstimate,
    config
  );
}

function youtubeWatchUrl(videoId) {
  return videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : "https://www.youtube.com/";
}

function renderVideoSources(review) {
  const videos = review.videos || [];
  const featured = videos[0];

  if (!videos.length || !featured?.id) {
    elements.featuredVideo.innerHTML = `
      <strong>Retrieve metadata to load a featured YouTube source.</strong>
      <p>Offering Insights shows public videos as cited sources for the user-authored planning note.</p>
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
    <a class="featured-thumb" href="${escapeHtml(youtubeWatchUrl(featured.id))}" target="_blank" rel="noopener" aria-label="Open first selected YouTube source">
      <img src="${escapeHtml(featured.thumbnailUrl || `https://i.ytimg.com/vi/${featured.id}/hqdefault.jpg`)}" alt="YouTube thumbnail for ${escapeHtml(featured.title)}">
      <span>Open YouTube source</span>
    </a>
    <div>
      <span>First selected source</span>
      <strong>${escapeHtml(featured.title)}</strong>
      <p>${escapeHtml(featured.channelTitle)} - ${formatNumber(featured.viewCount)} public views - ${formatDate(featured.publishedAt)}</p>
      <a href="${escapeHtml(youtubeWatchUrl(featured.id))}" target="_blank" rel="noopener">Open source on YouTube</a>
    </div>
  `;

  const remainingVideos = videos.slice(1);
  elements.videoGallery.innerHTML = remainingVideos.length ? remainingVideos.map(video => `
    <article>
      <a class="video-thumb" href="${escapeHtml(youtubeWatchUrl(video.id))}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(video.title)} on YouTube">
        <img src="${escapeHtml(video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`)}" alt="YouTube thumbnail for ${escapeHtml(video.title)}">
      </a>
      <div>
        <span>${escapeHtml(video.categoryName)}</span>
        <strong>${escapeHtml(video.title)}</strong>
        <p>${escapeHtml(video.channelTitle)} - ${formatNumber(video.viewCount)} views</p>
      </div>
    </article>
  `).join("") : `
    <article>
      <strong>One selected source</strong>
      <p>The featured source above is the complete selected source set for this lookup.</p>
    </article>
  `;
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

function updateMindmap(review, config) {
  mindmapState.data = { review, config };
  renderBrainstormDetail({
    type: "brief",
    label: config.title,
    detail: "Review each selected video independently, then write your own planning note."
  });

  ensureMindmap().then(() => {
    if (mindmapState.initialized) {
      buildMindmapScene(review, config);
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
  const halfExtent = 10.8;
  const halfFov = (mindmapState.camera.fov * Math.PI) / 360;
  const verticalDistance = halfExtent / Math.tan(halfFov);
  const horizontalDistance = verticalDistance / mindmapState.camera.aspect;
  mindmapState.camera.position.z = Math.max(verticalDistance, horizontalDistance);
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

function buildMindmapScene(review, config) {
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

  const visibleVideos = review.videos.slice(0, 6);
  const totalVideos = Math.max(visibleVideos.length, 1);
  const channelById = new Map(review.channels.map(channel => [channel.id, channel]));

  visibleVideos.forEach((video, index) => {
    const angle = (index / totalVideos) * Math.PI * 2 - Math.PI / 2;
    const videoPosition = new THREE.Vector3(
      Math.cos(angle) * 4.4,
      Math.sin(angle) * 4.4,
      Math.sin(angle * 1.4) * 0.8
    );
    const videoNode = addMindmapNode({
      label: truncateLabel(video.title, 24),
      detail: `${video.channelTitle} - ${formatNumber(video.viewCount)} public views`,
      type: "video",
      position: videoPosition,
      color: palette.video,
      scale: 0.72,
      video
    });
    addMindmapLink(center.position, videoNode.position, 0xd3b16a);

    const categoryAngle = angle - 0.13;
    const categoryPosition = new THREE.Vector3(
      Math.cos(categoryAngle) * 7.4,
      Math.sin(categoryAngle) * 7.4,
      1.1
    );
    const categoryNode = addMindmapNode({
      label: truncateLabel(video.categoryName, 20),
      detail: `YouTube category label returned for "${video.title}".`,
      type: "category",
      position: categoryPosition,
      color: palette.category,
      scale: 0.6,
      video
    });
    addMindmapLink(videoNode.position, categoryNode.position, 0x9eb4c7);

    const channel = channelById.get(video.channelId) || {
      id: video.channelId,
      title: video.channelTitle,
      subscriberCount: 0,
      videoCount: 0
    };
    const channelAngle = angle + 0.13;
    const channelPosition = new THREE.Vector3(
      Math.cos(channelAngle) * 7.4,
      Math.sin(channelAngle) * 7.4,
      -1.1
    );
    const channelNode = addMindmapNode({
      label: truncateLabel(channel.title, 20),
      detail: `Public channel context returned for "${video.title}".`,
      type: "channel",
      position: channelPosition,
      color: palette.channel,
      scale: 0.62,
      channel,
      video
    });
    addMindmapLink(videoNode.position, channelNode.position, 0xe0b0a3);
  });
}

function truncateLabel(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function addMindmapNode({ label, detail, type, position, color, scale, video, channel }) {
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
  mesh.userData = { label, detail, type, video, channel };
  mindmapState.group.add(mesh);
  mindmapState.nodes.push(mesh);

  const labelSprite = makeLabelSprite(label, color, type);
  labelSprite.position.set(position.x, position.y - scale - 0.58, position.z);
  labelSprite.userData = { label, detail, type, video, channel };
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

function makeLabelSprite(text, color, type) {
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
  const widths = { brief: 3.8, category: 3.5, video: 3.1, channel: 3.3 };
  sprite.scale.set(widths[type] || 3.4, 0.94, 1);
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

  elements.mindmapDetailTitle.textContent = data.label || "Source brief";
  elements.mindmapDetailBody.textContent = data.detail || "Use the selected node as a prompt for the brief.";
  const prompts = brainstormPromptsFor(data);
  elements.brainstormList.innerHTML = prompts.map(prompt => `<li>${escapeHtml(prompt)}</li>`).join("");
}

function brainstormPromptsFor(data) {
  if (data.type === "category" && data.video) {
    return [
      `YouTube labels "${data.video.title}" as ${data.video.categoryName}.`,
      "Open the original source before deciding whether this label is relevant to your review question.",
      "Record your own observation in the planning note; the application does not infer one."
    ];
  }

  if (data.type === "video" && data.video) {
    return [
      `Use "${data.video.title}" as a cited public source in the evidence section.`,
      `Review its YouTube-provided category label, ${data.video.categoryName}, without treating it as a recommendation.`,
      "Open the original YouTube source before writing your own planning observation."
    ];
  }

  if (data.type === "channel" && data.channel) {
    return [
      `Review ${data.channel.title} only as public channel context for the linked source.`,
      "Do not treat subscriber or public-video counts as an Offering Insights score.",
      "Keep your note limited to the public metadata shown and your own source review."
    ];
  }

  return [
    "Define the review question before running the metadata lookup.",
    "Inspect each selected video as a separate cited source.",
    "Write your own note and use the API trace to verify how the source register was retrieved."
  ];
}

function animateMindmap() {
  if (!mindmapState.renderer || !mindmapState.scene || !mindmapState.camera) return;
  mindmapState.animationFrame = requestAnimationFrame(animateMindmap);
  if (mindmapState.group) {
    const motion = Date.now() * 0.00022;
    mindmapState.group.rotation.y = Math.sin(motion) * 0.16;
    mindmapState.group.rotation.x = Math.cos(motion * 0.72) * 0.055;
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

function renderBriefResult(review, config) {
  if (!review.videos.length) {
    elements.briefResult.innerHTML = `
      <article>
        <span>Review question</span>
        <strong>Waiting for public metadata</strong>
        <p>Retrieve the selected videos to display a source-by-source metadata register.</p>
      </article>
      <article>
        <span>Service output</span>
        <strong>Source register with cited public metadata</strong>
        <p>Each video remains separate. No category grouping, ranking, score, or recommendation is generated.</p>
      </article>
      <article>
        <span>Next action</span>
        <strong>Write your own planning note</strong>
        <p>Use the cited source links, then export the note you entered.</p>
      </article>
    `;
    return;
  }

  const noteTitle = config.planningNote ? "User-authored note ready" : "No planning note entered yet";
  const noteBody = config.planningNote || "Open the cited sources, then write your own observation in the Planning goal section.";

  elements.briefResult.innerHTML = `
    <article>
      <span>Review question</span>
      <strong>${escapeHtml(config.question)}</strong>
      <p>This question is entered by the user and is not inferred from YouTube API Data.</p>
    </article>
    <article>
      <span>Source register</span>
      <strong>Current public metadata is shown one source at a time.</strong>
      <p>Offering Insights does not group categories, calculate representation, rank sources, or suggest an angle.</p>
    </article>
    <article>
      <span>Your planning note</span>
      <strong>${escapeHtml(noteTitle)}</strong>
      <p>${escapeHtml(noteBody)}</p>
    </article>
  `;
}

function buildReport(review, quotaEstimate, config) {
  const mode = "Fresh YouTube Data API public-metadata lookup";
  const endpointLines = review.endpointLog.map(item => (
    `- ${item.name}: ${item.detail || "read-only public metadata lookup"}`
  ));
  const sourceLines = review.videos.map(video => (
    `- ${video.title} | category=${video.categoryName} (ID ${video.categoryId || "unknown"}) | channel=${video.channelTitle} | views=${formatNumber(video.viewCount)} | likes=${formatNumber(video.likeCount)} | published=${formatDate(video.publishedAt)} | source=${youtubeWatchUrl(video.id)}`
  ));

  return [
    config.title,
    "Document type: User-authored source review note with a cited public metadata register.",
    `Use case: ${config.audience}`,
    `Review question (user-provided): ${config.question}`,
    "Planning note (user-provided):",
    config.planningNote || "[No planning note entered]",
    "",
    `Mode: ${mode}`,
    review.fetchedAt ? `Fetched at: ${formatTimestamp(new Date(review.fetchedAt))}` : "",
    `Category region: ${config.regionCode}`,
    "Data boundary: public YouTube metadata only; no OAuth, no private user data, no uploads, no comment moderation.",
    "Interpretation boundary: category labels and public metadata come from YouTube. Offering Insights does not aggregate categories, calculate representation, rank or score sources, identify trends, or generate recommendations.",
    "Authorship boundary: the review question and planning note are entered by the user and are not generated from YouTube API Data.",
    "Prototype boundary: this tool does not watch videos, transcribe audio, analyze captions, analyze comments, or access private account data.",
    "Input method: public video IDs, video URLs, or public playlist URLs supplied by the user.",
    `Estimated quota units for this request trace: ${quotaEstimate}`,
    "",
    "Endpoints demonstrated:",
    ...endpointLines,
    "",
    "Source register (one entry per selected public video):",
    ...sourceLines,
    "",
    "Visual workspace:",
    "The page renders YouTube source cards from public thumbnails and links. Its optional Three.js map preserves one-to-one relationships from each video to its YouTube-provided category label and public channel context; it does not group, rank, or score sources.",
    "",
    "What this enables:",
    "- Review each selected public source independently.",
    "- Cite the original public YouTube source links and metadata.",
    "- Copy or download the user's planning note with the source register.",
    "- Explain how the metadata was retrieved using the read-only API trace.",
    "",
    "Planning use case:",
    "The dashboard supports source review by displaying current public metadata for user-selected sources and pairing it with a planning note written by the user."
  ].filter(line => line !== undefined && line !== null).join("\n");
}

function formatTimestamp(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "unknown time";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  });
}

function scrollToDashboardSection(targetId, button) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({ behavior: "auto", block: "start" });
  setActiveNavByTarget(targetId, button);
  window.setTimeout(updateActiveNav, 0);
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
  const filename = `${getBriefConfig().title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "offering-insights-source-note"}.txt`;
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  elements.copyStatus.textContent = "Download ready.";
}

elements.runLive?.addEventListener("click", runLiveReview);
elements.copyReport?.addEventListener("click", copyReport);
elements.downloadReport?.addEventListener("click", downloadReport);
[elements.briefTitle, elements.briefAudience, elements.decisionQuestion, elements.planningNote].forEach(field => {
  field?.addEventListener("input", refreshUserAuthoredOutputs);
});
elements.navButtons.forEach(button => {
  button.addEventListener("click", () => scrollToDashboardSection(button.dataset.target, button));
});
window.addEventListener("scroll", queueActiveNavUpdate, { passive: true });
window.addEventListener("resize", queueActiveNavUpdate);

updateActiveNav();
