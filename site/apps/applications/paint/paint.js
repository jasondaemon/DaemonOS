export function createApp() {
  const content = document.createElement("div");
  content.style.display = "grid";
  content.style.gridTemplateRows = "auto 1fr";
  content.style.height = "100%";
  content.style.gap = "10px";

  const toolbar = document.createElement("div");
  toolbar.style.display = "flex";
  toolbar.style.gap = "8px";
  toolbar.style.flexWrap = "wrap";

  const colors = ["#ffffff", "#ffd27a", "#ff7aa2", "#7bd5ff", "#9be58a", "#b9b4ff", "#ffb088", "#c0c7d4", "#1f2937", "#000000"];
  let currentColor = colors[0];
  let brushSize = 8;
  let brushType = "round";
  let erasing = false;

  const colorSwatches = document.createElement("div");
  colorSwatches.style.display = "flex";
  colorSwatches.style.gap = "6px";

  colors.forEach((color) => {
    const swatch = document.createElement("button");
    swatch.style.width = "22px";
    swatch.style.height = "22px";
    swatch.style.borderRadius = "6px";
    swatch.style.border = "1px solid rgba(255,255,255,0.2)";
    swatch.style.background = color;
    swatch.addEventListener("click", () => {
      currentColor = color;
      erasing = false;
    });
    colorSwatches.appendChild(swatch);
  });

  const brushSelect = document.createElement("select");
  ["round", "square", "calligraphy"].forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    brushSelect.appendChild(option);
  });
  brushSelect.addEventListener("change", (event) => {
    brushType = event.target.value;
  });

  const sizeLabel = document.createElement("label");
  sizeLabel.textContent = "Size";
  sizeLabel.style.color = "var(--muted)";
  sizeLabel.style.display = "flex";
  sizeLabel.style.alignItems = "center";
  sizeLabel.style.gap = "6px";

  const sizeSlider = document.createElement("input");
  sizeSlider.type = "range";
  sizeSlider.min = "2";
  sizeSlider.max = "40";
  sizeSlider.value = String(brushSize);
  sizeSlider.addEventListener("input", (event) => {
    brushSize = Number(event.target.value);
  });
  sizeLabel.appendChild(sizeSlider);

  const eraserButton = document.createElement("button");
  eraserButton.className = "menu-button";
  eraserButton.textContent = "Eraser";
  eraserButton.addEventListener("click", () => {
    erasing = !erasing;
  });

  toolbar.appendChild(colorSwatches);
  toolbar.appendChild(brushSelect);
  toolbar.appendChild(sizeLabel);
  toolbar.appendChild(eraserButton);

  const canvas = document.createElement("canvas");
  canvas.className = "game-canvas";
  canvas.width = 720;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");
  const lightMode = document.documentElement.dataset.theme === "light";
  ctx.fillStyle = lightMode ? "#ffffff" : "#0c1117";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let drawing = false;

  const getBrush = () => {
    if (brushType === "calligraphy") {
      ctx.lineCap = "square";
      ctx.lineWidth = brushSize * 1.5;
    } else if (brushType === "square") {
      ctx.lineCap = "butt";
      ctx.lineWidth = brushSize;
    } else {
      ctx.lineCap = "round";
      ctx.lineWidth = brushSize;
    }
  };

  const paintAt = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    getBrush();
    ctx.strokeStyle = erasing ? (lightMode ? "#ffffff" : "#0c1117") : currentColor;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  canvas.addEventListener("mousedown", (event) => {
    drawing = true;
    ctx.beginPath();
    paintAt(event);
  });

  canvas.addEventListener("mousemove", (event) => {
    if (!drawing) return;
    paintAt(event);
  });

  document.addEventListener("mouseup", () => {
    drawing = false;
    ctx.beginPath();
  });

  content.appendChild(toolbar);
  content.appendChild(canvas);

  return {
    title: "Paint",
    width: 760,
    height: 520,
    content,
  };
}
