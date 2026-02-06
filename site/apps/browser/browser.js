export function createApp() {
  const content = document.createElement("div");
  content.style.height = "100%";
  content.style.display = "flex";
  content.style.flexDirection = "column";

  const toolbar = document.createElement("div");
  toolbar.className = "browser-toolbar";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Enter a URL (https://...)";

  const goButton = document.createElement("button");
  goButton.className = "menu-button";
  goButton.textContent = "Go";

  const frame = document.createElement("iframe");
  frame.className = "browser-frame";
  frame.title = "Browser";
  frame.setAttribute("sandbox", "allow-scripts allow-forms allow-popups allow-same-origin");

  const hint = document.createElement("div");
  hint.className = "menu-hint";
  hint.textContent = "Some sites block embedding and may appear blank.";

  toolbar.appendChild(input);
  toolbar.appendChild(goButton);
  content.appendChild(toolbar);
  content.appendChild(hint);
  content.appendChild(frame);

  const loadUrl = () => {
    let url = input.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    frame.src = url;
  };

  goButton.addEventListener("click", loadUrl);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      loadUrl();
    }
  });

  return {
    title: "Web Browser",
    width: 760,
    height: 480,
    content,
  };
}
