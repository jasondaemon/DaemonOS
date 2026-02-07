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

  let player = { x: view.baseWidth / 2, y: view.baseHeight - 40, width: 36, height: 14 };
  let bullets = [];
  let enemyBullets = [];
  let invaders = [];
  let shields = [];
  let direction = 1;
  let speed = 30;
  let drop = 18;
  let level = 1;
  let score = 0;
  let alive = true;
  let lives = 3;
  let respawnTimer = 0;
  let particles = [];
  let moveLeft = false;
  let moveRight = false;
  let fireCooldown = 0;
  const pewAudio = new Audio("/apps/games/spaceinvaders/pew.mp3");
  pewAudio.preload = "auto";
  pewAudio.volume = 0.6;

  const createInvaders = () => {
    invaders = [];
    const rows = 5;
    const cols = 11;
    const spacingX = 36;
    const spacingY = 28;
    const offsetX = 80;
    const offsetY = 50;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        invaders.push({
          x: offsetX + c * spacingX,
          y: offsetY + r * spacingY,
          row: r,
          alive: true,
        });
      }
    }
  };

  const createShields = () => {
    shields = [];
    const baseY = view.baseHeight - 110;
    const positions = [140, 280, 420];
    positions.forEach((x) => {
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          shields.push({ x: x + col * 12, y: baseY + row * 10, hp: 2 });
        }
      }
    });
  };

  const reset = () => {
    player.x = view.baseWidth / 2;
    bullets = [];
    enemyBullets = [];
    level = 1;
    score = 0;
    alive = true;
    lives = 3;
    respawnTimer = 0;
    particles = [];
    speed = 30;
    direction = 1;
    createInvaders();
    createShields();
    updateStatus();
  };

  const updateStatus = () => {
    status.textContent = alive ? `Lives ${lives} • Score ${score} • Level ${level}` : `Game Over • Score ${score}`;
  };

  const step = (dt) => {
    if (!alive) return;
    if (respawnTimer > 0) {
      respawnTimer = Math.max(0, respawnTimer - dt);
    }
    if (moveLeft) player.x = Math.max(20, player.x - 220 * dt);
    if (moveRight) player.x = Math.min(view.baseWidth - 20, player.x + 220 * dt);
    fireCooldown = Math.max(0, fireCooldown - dt);
    const aliveInvaders = invaders.filter((i) => i.alive);
    const minX = Math.min(...aliveInvaders.map((i) => i.x), Infinity);
    const maxX = Math.max(...aliveInvaders.map((i) => i.x), -Infinity);
    if (aliveInvaders.length && (minX <= 40 || maxX >= view.baseWidth - 40)) {
      direction *= -1;
      invaders.forEach((i) => {
        if (i.alive) i.y += drop;
      });
    }
    invaders.forEach((i) => {
      if (i.alive) i.x += direction * speed * dt;
      if (i.y > player.y - 20) alive = false;
    });

    bullets.forEach((b) => {
      b.y -= 240 * dt;
    });
    bullets = bullets.filter((b) => b.y > -20);

    enemyBullets.forEach((b) => {
      b.y += 180 * dt;
    });
    enemyBullets = enemyBullets.filter((b) => b.y < view.baseHeight + 20);

    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });

    bullets.forEach((b) => {
      invaders.forEach((i) => {
        if (!i.alive) return;
        if (Math.abs(b.x - i.x) < 14 && Math.abs(b.y - i.y) < 12) {
          i.alive = false;
          b.hit = true;
          score += 10 + (4 - i.row) * 2;
        }
      });
    });
    bullets = bullets.filter((b) => !b.hit);

    bullets.forEach((b) => {
      shields.forEach((s) => {
        if (s.hp <= 0) return;
        if (b.x > s.x && b.x < s.x + 10 && b.y > s.y && b.y < s.y + 8) {
          s.hp -= 1;
          b.hit = true;
        }
      });
    });
    bullets = bullets.filter((b) => !b.hit);

    enemyBullets.forEach((b) => {
      shields.forEach((s) => {
        if (s.hp <= 0) return;
        if (b.x > s.x && b.x < s.x + 10 && b.y > s.y && b.y < s.y + 8) {
          s.hp -= 1;
          b.hit = true;
        }
      });
    });
    enemyBullets = enemyBullets.filter((b) => !b.hit);

    enemyBullets.forEach((b) => {
      if (
        respawnTimer <= 0 &&
        b.x > player.x - player.width / 2 &&
        b.x < player.x + player.width / 2 &&
        b.y > player.y - player.height / 2 &&
        b.y < player.y + player.height / 2
      ) {
        respawnTimer = 1.2;
        lives -= 1;
        spawnExplosion(player.x, player.y);
        if (lives <= 0) {
          alive = false;
        } else {
          player.x = view.baseWidth / 2;
        }
      }
    });

    if (invaders.every((i) => !i.alive)) {
      level += 1;
      speed += 10;
      direction = 1;
      createInvaders();
      createShields();
    }

    // Enemy firing
    if (Math.random() < 0.015 + level * 0.003) {
      const shooters = invaders.filter((i) => i.alive);
      if (shooters.length) {
        const shooter = shooters[Math.floor(Math.random() * shooters.length)];
        enemyBullets.push({ x: shooter.x, y: shooter.y });
      }
    }

    updateStatus();
  };

  const spawnExplosion = (x, y) => {
    for (let i = 0; i < 24; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
      });
    }
  };

  const draw = () => {
    clear();
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0, 0, view.baseWidth, view.baseHeight);
    ctx.fillStyle = "#6ef0c4";
    invaders.forEach((i) => {
      if (!i.alive) return;
      ctx.fillRect(i.x - 12, i.y - 8, 24, 16);
      ctx.fillStyle = "#0b0f14";
      ctx.fillRect(i.x - 6, i.y - 4, 4, 4);
      ctx.fillRect(i.x + 2, i.y - 4, 4, 4);
      ctx.fillStyle = "#6ef0c4";
    });

    if (alive) {
      ctx.fillStyle = respawnTimer > 0 ? "rgba(123,213,255,0.4)" : "#7bd5ff";
      ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
      ctx.fillRect(player.x - 4, player.y - player.height / 2 - 6, 8, 6);
    }

    shields.forEach((s) => {
      if (s.hp <= 0) return;
      ctx.fillStyle = s.hp === 2 ? "rgba(123,213,255,0.7)" : "rgba(123,213,255,0.35)";
      ctx.fillRect(s.x, s.y, 10, 8);
    });

    ctx.fillStyle = "#ffd166";
    bullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 6, 4, 12));
    ctx.fillStyle = "#ff6f91";
    enemyBullets.forEach((b) => ctx.fillRect(b.x - 2, b.y - 4, 4, 8));

    particles.forEach((p) => {
      ctx.fillStyle = "rgba(255, 214, 102, 0.8)";
      ctx.fillRect(p.x, p.y, 2, 2);
    });

    if (!alive) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, view.baseWidth, view.baseHeight);
      ctx.fillStyle = "#e6edf6";
      ctx.font = "24px 'Avenir Next', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", view.baseWidth / 2, view.baseHeight / 2);
      ctx.font = "14px 'Avenir Next', sans-serif";
      ctx.fillText("Press R to restart", view.baseWidth / 2, view.baseHeight / 2 + 20);
    }
  };

  document.addEventListener("keydown", (event) => {
    if (!alive && event.key.toLowerCase() === "r") reset();
    if (event.key === "ArrowLeft") moveLeft = true;
    if (event.key === "ArrowRight") moveRight = true;
    if (event.key === " " && fireCooldown <= 0 && alive) {
      bullets.push({ x: player.x, y: player.y - 10 });
      fireCooldown = 0.35;
      try {
        pewAudio.currentTime = 0;
        pewAudio.play();
      } catch {
        // ignore autoplay restrictions
      }
    }
  }, { signal });

  document.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft") moveLeft = false;
    if (event.key === "ArrowRight") moveRight = false;
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
    title: "Space Invaders",
    width: 620,
    height: 520,
    content: wrapper,
  };
}
