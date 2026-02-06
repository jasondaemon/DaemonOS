export function createApp() {
  const content = document.createElement("div");
  content.style.height = "100%";
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.gap = "10px";

  const toolbar = document.createElement("div");
  toolbar.className = "browser-toolbar";

  const homeButton = document.createElement("button");
  homeButton.className = "menu-button";
  homeButton.textContent = "Home";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Search DuckDuckGo";

  const goButton = document.createElement("button");
  goButton.className = "menu-button";
  goButton.textContent = "Search";

  const frame = document.createElement("iframe");
  frame.className = "browser-frame";
  frame.title = "Browser Home";
  frame.setAttribute("sandbox", "allow-scripts allow-forms");

  const loadHome = () => {
    frame.src = "/apps/browser/pages/home.html";
  };

  const openSearch = () => {
    const query = input.value.trim();
    if (!query) return;
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  homeButton.addEventListener("click", loadHome);
  goButton.addEventListener("click", openSearch);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      openSearch();
    }
  });

  toolbar.appendChild(homeButton);
  toolbar.appendChild(input);
  toolbar.appendChild(goButton);

  content.appendChild(toolbar);
  content.appendChild(frame);

  loadHome();

  return {
    title: "Browser",
    width: 760,
    height: 520,
    content,
  };
}
