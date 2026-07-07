const dashboardData = {
  education: {
    label: "Education",
    videos: "24",
    channels: "12",
    quota: "68",
    endpoint: "videos.list",
    rows: [
      ["Exam preparation", "Sample explainer: daily study routine for language learners", ["steady growth", "high retention"]],
      ["Classroom tools", "Sample overview: organizing lesson resources with playlists", ["teacher audience", "playlist context"]],
      ["Skill learning", "Sample guide: practical editing workflow for beginners", ["tutorial format", "category match"]]
    ]
  },
  gaming: {
    label: "Gaming",
    videos: "31",
    channels: "15",
    quota: "82",
    endpoint: "videos.list",
    rows: [
      ["Strategy releases", "Sample analysis: early reactions to a new strategy title", ["launch spike", "creator coverage"]],
      ["Walkthroughs", "Sample guide: mid-game route comparison", ["long watch", "playlist fit"]],
      ["Community trends", "Sample recap: weekly challenge results", ["repeat format", "comment activity"]]
    ]
  },
  technology: {
    label: "Technology",
    videos: "19",
    channels: "10",
    quota: "57",
    endpoint: "channels.list",
    rows: [
      ["AI tools", "Sample review: note-taking workflow with automation", ["fast growth", "business audience"]],
      ["Developer workflow", "Sample demo: local build and deployment checklist", ["technical niche", "high intent"]],
      ["Consumer devices", "Sample comparison: compact hardware setup", ["review format", "seasonal demand"]]
    ]
  },
  music: {
    label: "Music",
    videos: "27",
    channels: "14",
    quota: "73",
    endpoint: "videoCategories.list",
    rows: [
      ["Live sessions", "Sample performance: acoustic set from an independent artist", ["premiere spike", "channel loyalty"]],
      ["Production", "Sample tutorial: arranging a simple drum pattern", ["creator audience", "tutorial format"]],
      ["Playlists", "Sample curation: weekend focus mix", ["playlist context", "repeat listening"]]
    ]
  }
};

function renderCategory(category) {
  const data = dashboardData[category];
  if (!data) return;

  document.getElementById("metric-videos").textContent = data.videos;
  document.getElementById("metric-channels").textContent = data.channels;
  document.getElementById("metric-quota").textContent = data.quota;
  document.getElementById("metric-endpoint").textContent = data.endpoint;
  document.getElementById("category-label").textContent = data.label;

  const table = document.getElementById("video-table");
  table.innerHTML = data.rows.map(([cluster, title, signals]) => `
    <tr>
      <td><strong>${cluster}</strong></td>
      <td>${title}</td>
      <td>${signals.map(signal => `<span class="signal">${signal}</span>`).join("")}</td>
    </tr>
  `).join("");
}

document.querySelectorAll("[data-category]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-category]").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    renderCategory(button.dataset.category);
  });
});

renderCategory("education");
