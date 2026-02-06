export function createApp() {
  const content = document.createElement("div");
  content.style.display = "grid";
  content.style.gap = "10px";

  const rows = [
    ["User Agent", navigator.userAgent],
    ["Platform", navigator.platform],
    ["Language", navigator.language],
    ["Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone],
    ["Viewport", `${window.innerWidth} x ${window.innerHeight}`],
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "120px 1fr";
    row.style.gap = "8px";

    const labelNode = document.createElement("div");
    labelNode.textContent = label;
    labelNode.style.color = "var(--muted)";
    const valueNode = document.createElement("div");
    valueNode.textContent = value;

    row.appendChild(labelNode);
    row.appendChild(valueNode);
    content.appendChild(row);
  });

  return {
    title: "Diagnostics",
    width: 520,
    height: 300,
    content,
  };
}
