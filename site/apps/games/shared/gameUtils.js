export function createGameSurface({ baseWidth, baseHeight, className = "game-canvas" }) {
  const content = document.createElement("div");
  content.className = "game-shell";
  content.style.position = "relative";
  content.style.height = "100%";
  content.style.width = "100%";
  content.style.overflow = "hidden";

  const canvas = document.createElement("canvas");
  canvas.className = className;
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  content.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const view = {
    scale: 1,
    ox: 0,
    oy: 0,
    dpr: 1,
    baseWidth,
    baseHeight,
  };

  const updateViewport = () => {
    const rect = content.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(1, rect.width);
    const cssH = Math.max(1, rect.height);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    view.dpr = dpr;
    const scale = Math.min(canvas.width / baseWidth, canvas.height / baseHeight);
    view.scale = scale;
    view.ox = (canvas.width - baseWidth * scale) / 2;
    view.oy = (canvas.height - baseHeight * scale) / 2;
  };

  const clear = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
  };

  const resizeObserver = new ResizeObserver(updateViewport);
  resizeObserver.observe(content);
  updateViewport();

  return { content, canvas, ctx, view, updateViewport, resizeObserver, clear };
}

export function startLoop({ step, render, isActive }) {
  let rafId = null;
  let lastTime = 0;
  const loop = (time) => {
    if (!isActive()) return;
    const dt = lastTime ? (time - lastTime) / 1000 : 0.016;
    lastTime = time;
    step(dt);
    render();
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}
