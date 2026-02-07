export function createApp() {
  const content = document.createElement("div");
  content.style.display = "grid";
  content.style.gap = "10px";

  const rows = [];
  const addRow = (label, value) => rows.push([label, value]);

  const safe = (value, fallback = "Unavailable") => (value == null || value === "" ? fallback : value);

  addRow("User Agent", navigator.userAgent);
  addRow("Platform", safe(navigator.platform));
  addRow("Language", navigator.language);
  addRow("Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  addRow("Local Time", new Date().toLocaleString());
  addRow("Viewport", `${window.innerWidth} x ${window.innerHeight}`);
  addRow("Screen", `${window.screen.width} x ${window.screen.height}`);
  addRow("Pixel Ratio", String(window.devicePixelRatio || 1));
  addRow("Color Depth", `${window.screen.colorDepth}-bit`);
  addRow("CPU Cores", safe(navigator.hardwareConcurrency));
  addRow("Device Memory", navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "Unavailable");
  addRow("Online", navigator.onLine ? "Yes" : "No");
  addRow("Cookies Enabled", navigator.cookieEnabled ? "Yes" : "No");

  if (navigator.connection) {
    const conn = navigator.connection;
    addRow("Connection Type", safe(conn.effectiveType));
    addRow("Downlink", conn.downlink ? `${conn.downlink} Mbps` : "Unavailable");
    addRow("RTT", conn.rtt ? `${conn.rtt} ms` : "Unavailable");
    addRow("Data Saver", conn.saveData ? "On" : "Off");
  }

  addRow("WAN IP", "Unavailable (CSP blocks external lookup)");

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

  const footer = document.createElement("div");
  footer.style.marginTop = "6px";
  footer.style.fontSize = "12px";
  footer.style.color = "var(--muted)";
  footer.textContent = "Note: WAN IP lookup requires an external service, which is blocked by DaemonOS CSP.";
  content.appendChild(footer);

  const updateAsync = async () => {
    if (navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage ? `${(estimate.usage / (1024 ** 2)).toFixed(1)} MB` : "Unavailable";
        const quota = estimate.quota ? `${(estimate.quota / (1024 ** 2)).toFixed(1)} MB` : "Unavailable";
        addRow("Storage Used", used);
        addRow("Storage Quota", quota);
      } catch {
        // ignore
      }
    }
    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        const level = Math.round(battery.level * 100);
        addRow("Battery", `${level}%`);
        addRow("Charging", battery.charging ? "Yes" : "No");
      } catch {
        // ignore
      }
    }
    content.innerHTML = "";
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
    content.appendChild(footer);
  };

  updateAsync();

  return {
    title: "Diagnostics",
    width: 560,
    height: 380,
    content,
  };
}
