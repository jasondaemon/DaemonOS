import { createGameSurface, startLoop } from "../shared/gameUtils.js";

export function createApp() {
  const controller = new AbortController();
  const { signal } = controller;

  const wrapper = document.createElement("div");
  wrapper.style.display = "grid";
  wrapper.style.gridTemplateRows = "auto 1fr";
  wrapper.style.gap = "10px";
  wrapper.style.height = "100%";

  const toolbar = document.createElement("div");
  toolbar.className = "game-toolbar";
  const resetButton = document.createElement("button");
  resetButton.className = "menu-button";
  resetButton.textContent = "Restart";
  const status = document.createElement("div");
  status.className = "game-status";
  toolbar.append(resetButton, status);
  wrapper.appendChild(toolbar);

  const { content, ctx, view, resizeObserver, clear } = createGameSurface({
    baseWidth: 480,
    baseHeight: 480,
  });
  wrapper.appendChild(content);

  const gridSize = 20;
  const cell = view.baseWidth / gridSize;
  let snake = [{ x: 10, y: 10 }];
  let direction = { x: 1, y: 0 };
  let pending = direction;
  let food = { x: 5, y: 5 };
  let score = 0;
  let speed = 6;
  let alive = true;
  let accumulator = 0;

  const spawnFood = () => {
    const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
    const available = [];
    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        if (!occupied.has(`${x},${y}`)) available.push({ x, y });
      }
    }
    food = available[Math.floor(Math.random() * available.length)] || { x: 0, y: 0 };
  };

  const reset = () => {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    pending = direction;
    score = 0;
    speed = 6;
    alive = true;
    accumulator = 0;
    spawnFood();
  };

  const updateStatus = () => {
    status.textContent = alive ? `Score ${score}` : `Game Over • Score ${score}`;
  };

  const step = (dt) => {
    if (!alive) return;
    accumulator += dt;
    const tick = 1 / speed;
    while (accumulator >= tick) {
      accumulator -= tick;
      direction = pending;
      const head = snake[0];
      const next = { x: head.x + direction.x, y: head.y + direction.y };
      if (next.x < 0) next.x = gridSize - 1;
      if (next.x >= gridSize) next.x = 0;
      if (next.y < 0) next.y = gridSize - 1;
      if (next.y >= gridSize) next.y = 0;
      if (snake.some((s) => s.x === next.x && s.y === next.y)) {
        alive = false;
        updateStatus();
        return;
      }
      snake.unshift(next);
      if (next.x === food.x && next.y === food.y) {
        score += 10;
        speed = Math.min(14, 6 + Math.floor(score / 40));
        spawnFood();
      } else {
        snake.pop();
      }
      updateStatus();
    }
  };

  const draw = () => {
    clear();
    ctx.fillStyle = "#0f1720";
    ctx.fillRect(0, 0, view.baseWidth, view.baseHeight);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i <= gridSize; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, view.baseHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(view.baseWidth, i * cell);
      ctx.stroke();
    }

    ctx.fillStyle = "#ff6f91";
    ctx.beginPath();
    ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.35, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? "#7bd5ff" : "#6ef0c4";
      ctx.fillRect(seg.x * cell + 2, seg.y * cell + 2, cell - 4, cell - 4);
    });

    if (!alive) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, view.baseWidth, view.baseHeight);
      ctx.fillStyle = "#e6edf6";
      ctx.font = "24px 'Avenir Next', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", view.baseWidth / 2, view.baseHeight / 2 - 10);
      ctx.font = "14px 'Avenir Next', sans-serif";
      ctx.fillText("Press R to restart", view.baseWidth / 2, view.baseHeight / 2 + 18);
    }
  };

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "r") {
      reset();
      updateStatus();
      return;
    }
    if (!alive) return;
    const key = event.key.toLowerCase();
    if ((key === "arrowup" || key === "w") && direction.y !== 1) pending = { x: 0, y: -1 };
    if ((key === "arrowdown" || key === "s") && direction.y !== -1) pending = { x: 0, y: 1 };
    if ((key === "arrowleft" || key === "a") && direction.x !== 1) pending = { x: -1, y: 0 };
    if ((key === "arrowright" || key === "d") && direction.x !== -1) pending = { x: 1, y: 0 };
  }, { signal });

  resetButton.addEventListener("click", () => {
    reset();
    updateStatus();
  }, { signal });

  const stopLoop = startLoop({
    step,
    render: draw,
    isActive: () => content.isConnected,
  });

  const observer = new MutationObserver(() => {
    if (!content.isConnected) {
      observer.disconnect();
      controller.abort();
      resizeObserver.disconnect();
      stopLoop();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  updateStatus();

  return {
    title: "Snake",
    width: 520,
    height: 560,
    content: wrapper,
  };
}
