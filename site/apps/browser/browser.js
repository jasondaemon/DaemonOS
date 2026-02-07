export function createApp() {
  const content = document.createElement("div");
  content.style.height = "100%";
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.gap = "10px";
  content.style.minHeight = "0";

  const toolbar = document.createElement("div");
  toolbar.className = "browser-toolbar";

  const backButton = document.createElement("button");
  backButton.className = "browser-button";
  backButton.textContent = "←";
  backButton.title = "Back";

  const forwardButton = document.createElement("button");
  forwardButton.className = "browser-button";
  forwardButton.textContent = "→";
  forwardButton.title = "Forward";

  const refreshButton = document.createElement("button");
  refreshButton.className = "browser-button";
  refreshButton.textContent = "⟳";
  refreshButton.title = "Refresh";

  const homeButton = document.createElement("button");
  homeButton.className = "browser-button";
  homeButton.textContent = "⌂";
  homeButton.title = "Home";

  const address = document.createElement("input");
  address.type = "text";
  address.className = "browser-address";
  address.value = "daemonos://home";
  address.readOnly = true;

  const frame = document.createElement("iframe");
  frame.className = "browser-frame";
  frame.title = "Browser Home";
  frame.setAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox");

  const loadHome = () => {
    const version = window.daemonosRegistryVersion || "";
    const suffix = version ? `?v=${encodeURIComponent(version)}` : "";
    frame.src = `/apps/browser/pages/home.html${suffix}`;
    address.value = "daemonos://home";
  };

  const navigateBack = () => {
    try {
      frame.contentWindow?.history?.back();
    } catch {
      // ignore
    }
  };

  const navigateForward = () => {
    try {
      frame.contentWindow?.history?.forward();
    } catch {
      // ignore
    }
  };

  const refresh = () => {
    try {
      frame.contentWindow?.location?.reload();
    } catch {
      frame.src = frame.src;
    }
  };

  homeButton.addEventListener("click", loadHome);
  backButton.addEventListener("click", navigateBack);
  forwardButton.addEventListener("click", navigateForward);
  refreshButton.addEventListener("click", refresh);

  toolbar.appendChild(backButton);
  toolbar.appendChild(forwardButton);
  toolbar.appendChild(refreshButton);
  toolbar.appendChild(homeButton);
  toolbar.appendChild(address);

  content.appendChild(toolbar);
  content.appendChild(frame);

  loadHome();

  const handleMessage = (event) => {
    if (!event?.data || typeof event.data !== "object") return;
    if (event.data.type === "openExternal" && typeof event.data.url === "string") {
      window.open(event.data.url, "_blank", "noopener,noreferrer");
    }
  };
  window.addEventListener("message", handleMessage);

  return {
    title: "Browser",
    width: 760,
    height: 520,
    content,
  };
}
