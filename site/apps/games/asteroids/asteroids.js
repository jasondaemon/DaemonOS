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
  resetButton.textContent = "New Game";
  const status = document.createElement("div");
  status.className = "game-status";
  toolbar.append(resetButton, status);
  wrapper.appendChild(toolbar);

  const { content, ctx, view, resizeObserver, clear } = createGameSurface({
    baseWidth: 560,
    baseHeight: 420,
  });
  wrapper.appendChild(content);

  const ship = {
    x: view.baseWidth / 2,
    y: view.baseHeight / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    alive: true,
    invuln: 0,
  };

  let lives = 3;
  let score = 0;
  let level = 1;
  let bullets = [];
  let asteroids = [];
  let thrust = false;
  let turnLeft = false;
  let turnRight = false;
  let lastShot = 0;
  let stateLeveling = false;
  const crashAudio = new Audio("/apps/games/asteroids/crash.mp3");
  const dieAudio = new Audio("/apps/games/asteroids/die.mp3");
  const levelAudio = new Audio("/apps/games/asteroids/levelup.mp3");
  const pewAudio = new Audio("/apps/games/asteroids/pew.mp3");
  const gameOverAudio = new Audio("/apps/games/asteroids/gameover.mp3");
  [crashAudio, dieAudio, levelAudio, pewAudio, gameOverAudio].forEach((audio) => {
    audio.preload = "auto";
    audio.volume = 0.65;
  });

  const wrap = (obj) => {
    if (obj.x < 0) obj.x += view.baseWidth;
    if (obj.x > view.baseWidth) obj.x -= view.baseWidth;
    if (obj.y < 0) obj.y += view.baseHeight;
    if (obj.y > view.baseHeight) obj.y -= view.baseHeight;
  };

  const spawnAsteroid = (size = 3, x, y) => {
    const radius = size === 3 ? 40 : size === 2 ? 26 : 16;
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 40;
    const points = Array.from({ length: 10 }, () => 0.7 + Math.random() * 0.4);
    asteroids.push({
      x: x ?? Math.random() * view.baseWidth,
      y: y ?? Math.random() * view.baseHeight,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      radius,
      spin: (Math.random() - 0.5) * 1.4,
      rotation: Math.random() * Math.PI * 2,
      points,
    });
  };

  const reset = () => {
    lives = 3;
    score = 0;
    level = 1;
    bullets = [];
    asteroids = [];
    lastShot = 0;
    thrust = false;
    turnLeft = false;
    turnRight = false;
    stateLeveling = false;
    ship.x = view.baseWidth / 2;
    ship.y = view.baseHeight / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -Math.PI / 2;
    ship.alive = true;
    ship.invuln = 2;
    for (let i = 0; i < 4; i += 1) spawnAsteroid();
    updateStatus();
  };

  const updateStatus = () => {
    status.textContent = `Lives ${lives} • Score ${score} • Level ${level}`;
  };

  const fireBullet = (time) => {
    if (!ship.alive) return;
    if (time - lastShot < 200) return;
    lastShot = time;
    const speed = 260;
    bullets.push({
      x: ship.x + Math.cos(ship.angle) * 16,
      y: ship.y + Math.sin(ship.angle) * 16,
      vx: Math.cos(ship.angle) * speed + ship.vx,
      vy: Math.sin(ship.angle) * speed + ship.vy,
      life: 1.2,
    });
    try {
      pewAudio.currentTime = 0;
      pewAudio.play();
    } catch {
      // ignore autoplay restrictions
    }
  };

  const step = (dt) => {
    if (!ship.alive) return;
    if (turnLeft) ship.angle -= 3 * dt;
    if (turnRight) ship.angle += 3 * dt;
    if (thrust) {
      ship.vx += Math.cos(ship.angle) * 120 * dt;
      ship.vy += Math.sin(ship.angle) * 120 * dt;
    }
    ship.vx *= 0.995;
    ship.vy *= 0.995;
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    wrap(ship);

    if (ship.invuln > 0) ship.invuln = Math.max(0, ship.invuln - dt);

    bullets.forEach((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      wrap(b);
    });
    bullets = bullets.filter((b) => b.life > 0);

    asteroids.forEach((a) => {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rotation += a.spin * dt;
      wrap(a);
    });

    // Collisions
    bullets.forEach((b) => {
      asteroids.forEach((a) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (dx * dx + dy * dy < a.radius * a.radius) {
          b.life = 0;
          a.hit = true;
          a.hitVector = { x: b.vx, y: b.vy };
          score += a.size === 3 ? 20 : a.size === 2 ? 50 : 100;
          try {
            crashAudio.currentTime = 0;
            crashAudio.play();
          } catch {
            // ignore autoplay restrictions
          }
        }
      });
    });

    asteroids = asteroids.flatMap((a) => {
      if (!a.hit) return [a];
      if (a.size > 1) {
        const newSize = a.size - 1;
        const newRadius = a.size === 3 ? 20 : 14;
        const vec = a.hitVector || { x: a.vx, y: a.vy };
        const len = Math.hypot(vec.x, vec.y) || 1;
        const dir = { x: vec.x / len, y: vec.y / len };
        const perp = { x: -dir.y, y: dir.x };
        const speed = 100 + Math.random() * 60;
        const baseX = a.x;
        const baseY = a.y;
        const offset = newRadius * 0.7;
        return [
          {
            x: baseX + perp.x * offset,
            y: baseY + perp.y * offset,
            vx: dir.x * speed + perp.x * 40,
            vy: dir.y * speed + perp.y * 40,
            size: newSize,
            radius: newRadius,
            spin: (Math.random() - 0.5) * 1.4,
            rotation: Math.random() * Math.PI * 2,
            points: Array.from({ length: 10 }, () => 0.7 + Math.random() * 0.4),
          },
          {
            x: baseX - perp.x * offset,
            y: baseY - perp.y * offset,
            vx: dir.x * speed - perp.x * 40,
            vy: dir.y * speed - perp.y * 40,
            size: newSize,
            radius: newRadius,
            spin: (Math.random() - 0.5) * 1.4,
            rotation: Math.random() * Math.PI * 2,
            points: Array.from({ length: 10 }, () => 0.7 + Math.random() * 0.4),
          },
        ];
      }
      return [];
    });

    if (ship.invuln <= 0) {
      asteroids.forEach((a) => {
        const dx = ship.x - a.x;
        const dy = ship.y - a.y;
        if (dx * dx + dy * dy < (a.radius + 10) ** 2) {
          lives -= 1;
          ship.invuln = 2;
          ship.x = view.baseWidth / 2;
          ship.y = view.baseHeight / 2;
          ship.vx = 0;
          ship.vy = 0;
          try {
            dieAudio.currentTime = 0;
            dieAudio.play();
          } catch {
            // ignore autoplay restrictions
          }
          if (lives <= 0) {
            ship.alive = false;
            try {
              gameOverAudio.currentTime = 0;
              gameOverAudio.play();
            } catch {
              // ignore autoplay restrictions
            }
          }
        }
      });
    }

    if (asteroids.length === 0) {
      if (!stateLeveling) {
        stateLeveling = true;
        level += 1;
        for (let i = 0; i < 3 + level; i += 1) spawnAsteroid();
        try {
          levelAudio.currentTime = 0;
          levelAudio.play();
        } catch {
          // ignore autoplay restrictions
        }
      }
    } else {
      stateLeveling = false;
    }
    updateStatus();
  };

  const draw = () => {
    clear();
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0, 0, view.baseWidth, view.baseHeight);
    ctx.strokeStyle = "#7bd5ff";
    ctx.lineWidth = 1.5;

    asteroids.forEach((a) => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        const r = a.radius * (a.points?.[i] ?? 0.85);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });

    bullets.forEach((b) => {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    if (ship.alive) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      ctx.strokeStyle = ship.invuln > 0 ? "rgba(123,213,255,0.6)" : "#e6edf6";
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = "#e6edf6";
      ctx.font = "24px 'Avenir Next', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", view.baseWidth / 2, view.baseHeight / 2);
    }
  };

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "w") thrust = true;
    if (key === "arrowleft" || key === "a") turnLeft = true;
    if (key === "arrowright" || key === "d") turnRight = true;
    if (key === " " && ship.alive) fireBullet(performance.now());
    if (key === "r") reset();
  }, { signal });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "w") thrust = false;
    if (key === "arrowleft" || key === "a") turnLeft = false;
    if (key === "arrowright" || key === "d") turnRight = false;
  }, { signal });

  resetButton.addEventListener("click", reset, { signal });

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

  reset();

  return {
    title: "Asteroids",
    width: 620,
    height: 520,
    content: wrapper,
  };
}
