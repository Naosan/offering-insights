const MANAGED_SERVICE_ORIGIN = "https://offering-insights-141682939002.asia-northeast1.run.app";
const ANALYZE_API_URL = window.location.hostname === "naosan.github.io"
  ? `${MANAGED_SERVICE_ORIGIN}/api/analyze`
  : "/api/analyze";

const elements = {
  briefTitle: document.getElementById("brief-title"),
  briefAudience: document.getElementById("brief-audience"),
  researchTopic: document.getElementById("research-topic"),
  regionCode: document.getElementById("region-code"),
  decisionQuestion: document.getElementById("decision-question"),
  planningNote: document.getElementById("planning-note"),
  videoIds: document.getElementById("video-ids"),
  sourcePreviewSummary: document.getElementById("source-preview-summary"),
  sourceChipList: document.getElementById("source-chip-list"),
  sourceInputFeedback: document.getElementById("source-input-feedback"),
  clearSources: document.getElementById("clear-sources"),
  runLive: document.getElementById("run-live"),
  termsConsent: document.getElementById("terms-consent"),
  apiState: document.getElementById("api-state"),
  briefMode: document.getElementById("brief-mode"),
  researchSummary: document.getElementById("research-summary"),
  sourceNotesList: document.getElementById("source-notes-list"),
  mindmapCanvas: document.getElementById("mindmap-canvas"),
  mindmapDetailTitle: document.getElementById("mindmap-detail-title"),
  mindmapDetailBody: document.getElementById("mindmap-detail-body"),
  brainstormList: document.getElementById("brainstorm-list"),
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
    title: elements.briefTitle?.value.trim() || "Untitled YouTube source research",
    audience: elements.briefAudience?.value || "source review",
    topic: elements.researchTopic?.value.trim() || "General source review",
    regionCode: elements.regionCode?.value || "JP",
    question: elements.decisionQuestion?.value.trim() || "What should I learn or verify from these sources?",
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

function getSourceSelection() {
  const raw = elements.videoIds?.value || "";
  return {
    raw,
    videoIds: extractVideoIds(raw),
    playlistIds: extractPlaylistIds(raw)
  };
}

function countUnrecognizedSourceEntries(raw) {
  return String(raw || "")
    .split(/[\r\n,]+/)
    .map(entry => entry.trim())
    .filter(Boolean)
    .filter(entry => !extractVideoIds(entry).length && !extractPlaylistIds(entry).length)
    .length;
}

function renderSourceSelection() {
  if (!elements.sourceChipList || !elements.runLive) return;
  const selection = getSourceSelection();
  const videoCount = selection.videoIds.length;
  const playlistCount = selection.playlistIds.length;
  const sourceCount = videoCount + playlistCount;
  const labels = [];
  if (videoCount) labels.push(`${videoCount} video${videoCount === 1 ? "" : "s"}`);
  if (playlistCount) labels.push(`${playlistCount} playlist${playlistCount === 1 ? "" : "s"}`);

  elements.sourcePreviewSummary.textContent = sourceCount
    ? `${labels.join(" and ")} ready`
    : "No sources detected";
  elements.clearSources.hidden = !selection.raw.trim();
  elements.runLive.disabled = requestInFlight || sourceCount === 0;

  const chips = [
    ...selection.videoIds.map(id => ({ kind: "video", id, label: `Video ${id}` })),
    ...selection.playlistIds.map(id => ({ kind: "playlist", id, label: `Playlist ${id}` }))
  ];
  elements.sourceChipList.innerHTML = chips.length
    ? chips.map(source => `
      <span class="source-chip" data-kind="${source.kind}">
        <span>${escapeHtml(source.label)}</span>
        <button type="button" data-remove-source="${source.kind}" data-source-id="${escapeHtml(source.id)}" title="Remove ${source.kind}" aria-label="Remove ${escapeHtml(source.label)}">&times;</button>
      </span>
    `).join("")
    : `<span class="source-preview-empty">Paste a YouTube URL or 11-character video ID to begin.</span>`;

  const unrecognizedCount = countUnrecognizedSourceEntries(selection.raw);
  elements.sourceInputFeedback.textContent = unrecognizedCount
    ? `${unrecognizedCount} line${unrecognizedCount === 1 ? " was" : "s were"} not recognized and will not be submitted.`
    : "";
  elements.sourceInputFeedback.dataset.tone = unrecognizedCount ? "warning" : "neutral";
}

function setCanonicalSourceSelection(videoIds, playlistIds) {
  elements.videoIds.value = [
    ...videoIds.map(id => youtubeWatchUrl(id)),
    ...playlistIds.map(id => `https://www.youtube.com/playlist?list=${encodeURIComponent(id)}`)
  ].join("\n");
  renderSourceSelection();
}

function removeSource(kind, id) {
  const selection = getSourceSelection();
  const videoIds = kind === "video" ? selection.videoIds.filter(value => value !== id) : selection.videoIds;
  const playlistIds = kind === "playlist" ? selection.playlistIds.filter(value => value !== id) : selection.playlistIds;
  setCanonicalSourceSelection(videoIds, playlistIds);
  setSourceInputStatus();
}

let requestInFlight = false;

function setSourceInputStatus() {
  if (requestInFlight) return;
  const selection = getSourceSelection();
  const sourceCount = selection.videoIds.length + selection.playlistIds.length;
  setStatus(
    sourceCount
      ? `${sourceCount} source${sourceCount === 1 ? " is" : "s are"} ready. Review the consent, then load current details.`
      : "Add at least one public YouTube source.",
    "neutral"
  );
}

async function runLiveReview() {
  const { videoIds, playlistIds } = getSourceSelection();
  const config = getBriefConfig();
  setActiveNavByTarget("source-input-title");

  if (elements.termsConsent && !elements.termsConsent.checked) {
    setStatus("Review and accept the Privacy Policy and Terms before retrieving public YouTube metadata.", "warning");
    return;
  }

  if (!videoIds.length && !playlistIds.length) {
    setStatus("Enter at least one public YouTube video URL, video ID, or public playlist URL.", "warning");
    return;
  }

  requestInFlight = true;
  renderSourceSelection();
  setStatus("Loading current public details for the selected sources...", "neutral");

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
    setStatus(`Source details loaded at ${formatTimestamp(new Date())}.${exclusionNote}`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    requestInFlight = false;
    renderSourceSelection();
  }
}

let activeReviewState = null;
let sourceNoteState = new Map();

function reconcileSourceNotes(videos) {
  sourceNoteState = new Map(videos.map(video => [
    video.id,
    sourceNoteState.get(video.id) || { takeaway: "", verifyNext: "" }
  ]));
}

function renderReview(review) {
  review.videos = review.videos || [];
  review.channels = review.channels || [];
  review.playlistItems = review.playlistItems || [];
  review.endpointLog = review.endpointLog || [];
  const quotaEstimate = review.endpointLog.reduce((total, item) => total + (item.cost || 0), 0);
  const config = review.config || getBriefConfig();
  activeReviewState = { review, quotaEstimate, regionCode: config.regionCode };
  reconcileSourceNotes(review.videos);

  elements.analysisOutputs.forEach(output => {
    output.hidden = false;
  });
  elements.analysisNavButtons.forEach(button => {
    button.disabled = false;
  });

  elements.briefMode.textContent = `${review.videos.length} public source${review.videos.length === 1 ? "" : "s"}`;
  renderResearchSummary(review, config);
  renderSourceNotes(review);
  updateMindmap(review, config);

  elements.channelList.innerHTML = review.channels.length ? review.channels.map(channel => `
    <article>
      <strong>${escapeHtml(channel.title)}</strong>
      <p>${formatNumber(channel.subscriberCount)} subscribers - ${formatNumber(channel.videoCount)} public videos</p>
    </article>
  `).join("") : `
    <article>
      <strong>No channel records returned</strong>
      <p>The selected videos did not expose public channel records.</p>
    </article>
  `;

  elements.playlistList.innerHTML = review.playlistItems.length ? review.playlistItems.slice(0, 5).map(item => `
    <article>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.channelTitle)} - ${escapeHtml(item.videoId || "no video id")}</p>
    </article>
  `).join("") : `
    <article>
      <strong>No playlist imported</strong>
      <p>This lookup used individual video sources.</p>
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

function renderResearchSummary(review, config) {
  elements.researchSummary.innerHTML = `
    <article>
      <span>Research</span>
      <strong>${escapeHtml(config.title)}</strong>
      <p>${escapeHtml(config.topic)}</p>
    </article>
    <article>
      <span>Question</span>
      <strong>${escapeHtml(config.question)}</strong>
      <p>${escapeHtml(config.audience)}</p>
    </article>
    <article>
      <span>Sources</span>
      <strong>${review.videos.length} public video${review.videos.length === 1 ? "" : "s"}</strong>
      <p>Current source details loaded ${formatTimestamp(new Date(review.fetchedAt || Date.now()))}.</p>
    </article>
  `;
}

function renderSourceNotes(review) {
  if (!review.videos.length) {
    elements.sourceNotesList.innerHTML = `<p class="source-preview-empty">No public videos were returned for this source set.</p>`;
    return;
  }

  elements.sourceNotesList.innerHTML = review.videos.map((video, index) => {
    const note = sourceNoteState.get(video.id) || { takeaway: "", verifyNext: "" };
    const thumbnail = video.thumbnailUrl || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    return `
      <article class="source-note-card" data-video-id="${escapeHtml(video.id)}">
        <div class="source-note-source">
          <a class="source-note-thumb" href="${escapeHtml(youtubeWatchUrl(video.id))}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(video.title)} on YouTube">
            <img src="${escapeHtml(thumbnail)}" alt="YouTube thumbnail for ${escapeHtml(video.title)}">
          </a>
          <div class="source-note-meta">
            <span>Source ${String(index + 1).padStart(2, "0")}</span>
            <h3>${escapeHtml(video.title)}</h3>
            <p>${escapeHtml(video.channelTitle)} - ${escapeHtml(video.categoryName)} - ${formatDate(video.publishedAt)}</p>
            <div class="source-signals">
              <span class="signal">${formatNumber(video.viewCount)} views</span>
              <span class="signal">${formatNumber(video.likeCount)} likes</span>
            </div>
            <a class="source-link" href="${escapeHtml(youtubeWatchUrl(video.id))}" target="_blank" rel="noopener">Open on YouTube</a>
          </div>
        </div>
        <div class="source-note-fields">
          <label class="field">
            <span>Key takeaway</span>
            <textarea rows="3" maxlength="800" data-source-note="takeaway" data-video-id="${escapeHtml(video.id)}" placeholder="Write what this source contributes to your research.">${escapeHtml(note.takeaway)}</textarea>
          </label>
          <label class="field">
            <span>What to verify next</span>
            <textarea rows="3" maxlength="800" data-source-note="verifyNext" data-video-id="${escapeHtml(video.id)}" placeholder="Record a claim, detail, or question to check in the original video.">${escapeHtml(note.verifyNext)}</textarea>
          </label>
        </div>
      </article>
    `;
  }).join("");
}

function refreshUserAuthoredOutputs() {
  if (!activeReviewState) return;
  const config = {
    ...getBriefConfig(),
    regionCode: activeReviewState.regionCode
  };
  renderResearchSummary(activeReviewState.review, config);
  elements.reportOutput.textContent = buildReport(
    activeReviewState.review,
    activeReviewState.quotaEstimate,
    config
  );
}

function youtubeWatchUrl(videoId) {
  return videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : "https://www.youtube.com/";
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
    elements.mindmapDetailBody.textContent = "The visual map could not be loaded. Your source notes and export remain available.";
  } finally {
    mindmapState.loading = false;
  }
}

function updateMindmap(review, config) {
  mindmapState.data = { review, config };
  renderBrainstormDetail({
    type: "brief",
    label: config.title,
    detail: `${config.topic} Research question: ${config.question}`
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
    label: "Research",
    detail: `${config.topic} Research question: ${config.question}`,
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

  elements.mindmapDetailTitle.textContent = data.label || "Research source";
  elements.mindmapDetailBody.textContent = data.detail || "Use the selected node to focus your source review.";
  const prompts = brainstormPromptsFor(data);
  elements.brainstormList.innerHTML = prompts.map(prompt => `<li>${escapeHtml(prompt)}</li>`).join("");
}

function brainstormPromptsFor(data) {
  if (data.type === "category" && data.video) {
    return [
      `YouTube labels "${data.video.title}" as ${data.video.categoryName}.`,
      "Consider whether that category is useful context for your research question.",
      "Record any category caveat beside this source before writing your conclusion."
    ];
  }

  if (data.type === "video" && data.video) {
    return [
      `Open "${data.video.title}" and compare it with your research question.`,
      "Record the source's most useful contribution in Key takeaway.",
      "Add any claim, example, or missing detail to What to verify next."
    ];
  }

  if (data.type === "channel" && data.channel) {
    return [
      `Use ${data.channel.title} as context for the linked source.`,
      "Open the public channel when its expertise or publishing context matters to your question.",
      "Treat audience and video counts as context, not as a quality score."
    ];
  }

  return [
    "Keep the research question visible while reviewing each original video.",
    "Capture one useful takeaway and one follow-up check for each source.",
    "Use the working conclusion to connect your notes after the source review."
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

function buildReport(review, quotaEstimate, config) {
  const endpointLines = review.endpointLog.map(item => (
    `- ${item.name}: ${item.detail || "read-only public metadata lookup"}`
  ));
  const sourceSections = review.videos.flatMap((video, index) => {
    const note = sourceNoteState.get(video.id) || { takeaway: "", verifyNext: "" };
    return [
      `### ${index + 1}. ${video.title}`,
      `YouTube source: ${youtubeWatchUrl(video.id)}`,
      `Channel: ${video.channelTitle}`,
      `YouTube category: ${video.categoryName} (ID ${video.categoryId || "unknown"})`,
      `Published: ${formatDate(video.publishedAt)}`,
      `Public signals at lookup: ${formatNumber(video.viewCount)} views; ${formatNumber(video.likeCount)} likes`,
      "Key takeaway (user-authored):",
      note.takeaway.trim() || "[Not entered]",
      "What to verify next (user-authored):",
      note.verifyNext.trim() || "[Not entered]",
      ""
    ];
  });

  return [
    `# ${config.title}`,
    "",
    `Research type: ${config.audience}`,
    `Topic: ${config.topic}`,
    `Research question: ${config.question}`,
    "",
    "## Working conclusion",
    config.planningNote || "[Not entered]",
    "",
    "## Source notes",
    ...(sourceSections.length ? sourceSections : ["[No public videos returned]", ""]),
    "## Retrieval details",
    review.fetchedAt ? `Fetched at: ${formatTimestamp(new Date(review.fetchedAt))}` : "Fetched at: unknown",
    `YouTube category region: ${config.regionCode}`,
    `Estimated quota units in this request trace: ${quotaEstimate}`,
    "Input method: public video IDs, video URLs, or public playlist URLs supplied by the user.",
    "API Data boundary: read-only public metadata only. No OAuth, private user data, uploads, captions, comments, or account actions.",
    "Authorship boundary: the topic, research question, source notes, and conclusion are written by the user and stay in this browser tab unless the user copies or downloads them.",
    "Interpretation boundary: YouTube supplies the public metadata and category labels. Offering Insights does not search YouTube, rank or score sources, aggregate category results, identify trends, or generate conclusions from API Data.",
    "",
    "Read-only API trace:",
    ...endpointLines
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
  target.closest("details")?.setAttribute("open", "");
  target.scrollIntoView({ behavior: "auto", block: "start" });
  setActiveNavByTarget(targetId, button);
  if (window.innerWidth <= 980) {
    const sidebar = button?.closest(".sidebar");
    if (sidebar && button) {
      const sidebarRect = sidebar.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      sidebar.scrollTo({
        left: sidebar.scrollLeft + buttonRect.left - sidebarRect.left - (sidebar.clientWidth - buttonRect.width) / 2,
        behavior: "auto"
      });
    }
  }
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

  const sidebarBottom = document.querySelector(".sidebar")?.getBoundingClientRect().bottom || 0;
  const activationLine = window.innerWidth <= 980 ? sidebarBottom + 20 : 132;
  entries.forEach(entry => {
    if (!pageBottom && entry.target.getBoundingClientRect().top <= activationLine) {
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
elements.videoIds?.addEventListener("input", () => {
  renderSourceSelection();
  setSourceInputStatus();
});
elements.clearSources?.addEventListener("click", () => {
  elements.videoIds.value = "";
  renderSourceSelection();
  setStatus("Source input cleared. Any loaded research note remains available below.", "neutral");
  elements.videoIds.focus();
});
elements.sourceChipList?.addEventListener("click", event => {
  const button = event.target.closest("button[data-remove-source]");
  if (!button) return;
  removeSource(button.dataset.removeSource, button.dataset.sourceId);
});
elements.sourceNotesList?.addEventListener("input", event => {
  const field = event.target.closest("textarea[data-source-note][data-video-id]");
  if (!field) return;
  const note = sourceNoteState.get(field.dataset.videoId) || { takeaway: "", verifyNext: "" };
  note[field.dataset.sourceNote] = field.value;
  sourceNoteState.set(field.dataset.videoId, note);
  refreshUserAuthoredOutputs();
});
[elements.briefTitle, elements.briefAudience, elements.researchTopic, elements.decisionQuestion, elements.planningNote].forEach(field => {
  field?.addEventListener("input", refreshUserAuthoredOutputs);
});
elements.navButtons.forEach(button => {
  button.addEventListener("click", () => scrollToDashboardSection(button.dataset.target, button));
});
window.addEventListener("scroll", queueActiveNavUpdate, { passive: true });
window.addEventListener("resize", queueActiveNavUpdate);

renderSourceSelection();
updateActiveNav();
